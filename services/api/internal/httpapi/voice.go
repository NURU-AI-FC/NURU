package httpapi

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"strings"
)

// Voice: ElevenLabs reads English in a Nigerian voice, with Azure Speech as
// the backup. Spitch reads Yorùbá, Igbo and Hausa and transcribes all four
// languages, with ElevenLabs Scribe as the backup. Keys come from
// ELEVENLABS_API_KEY, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and SPITCH_API_KEY.
// Without them the app falls back to the phone's own speech.

const (
	spitchURL = "https://api.spitch.app/v1"
	elevenURL = "https://api.elevenlabs.io/v1"
)

// Nigerian English voices from the ElevenLabs library (Nana and Uyi), unless
// ELEVENLABS_VOICE_FEMALE or ELEVENLABS_VOICE_MALE pick others.
var elevenVoices = map[string]string{"female": "QQswKXAu7aQVNxKFmOP8", "male": "NwBN5lRnglDs8TBVmser"}

func elevenVoice(gender string) string {
	if v := os.Getenv("ELEVENLABS_VOICE_" + strings.ToUpper(gender)); v != "" {
		return v
	}
	return elevenVoices[gender]
}

var azureVoices = map[string]string{"female": "en-NG-EzinneNeural", "male": "en-NG-AbeoNeural"}

var spitchVoices = map[string]map[string]string{
	"yo": {"female": "sade", "male": "segun"},
	"ig": {"female": "ngozi", "male": "obinna"},
	"ha": {"female": "amina", "male": "aliyu"},
	"en": {"female": "lucy", "male": "john"},
}

func azureReady() bool {
	return os.Getenv("AZURE_SPEECH_KEY") != "" && os.Getenv("AZURE_SPEECH_REGION") != ""
}
func spitchReady() bool { return os.Getenv("SPITCH_API_KEY") != "" }
func elevenReady() bool { return os.Getenv("ELEVENLABS_API_KEY") != "" }

// The app reads "spitch" as "voice typing works" and "azure" as "English
// voice works", so ElevenLabs switches both on.
func (s *Server) voiceStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]bool{"azure": azureReady() || elevenReady(), "spitch": spitchReady() || elevenReady(), "elevenlabs": elevenReady()})
}

// speak returns MP3 audio for a short piece of text.
func (s *Server) speak(w http.ResponseWriter, r *http.Request) {
	var in struct{ Text, Lang, Gender string }
	if !decode(w, r, &in) {
		return
	}
	in.Text = strings.TrimSpace(strings.NewReplacer("₦", "naira ", "*", "", "#", "").Replace(in.Text))
	if in.Text == "" {
		fail(w, 400, "nothing to read")
		return
	}
	if r := []rune(in.Text); len(r) > 1200 {
		in.Text = string(r[:1200])
	}
	if in.Gender != "male" {
		in.Gender = "female"
	}
	// Try each voice that can read this language, best first.
	type voice func() ([]byte, error)
	var tries []voice
	if in.Lang == "en" && elevenReady() {
		tries = append(tries, func() ([]byte, error) { return s.elevenSpeak(r, in.Text, elevenVoice(in.Gender)) })
	}
	if in.Lang == "en" && azureReady() {
		tries = append(tries, func() ([]byte, error) { return s.azureSpeak(r, in.Text, azureVoices[in.Gender]) })
	}
	if spitchReady() && spitchVoices[in.Lang] != nil {
		tries = append(tries, func() ([]byte, error) {
			return s.spitchSpeak(r, in.Text, in.Lang, spitchVoices[in.Lang][in.Gender])
		})
	}
	if len(tries) == 0 {
		fail(w, 503, "voice service not configured")
		return
	}
	var audio []byte
	var err error
	for _, try := range tries {
		if audio, err = try(); err == nil {
			break
		}
		log.Printf("speak %s: %v", in.Lang, err)
	}
	if err != nil {
		fail(w, 502, "voice service is busy, try again")
		return
	}
	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "no-store")
	w.Write(audio)
}

