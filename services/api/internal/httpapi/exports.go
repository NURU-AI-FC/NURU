package httpapi

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
)

// Console exports are masked CSVs built on the server, so every export is
// logged and expires: after 7 days it can no longer be downloaded and the
// stored copy is deleted.

func segmentCSV(rows []map[string]any) string {
	var b strings.Builder
	w := csv.NewWriter(&b)
	w.Write([]string{"Segment", "Customers", "Reachable for offers", "Average income", "Spend ratio %", "Saving rate %", "Suggested product", "Likely uptake %"})
	for _, r := range rows {
		w.Write([]string{fmt.Sprint(r["name"]), fmt.Sprint(r["customers"]), fmt.Sprint(r["reachable"]), fmt.Sprint(r["avg_income"]),
			fmt.Sprint(r["spend_ratio"]), fmt.Sprint(r["saving_rate"]), fmt.Sprint(r["product"]), fmt.Sprint(r["uptake"])})
	}
	w.Flush()
	return b.String()
}

func (s *Server) consoleExport(w http.ResponseWriter, r *http.Request) {
	var in struct{ Kind, Src string }
	if !decode(w, r, &in) {
		return
	}
	if in.Kind != "segments" {
		fail(w, 400, "only segment exports are available")
		return
	}
	src := []string{"live", "pilot"}
	if in.Src == "live" {
		src = []string{"live"}
	}
	s.syncLive(r.Context())
	rows, _ := visibleSegments(s.segmentRows(r.Context(), src))
	body := segmentCSV(rows)
	s.db.Exec(r.Context(), `delete from console_exports where expires_at<now()`)
	var id string
	var exp time.Time
	if err := s.db.QueryRow(r.Context(), `insert into console_exports(staff_id,kind,rows,body) values($1,$2,$3,$4) returning id, expires_at`,
		uid(r), in.Kind, len(rows), body).Scan(&id, &exp); err != nil {
		fail(w, 500, "could not make the export")
		return
	}
	s.audit(r.Context(), "console", uid(r), "exported", fmt.Sprintf("segments, %d rows", len(rows)))
	writeJSON(w, 201, map[string]any{"id": id, "expires_at": exp, "rows": len(rows), "csv": body, "filename": "nuru-segments.csv"})
}

// consoleExports lists the signed in person's exports from the last 30 days.
func (s *Server) consoleExports(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `select id, kind, rows, created_at, expires_at, expires_at<now() from console_exports
		where staff_id=$1 order by created_at desc limit 20`, uid(r))
	if err != nil {
		fail(w, 500, "could not load exports")
		return
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, kind string
		var n int
		var at, exp time.Time
		var expired bool
		rows.Scan(&id, &kind, &n, &at, &exp, &expired)
		out = append(out, map[string]any{"id": id, "kind": kind, "rows": n, "created_at": at, "expires_at": exp, "expired": expired})
	}
	writeJSON(w, 200, out)
}

func (s *Server) consoleExportFile(w http.ResponseWriter, r *http.Request) {
	var body string
	var expired bool
	err := s.db.QueryRow(r.Context(), `select body, expires_at<now() from console_exports where id::text=$1 and staff_id=$2`, chi.URLParam(r, "id"), uid(r)).Scan(&body, &expired)
	if err != nil {
		fail(w, 404, "export not found")
		return
	}
	if expired {
		fail(w, 410, "this export expired after 7 days, make a new one")
		return
	}
	s.audit(r.Context(), "console", uid(r), "export_downloaded", "segments")
	writeJSON(w, 200, map[string]any{"csv": body, "filename": "nuru-segments.csv"})
}
