// Command dbcopy copies NURU's data from one Postgres to another, for the
// move from Railway Postgres to Supabase.
//
//	DATABASE_URL=<railway url> SUPABASE_DB_URL=<supabase url> go run ./cmd/dbcopy
//
// It runs the API's migrations on the target, then, in one transaction on
// the target, empties every table it is about to fill and copies each one
// from a single consistent snapshot of the source, parents before children
// so foreign keys hold. Sequences are moved along with the rows. Running it
// again gives the same result. It ends by counting rows on both sides and
// exits non-zero if any table differs. The source is only read.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"slices"
	"sort"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/NURU-AI-FC/nuru/services/api/internal/db"
)

func main() {
	overwrite := flag.Bool("overwrite", false, "replace data already in the target (it has users)")
	dry := flag.Bool("dry-run", false, "run migrations on the target and show the plan, copy nothing")
	flag.Parse()
	log.SetFlags(0)

	srcURL, dstURL := os.Getenv("DATABASE_URL"), os.Getenv("SUPABASE_DB_URL")
	if srcURL == "" || dstURL == "" {
		log.Fatal("set DATABASE_URL (copy from) and SUPABASE_DB_URL (copy to)")
	}
	if srcURL == dstURL {
		log.Fatal("DATABASE_URL and SUPABASE_DB_URL are the same database")
	}
	ctx := context.Background()
	if err := run(ctx, srcURL, dstURL, *overwrite, *dry); err != nil {
		log.Fatal("dbcopy: ", err)
	}
}

type table struct {
	name string
	cols []string
}

func run(ctx context.Context, srcURL, dstURL string, overwrite, dry bool) error {
	dstPool, err := db.Connect(ctx, dstURL)
	if err != nil {
		return fmt.Errorf("target: %w", err)
	}
	defer dstPool.Close()
	log.Println("running migrations on the target")
	if err := db.Migrate(ctx, dstPool); err != nil {
		return fmt.Errorf("target migrations: %w", err)
	}

	src, err := pgx.Connect(ctx, srcURL)
	if err != nil {
		return fmt.Errorf("source: %w", err)
	}
	defer src.Close(ctx)
	// one snapshot for every table and for the final counts
	stx, err := src.BeginTx(ctx, pgx.TxOptions{IsoLevel: pgx.RepeatableRead, AccessMode: pgx.ReadOnly})
	if err != nil {
		return err
	}
	defer stx.Rollback(ctx)

	dconn, err := dstPool.Acquire(ctx)
	if err != nil {
		return err
	}
	defer dconn.Release()
	dst := dconn.Conn()

	tables, skipped, err := plan(ctx, stx.Conn(), dst)
	if err != nil {
		return err
	}
	for _, s := range skipped {
		log.Printf("skipping %s: %s", s[0], s[1])
	}
	names := make([]string, len(tables))
	for i, t := range tables {
		names[i] = t.name
	}
	log.Printf("copy order: %s", strings.Join(names, ", "))
	if len(tables) == 0 {
		return errors.New("no tables to copy")
	}

	// Migrations seed a few reference rows (campaigns, for one), so only
	// customer accounts count as data worth protecting.
	if !overwrite && slices.ContainsFunc(tables, func(t table) bool { return t.name == "users" }) {
		var has bool
		if err := dst.QueryRow(ctx, "select exists(select 1 from users)").Scan(&has); err != nil {
			return err
		}
		if has {
			return errors.New("the target already has users; run again with -overwrite to replace its data with the source's")
		}
	}
	if dry {
		log.Println("dry run: nothing copied")
		return nil
	}

	start := time.Now()
	dtx, err := dst.Begin(ctx)
	if err != nil {
		return err
	}
	defer dtx.Rollback(ctx)
	quoted := make([]string, len(tables))
	for i, t := range tables {
		quoted[i] = ident(t.name)
	}
	if _, err := dtx.Exec(ctx, "truncate "+strings.Join(quoted, ", ")); err != nil {
		return fmt.Errorf("empty target tables: %w", err)
	}
	for _, t := range tables {
		n, err := copyTable(ctx, stx.Conn(), dtx.Conn(), t)
		if err != nil {
			return fmt.Errorf("copy %s: %w", t.name, err)
		}
		log.Printf("  %-28s %8d rows", t.name, n)
	}
	if err := copySequences(ctx, stx.Conn(), dtx); err != nil {
		return err
	}
	if err := dtx.Commit(ctx); err != nil {
		return err
	}
	log.Printf("copied %d tables in %s", len(tables), time.Since(start).Round(time.Millisecond))
	return verify(ctx, stx.Conn(), dst, tables)
}