func (s *Server) azureSpeak(r *http.Request, text, voice string) ([]byte, error) {
	ssml := fmt.Sprintf(`<speak version="1.0" xml:lang="en-NG"><voice name="%s">%s</voice></speak>`, voice, html.EscapeString(text))
	url := fmt.Sprintf("https://%s.tts.speech.microsoft.com/cognitiveservices/v1", os.Getenv("AZURE_SPEECH_REGION"))
	req, _ := http.NewRequestWithContext(r.Context(), "POST", url, strings.NewReader(ssml))
	req.Header.Set("Ocp-Apim-Subscription-Key", os.Getenv("AZURE_SPEECH_KEY"))
	req.Header.Set("Content-Type", "application/ssml+xml")
	req.Header.Set("X-Microsoft-OutputFormat", "audio-24khz-48kbitrate-mono-mp3")
	req.Header.Set("User-Agent", "nuru")
	return s.audio(req)
}

func (s *Server) elevenSpeak(r *http.Request, text, voice string) ([]byte, error) {
	body, _ := json.Marshal(map[string]any{"text": text, "model_id": "eleven_multilingual_v2", "language_code": "en"})
	req, _ := http.NewRequestWithContext(r.Context(), "POST", elevenURL+"/text-to-speech/"+voice+"?output_format=mp3_44100_128", bytes.NewReader(body))
	req.Header.Set("xi-api-key", os.Getenv("ELEVENLABS_API_KEY"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg")
	return s.audio(req)
}

func (s *Server) spitchSpeak(r *http.Request, text, lang, voice string) ([]byte, error) {
	body, _ := json.Marshal(map[string]string{"text": text, "language": lang, "voice": voice, "format": "mp3"})
	req, _ := http.NewRequestWithContext(r.Context(), "POST", spitchURL+"/speech", bytes.NewReader(body))
	req.Header.Set("Authorization", "Bearer "+os.Getenv("SPITCH_API_KEY"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "audio/mpeg")
	return s.audio(req)
}

func (s *Server) audio(req *http.Request) ([]byte, error) {
	res, err := s.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	b, err := io.ReadAll(io.LimitReader(res.Body, 8<<20))
	if err != nil {
		return nil, err
	}
	if res.StatusCode != 200 {
		return nil, fmt.Errorf("%s: %d %s", req.URL.Host, res.StatusCode, bytes.TrimSpace(b[:min(len(b), 200)]))
	}
	return b, nil
}

// listen turns a short recording into text with Spitch, or ElevenLabs Scribe
// when Spitch is missing or fails.
func (s *Server) listen(w http.ResponseWriter, r *http.Request) {
	if !spitchReady() && !elevenReady() {
		fail(w, 503, "voice service not configured")
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		fail(w, 400, "recording is too large")
		return
	}
	f, hdr, err := r.FormFile("audio")
	if err != nil {
		fail(w, 400, "no recording")
		return
	}
	defer f.Close()
	rec, err := io.ReadAll(f)
	if err != nil {
		fail(w, 400, "no recording")
		return
	}
	lang := r.FormValue("lang")
	if spitchVoices[lang] == nil {
		lang = "en"
	}
	var text string
	err = fmt.Errorf("no transcriber")
	if spitchReady() {
		if text, err = s.transcribe(r, spitchURL+"/transcriptions", "Authorization", "Bearer "+os.Getenv("SPITCH_API_KEY"),
			map[string]string{"language": lang}, "content", hdr.Filename, rec); err != nil {
			log.Printf("listen spitch %s: %v", lang, err)
		}
	}
	if err != nil && elevenReady() {
		if text, err = s.transcribe(r, elevenURL+"/speech-to-text", "xi-api-key", os.Getenv("ELEVENLABS_API_KEY"),
			map[string]string{"model_id": "scribe_v1", "language_code": lang}, "file", hdr.Filename, rec); err != nil {
			log.Printf("listen elevenlabs %s: %v", lang, err)
		}
	}
	if err != nil {
		fail(w, 502, "could not hear that, try again")
		return
	}
	writeJSON(w, 200, map[string]string{"text": text})
}

// transcribe posts a recording as multipart form data and reads back {"text": ...}.
func (s *Server) transcribe(r *http.Request, url, authHeader, auth string, fields map[string]string, fileField, name string, rec []byte) (string, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for k, v := range fields {
		mw.WriteField(k, v)
	}
	part, _ := mw.CreateFormFile(fileField, name)
	part.Write(rec)
	mw.Close()
	req, _ := http.NewRequestWithContext(r.Context(), "POST", url, &buf)
	req.Header.Set(authHeader, auth)
	req.Header.Set("Content-Type", mw.FormDataContentType())
	b, err := s.audio(req)
	if err != nil {
		return "", err
	}
	var out struct{ Text string }
	json.Unmarshal(b, &out)
	return strings.TrimSpace(out.Text), nil
}
