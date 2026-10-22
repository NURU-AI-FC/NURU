package httpapi

import (
	"encoding/json"
	"math"
	"net/http"
	"time"

	"github.com/NURU-AI-FC/nuru/services/api/internal/auth"
)

// Face templates are 128 number descriptors computed in the browser by
// face-api. Only the descriptor is kept, never a photo, and it is encrypted
// with the user's key like their chats.
const faceMatch = 0.5 // euclidean distance; lower is stricter

func validFace(d []float64) bool {
	if len(d) != 128 {
		return false
	}
	for _, v := range d {
		if math.IsNaN(v) || math.IsInf(v, 0) || math.Abs(v) > 2 {
			return false
		}
	}
	return true
}

func (s *Server) enrolFace(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Descriptor []float64
		PIN        string `json:"pin"`
	}
	if !decode(w, r, &in) {
		return
	}
	if !validFace(in.Descriptor) {
		fail(w, 400, "we could not read a face, try again in good light")
		return
	}
	// Replacing a face that is already enrolled needs the transaction PIN, so
	// someone holding an unlocked phone cannot swap in their own face. Wrong
	// PINs count towards the same 30 minute pause as transfers.
	var pinHash string
	var enrolled bool
	var locked *time.Time
	var fails int
	s.db.QueryRow(r.Context(), `select pin_hash, face_template is not null, transfer_locked_until, transfer_fails from users where id=$1`, uid(r)).Scan(&pinHash, &enrolled, &locked, &fails)
	if enrolled {
		if locked != nil && locked.After(time.Now()) {
			fail(w, 423, "transfers are paused until "+locked.Format("3:04 pm")+" after 3 failed checks")
			return
		}
		if pinHash == "" {
			fail(w, 428, "set your transaction PIN first, then you can replace your face check")
			return
		}
		if in.PIN == "" {
			fail(w, 428, "enter your transaction PIN to replace your face check")
			return
		}
		if ok, _ := auth.Verify(in.PIN, pinHash); !ok || pinHash == "" {
			s.checkFailed(w, r, fails, "pin_failed", "wrong PIN", "face_reset")
			return
		}
		s.db.Exec(r.Context(), `update users set transfer_fails=0 where id=$1`, uid(r))
	}
	raw, _ := json.Marshal(in.Descriptor)
	nonce, ct, err := s.box.Seal(uid(r)+":face", string(raw))
	if err != nil {
		fail(w, 500, "could not save your face check")
		return
	}
	s.db.Exec(r.Context(), `update users set face_nonce=$1, face_template=$2, face_enrolled_at=now() where id=$3`, nonce, ct, uid(r))
	s.event(r.Context(), uid(r), "face_enrolled", "")
	writeJSON(w, 200, map[string]any{"enrolled": true})
}

// matchFace compares a fresh descriptor with the enrolled one.
func (s *Server) matchFace(r *http.Request, d []float64) (bool, float64) {
	var nonce, ct []byte
	if err := s.db.QueryRow(r.Context(), `select face_nonce, face_template from users where id=$1`, uid(r)).Scan(&nonce, &ct); err != nil || ct == nil || !validFace(d) {
		return false, 9
	}
	txt, err := s.box.Open(uid(r)+":face", nonce, ct)
	if err != nil {
		return false, 9
	}
	var saved []float64
	if json.Unmarshal([]byte(txt), &saved) != nil || len(saved) != len(d) {
		return false, 9
	}
	sum := 0.0
	for i := range d {
		sum += (d[i] - saved[i]) * (d[i] - saved[i])
	}
	dist := math.Sqrt(sum)
	return dist < faceMatch, dist
}

// security reports what a transfer will need, so the app can walk a new
// user through creating a PIN and enrolling their face first.
func (s *Server) security(w http.ResponseWriter, r *http.Request) {
	var hasPIN, hasFace bool
	var locked *time.Time
	var fails int
	s.db.QueryRow(r.Context(), `select pin_hash<>'', face_template is not null, transfer_locked_until, transfer_fails from users where id=$1`, uid(r)).Scan(&hasPIN, &hasFace, &locked, &fails)
	out := map[string]any{"has_pin": hasPIN, "face_enrolled": hasFace, "tries_left": max(0, 3-fails)}
	if locked != nil && locked.After(time.Now()) {
		out["locked_until"] = locked
	}
	writeJSON(w, 200, out)
}

func (s *Server) payees(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select p.id,p.name,p.bank,p.account,p.tag,p.starred,
		(select count(*) from transactions t where t.user_id=p.user_id and t.direction='debit' and t.merchant=p.name||', '||p.bank)
		from payees p where p.user_id=$1 order by p.starred desc, p.name`, uid(r))
	if err != nil {
		fail(w, 500, "could not load payees")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, n, b, a, tag string
		var star bool
		var times int
		rows.Scan(&id, &n, &b, &a, &tag, &star, &times)
		out = append(out, map[string]any{"id": id, "name": n, "bank": b, "account": "•••• " + a[len(a)-4:], "tag": tag, "starred": star, "times": times})
	}
	writeJSON(w, 200, out)
}