// plan lists the tables both databases have, with the columns they share,
// ordered so every table comes after the tables its foreign keys point to.
func plan(ctx context.Context, src, dst *pgx.Conn) ([]table, [][2]string, error) {
	srcCols, err := columns(ctx, src)
	if err != nil {
		return nil, nil, fmt.Errorf("read source tables: %w", err)
	}
	dstCols, err := columns(ctx, dst)
	if err != nil {
		return nil, nil, fmt.Errorf("read target tables: %w", err)
	}
	var skipped [][2]string
	byName := map[string]table{}
	for name, cols := range srcCols {
		dc, ok := dstCols[name]
		if !ok {
			skipped = append(skipped, [2]string{name, "not in the target schema"})
			continue
		}
		t := table{name: name}
		for _, c := range dc { // target's column order
			if slices.Contains(cols, c) {
				t.cols = append(t.cols, c)
			}
		}
		for _, c := range cols {
			if !slices.Contains(dc, c) {
				skipped = append(skipped, [2]string{name + "." + c, "column not in the target schema"})
			}
		}
		byName[name] = t
	}
	for name := range dstCols {
		if _, ok := srcCols[name]; !ok {
			skipped = append(skipped, [2]string{name, "only in the target, left as it is"})
		}
	}
	sort.Slice(skipped, func(i, j int) bool { return skipped[i][0] < skipped[j][0] })

	rows, err := dst.Query(ctx, `select ch.relname, pa.relname
		from pg_constraint c join pg_namespace n on n.oid=c.connamespace
		join pg_class ch on ch.oid=c.conrelid join pg_class pa on pa.oid=c.confrelid
		where c.contype='f' and n.nspname='public'`)
	if err != nil {
		return nil, nil, err
	}
	parents := map[string][]string{}
	for rows.Next() {
		var child, parent string
		if err := rows.Scan(&child, &parent); err != nil {
			return nil, nil, err
		}
		if child != parent {
			parents[child] = append(parents[child], parent)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	order, err := topo(byName, parents)
	if err != nil {
		return nil, nil, err
	}
	out := make([]table, len(order))
	for i, n := range order {
		out[i] = byName[n]
	}
	return out, skipped, nil
}

// topo orders names so parents come first; ties go alphabetically so the
// order is the same on every run.
func topo(tables map[string]table, parents map[string][]string) ([]string, error) {
	done := map[string]bool{}
	var order []string
	for len(order) < len(tables) {
		var ready []string
		for n := range tables {
			if done[n] {
				continue
			}
			ok := true
			for _, p := range parents[n] {
				if _, copied := tables[p]; copied && !done[p] {
					ok = false
					break
				}
			}
			if ok {
				ready = append(ready, n)
			}
		}
		if len(ready) == 0 {
			var left []string
			for n := range tables {
				if !done[n] {
					left = append(left, n)
				}
			}
			sort.Strings(left)
			return nil, fmt.Errorf("foreign keys form a cycle between: %s", strings.Join(left, ", "))
		}
		sort.Strings(ready)
		for _, n := range ready {
			done[n] = true
		}
		order = append(order, ready...)
	}
	return order, nil
}

// columns maps each ordinary table in public to its copyable columns.
func columns(ctx context.Context, c *pgx.Conn) (map[string][]string, error) {
	rows, err := c.Query(ctx, `select cl.relname, a.attname
		from pg_class cl join pg_namespace n on n.oid=cl.relnamespace
		join pg_attribute a on a.attrelid=cl.oid
		where n.nspname='public' and cl.relkind in ('r','p') and not cl.relispartition
		  and a.attnum>0 and not a.attisdropped and a.attgenerated=''
		order by cl.relname, a.attnum`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string][]string{}
	for rows.Next() {
		var t, col string
		if err := rows.Scan(&t, &col); err != nil {
			return nil, err
		}
		out[t] = append(out[t], col)
	}
	return out, rows.Err()
}

// copyTable streams one table with COPY in text form, which carries every
// type, pgvector's included, without the tool knowing about it.
func copyTable(ctx context.Context, src, dst *pgx.Conn, t table) (int64, error) {
	cols := make([]string, len(t.cols))
	for i, c := range t.cols {
		cols[i] = ident(c)
	}
	list := strings.Join(cols, ", ")
	pr, pw := io.Pipe()
	errc := make(chan error, 1)
	go func() {
		_, err := src.PgConn().CopyTo(ctx, pw, "copy (select "+list+" from "+ident(t.name)+") to stdout")
		pw.CloseWithError(err)
		errc <- err
	}()
	tag, err := dst.PgConn().CopyFrom(ctx, pr, "copy "+ident(t.name)+" ("+list+") from stdin")
	pr.CloseWithError(err)
	if serr := <-errc; serr != nil && err == nil {
		err = serr
	}
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// copySequences sets every sequence the target shares with the source to
// the source's position, so new ids carry on after the copied ones.
func copySequences(ctx context.Context, src *pgx.Conn, dst pgx.Tx) error {
	rows, err := src.Query(ctx, `select sequencename, last_value, start_value from pg_sequences where schemaname='public'`)
	if err != nil {
		return fmt.Errorf("read source sequences: %w", err)
	}
	type seq struct {
		name  string
		last  *int64
		start int64
	}
	var seqs []seq
	for rows.Next() {
		var s seq
		if err := rows.Scan(&s.name, &s.last, &s.start); err != nil {
			return err
		}
		seqs = append(seqs, s)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for _, s := range seqs {
		var exists bool
		dst.QueryRow(ctx, `select exists(select 1 from pg_sequences where schemaname='public' and sequencename=$1)`, s.name).Scan(&exists)
		if !exists {
			log.Printf("skipping sequence %s: not in the target", s.name)
			continue
		}
		v, called := s.start, false
		if s.last != nil {
			v, called = *s.last, true
		}
		if _, err := dst.Exec(ctx, `select setval($1::regclass, $2, $3)`, ident(s.name), v, called); err != nil {
			return fmt.Errorf("sequence %s: %w", s.name, err)
		}
	}
	return nil
}

// verify counts rows on both sides, the source within the snapshot that was
// copied, and prints them side by side.
func verify(ctx context.Context, src, dst *pgx.Conn, tables []table) error {
	tw := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', tabwriter.AlignRight)
	fmt.Fprintln(tw, "table\tsource\ttarget\t\t")
	bad := 0
	for _, t := range tables {
		var a, b int64
		if err := src.QueryRow(ctx, "select count(*) from "+ident(t.name)).Scan(&a); err != nil {
			return err
		}
		if err := dst.QueryRow(ctx, "select count(*) from "+ident(t.name)).Scan(&b); err != nil {
			return err
		}
		mark := "ok"
		if a != b {
			mark = "MISMATCH"
			bad++
		}
		fmt.Fprintf(tw, "%s\t%d\t%d\t%s\t\n", t.name, a, b, mark)
	}
	tw.Flush()
	if bad > 0 {
		return fmt.Errorf("%d tables differ", bad)
	}
	fmt.Println("all row counts match")
	return nil
}

func ident(s string) string { return pgx.Identifier{s}.Sanitize() }
