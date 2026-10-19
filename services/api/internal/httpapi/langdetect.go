package httpapi

import (
	"strings"
	"unicode"
)

// Letters only Yorùbá, Igbo or Hausa use. One is enough to tell the language.
var langLetters = map[string]string{
	"yo": "ẹọṣẸỌṢ",
	"ig": "ịụṅỊỤṄ",
	"ha": "ɗƙɓƊƘƁ",
}

// Common words that are distinctive to each language, without tone marks.
var langWords = map[string][]string{
	"yo": {"bawo", "kini", "jowo", "owo", "melo", "elo", "eelo", "mo", "fe", "se", "nko", "eku", "kaaro", "kaasan", "ese", "omo", "nibo", "lowo", "fun", "mi", "ni"},
	"ig": {"kedu", "biko", "gini", "ego", "ole", "daalu", "nna", "nne", "achoro", "chere", "maka", "anyi", "unu", "nke", "ihe", "ka", "m"},
	"ha": {"yaya", "nawa", "kudi", "allah", "sannu", "nagode", "yasa", "zan", "ina", "kake", "kina", "nake", "wannan", "akwai", "babu", "don", "ne", "ce"},
}

// Words shared by more than one language, or too short to count alone.
var langWeak = map[string]bool{"mi": true, "ni": true, "ka": true, "m": true, "ne": true, "ce": true, "don": true, "ina": true, "fun": true, "mo": true, "se": true}

// detectLang guesses the language a message is written in, so NURU answers
// and speaks in that language even if the app is set to another. It returns
// fallback unless the message clearly reads as Yorùbá, Igbo or Hausa.
func detectLang(msg, fallback string) string {
	for lang, letters := range langLetters {
		if strings.ContainsAny(msg, letters) {
			return lang
		}
	}
	words := strings.FieldsFunc(strings.ToLower(stripTones(msg)), func(r rune) bool { return !unicode.IsLetter(r) })
	score := map[string]float64{}
	for _, w := range words {
		for lang, list := range langWords {
			for _, x := range list {
				if w == x {
					if langWeak[x] {
						score[lang] += 0.5
					} else {
						score[lang]++
					}
				}
			}
		}
	}
	best, top, tie := "", 0.0, false
	for lang, n := range score {
		switch {
		case n > top:
			best, top, tie = lang, n, false
		case n == top:
			tie = true
		}
	}
	// English questions are usually longer, so ask for more evidence there.
	need := 1.0
	if len(words) > 4 {
		need = 2
	}
	if best == "" || tie || top < need {
		return fallback
	}
	return best
}

// stripTones removes tone marks so "báwo" matches "bawo".
func stripTones(s string) string {
	var b strings.Builder
	for _, r := range s {
		if unicode.Is(unicode.Mn, r) {
			continue
		}
		if base, ok := toneBase[r]; ok {
			r = base
		}
		b.WriteRune(r)
	}
	return b.String()
}

var toneBase = map[rune]rune{
	'á': 'a', 'à': 'a', 'é': 'e', 'è': 'e', 'í': 'i', 'ì': 'i', 'ó': 'o', 'ò': 'o', 'ú': 'u', 'ù': 'u',
	'Á': 'A', 'À': 'A', 'É': 'E', 'È': 'E', 'Í': 'I', 'Ì': 'I', 'Ó': 'O', 'Ò': 'O', 'Ú': 'U', 'Ù': 'U',
}
