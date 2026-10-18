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

// Voice: Azure Speech reads English in a Nigerian voice, Spitch reads
// Yorùbá, Igbo and Hausa and transcribes all four languages. Keys come from
// AZURE_SPEECH_KEY, AZURE_SPEECH_REGION and SPITCH_API_KEY. Without them the
// app falls back to the phone's own speech.

const spitchURL = "https://api.spitch.app/v1"

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

func (s *Server) voiceStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]bool{"azure": azureReady(), "spitch": spitchReady()})
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
	var audio []byte
	var err error
	switch {
	case in.Lang == "en" && azureReady():
		audio, err = s.azureSpeak(r, in.Text, azureVoices[in.Gender])
	case spitchReady() && spitchVoices[in.Lang] != nil:
		audio, err = s.spitchSpeak(r, in.Text, in.Lang, spitchVoices[in.Lang][in.Gender])
	default:
		fail(w, 503, "voice service not configured")
		return
	}
	if err != nil {
		log.Printf("speak %s: %v", in.Lang, err)
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

// listen turns a short recording into text with Spitch.
func (s *Server) listen(w http.ResponseWriter, r *http.Request) {
	if !spitchReady() {
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
	lang := r.FormValue("lang")
	if spitchVoices[lang] == nil {
		lang = "en"
	}
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	mw.WriteField("language", lang)
	part, _ := mw.CreateFormFile("content", hdr.Filename)
	io.Copy(part, f)
	mw.Close()
	req, _ := http.NewRequestWithContext(r.Context(), "POST", spitchURL+"/transcriptions", &buf)
	req.Header.Set("Authorization", "Bearer "+os.Getenv("SPITCH_API_KEY"))
	req.Header.Set("Content-Type", mw.FormDataContentType())
	b, err := s.audio(req)
	if err != nil {
		log.Printf("listen %s: %v", lang, err)
		fail(w, 502, "could not hear that, try again")
		return
	}
	var out struct{ Text string }
	json.Unmarshal(b, &out)
	writeJSON(w, 200, map[string]string{"text": strings.TrimSpace(out.Text)})
}
