"""Knowledge retrieval from Postgres with pgvector.

With KNOWLEDGE_DB_URL set and the database holding the knowledge_chunks table (migration 020,
created only where pgvector exists, such as Supabase) with rows, NURU looks
up the few chunks closest to the question and gives them to Claude as
reference text. Anything missing (no database URL, no psycopg, no table, no
rows, a failed query) means no chunks, and answers are built as before.

Embeddings: embed() is a local feature-hashing embedding. It needs no model
download, no paid API and no new heavy dependency, and runs in microseconds.
It matches on shared words and word pieces, not on meaning, so it finds
"how do I raise a dispute" for a chunk about disputes but not for one that
only says "chargeback". To move to a sentence model later, replace embed()
with one that returns DIM floats (all-MiniLM-L6-v2 gives 384) and re-run
the ingest command so stored vectors match.

Ingest guides, FAQs or product notes (markdown or text files):

    KNOWLEDGE_DB_URL=... python knowledge.py ingest docs/faq.md docs/products/*.md
"""

import hashlib
import logging
import math
import os
import re
import sys
import time

log = logging.getLogger("nuru-ai.knowledge")

DIM = 384
TOP_K = 3
MIN_SCORE = 0.2  # cosine similarity below this is noise for hashed features
RECHECK = 300  # seconds between checks for the table after it was missing

try:
    import psycopg
except ImportError:  # retrieval is optional
    psycopg = None

WORD = re.compile(r"[a-z0-9À-ɏḀ-ỿ]+")
STOP = set("a an and are as at be by can do does for from has have how i if in is it its me my of on or our so that the this to was we what when where which who why will with you your".split())


def _bucket(feature: str) -> tuple[int, float]:
    h = hashlib.blake2b(feature.encode(), digest_size=8).digest()
    n = int.from_bytes(h, "little")
    return n % DIM, 1.0 if (n >> 63) & 1 else -1.0


def embed(text: str) -> list[float]:
    """A unit vector of DIM floats from words, word pairs and word pieces."""
    words = [w for w in WORD.findall(text.lower()) if w not in STOP]
    vec = [0.0] * DIM
    feats: list[tuple[str, float]] = []
    for w in words:
        feats.append(("w:" + w, 1.0))
        if len(w) > 4:  # pieces let "repayments" meet "repayment"
            for i in range(len(w) - 3):
                feats.append(("g:" + w[i:i + 4], 0.25))
    for a, b in zip(words, words[1:]):
        feats.append(("b:" + a + " " + b, 0.5))
    for f, weight in feats:
        i, sign = _bucket(f)
        vec[i] += sign * weight
    norm = math.sqrt(sum(v * v for v in vec))
    return [v / norm for v in vec] if norm else vec


def to_pgvector(vec: list[float]) -> str:
    return "[" + ",".join(f"{v:.6f}" for v in vec) + "]"


def db_url(ingesting: bool = False) -> str:
    # Answers read with KNOWLEDGE_DB_URL only (ideally a read-only role), so
    # the AI service never holds the API's full database login by accident.
    url = os.getenv("KNOWLEDGE_DB_URL", "")
    return url or (os.getenv("DATABASE_URL", "") if ingesting else "")


class Retriever:
    """Finds chunks close to a question; stays quiet when it cannot."""

    def __init__(self, url: str | None = None):
        self.url = db_url() if url is None else url
        self.conn = None
        self.ready_at = 0.0  # when to look for the table again
        self.ready = False

    def enabled(self) -> bool:
        return bool(self.url) and psycopg is not None

    def _connect(self):
        if self.conn is None or self.conn.closed:
            self.conn = psycopg.connect(self.url, connect_timeout=3, autocommit=True)
        return self.conn

    def _check(self) -> bool:
        if self.ready:
            return True
        if time.monotonic() < self.ready_at:
            return False
        self.ready_at = time.monotonic() + RECHECK
        conn = self._connect()
        row = conn.execute("select to_regclass('knowledge_chunks') is not null").fetchone()
        if row and row[0]:
            self.ready = conn.execute("select exists(select 1 from knowledge_chunks)").fetchone()[0]
        if self.ready:
            log.info("knowledge retrieval on")
        return self.ready

    def search(self, question: str, k: int = TOP_K) -> list[dict]:
        if not self.enabled() or not question.strip():
            return []
        try:
            if not self._check():
                return []
            rows = self._connect().execute(
                """select source, content, 1 - (embedding <=> %s::vector) as score
                   from knowledge_chunks order by embedding <=> %s::vector limit %s""",
                (v := to_pgvector(embed(question)), v, k),
            ).fetchall()
        except Exception as e:  # never let retrieval break an answer
            log.warning("knowledge lookup failed: %s", type(e).__name__)
            self.ready, self.ready_at = False, time.monotonic() + 60
            if self.conn is not None:
                try:
                    self.conn.close()
                except Exception:
                    pass
                self.conn = None
            return []
        return [{"source": s, "content": c, "score": round(float(sc), 3)} for s, c, sc in rows if sc >= MIN_SCORE]


def chunks(text: str, size: int = 900) -> list[str]:
    """Split on blank lines, then pack paragraphs up to about size characters."""
    out, cur = [], ""
    for para in re.split(r"\n\s*\n", text):
        para = para.strip()
        if not para:
            continue
        while len(para) > size:  # a very long paragraph: cut at a sentence
            cut = para.rfind(". ", 0, size)
            cut = cut + 1 if cut > size // 3 else size
            out.append(para[:cut].strip())
            para = para[cut:].strip()
        if cur and len(cur) + len(para) + 2 > size:
            out.append(cur)
            cur = ""
        cur = f"{cur}\n\n{para}" if cur else para
    if cur:
        out.append(cur)
    return out


def ingest(paths: list[str]) -> int:
    if psycopg is None:
        sys.exit("pip install 'psycopg[binary]' first")
    if not db_url(ingesting=True):
        sys.exit("set KNOWLEDGE_DB_URL or DATABASE_URL to the database with knowledge_chunks")
    added = 0
    with psycopg.connect(db_url(ingesting=True)) as conn:
        if not conn.execute("select to_regclass('knowledge_chunks') is not null").fetchone()[0]:
            sys.exit("knowledge_chunks is missing: this database has no pgvector, or the API has not migrated it yet")
        for path in paths:
            with open(path, encoding="utf-8") as f:
                parts = chunks(f.read())
            source = os.path.basename(path)
            for part in parts:
                cur = conn.execute(
                    """insert into knowledge_chunks(source, content, embedding) values (%s, %s, %s::vector)
                       on conflict (source, md5(content)) do nothing""",
                    (source, part, to_pgvector(embed(part))),
                )
                added += cur.rowcount
            print(f"{source}: {len(parts)} chunks")
    print(f"added {added} new chunks")
    return added


if __name__ == "__main__":
    if len(sys.argv) < 3 or sys.argv[1] != "ingest":
        sys.exit("usage: python knowledge.py ingest FILE [FILE...]")
    ingest(sys.argv[2:])
