import math
import os

import pytest

import knowledge


def cos(a, b):
    return sum(x * y for x, y in zip(a, b))


def test_embed_is_unit_and_stable():
    v = knowledge.embed("How do I raise a dispute on a card payment?")
    assert len(v) == knowledge.DIM
    assert math.isclose(math.sqrt(sum(x * x for x in v)), 1.0, rel_tol=1e-9)
    assert v == knowledge.embed("How do I raise a dispute on a card payment?")
    assert knowledge.embed("") == [0.0] * knowledge.DIM


def test_embed_ranks_related_text_higher():
    q = knowledge.embed("how do I dispute a failed transfer")
    near = knowledge.embed("To dispute a failed transfer, open the transaction and tap Report. Refunds take up to 5 days.")
    far = knowledge.embed("Fixed deposits earn interest monthly and can be withdrawn early with a penalty.")
    assert cos(q, near) > cos(q, far)


def test_chunks_pack_paragraphs():
    text = "\n\n".join(["word " * 50] * 6)
    parts = knowledge.chunks(text, size=600)
    assert len(parts) > 1 and all(len(p) <= 600 for p in parts)


def test_no_url_means_no_retrieval():
    r = knowledge.Retriever(url="")
    assert not r.enabled() and r.search("anything") == []


def test_unreachable_db_is_quiet():
    r = knowledge.Retriever(url="postgresql://nobody@127.0.0.1:1/none?connect_timeout=1")
    assert r.search("dispute") == []


@pytest.mark.skipif(not os.getenv("KNOWLEDGE_TEST_DB_URL"), reason="needs a Postgres with pgvector")
def test_search_against_pgvector(tmp_path, monkeypatch):
    url = os.environ["KNOWLEDGE_TEST_DB_URL"]
    monkeypatch.setenv("KNOWLEDGE_DB_URL", url)
    doc = tmp_path / "disputes.md"
    doc.write_text("To dispute a failed transfer, open the transaction and tap Report.\n\nFixed deposits pay interest monthly.")
    knowledge.ingest([str(doc)])
    assert knowledge.ingest([str(doc)]) == 0  # idempotent
    hits = knowledge.Retriever(url=url).search("how do I dispute a transfer")
    assert hits and hits[0]["source"] == "disputes.md" and "dispute" in hits[0]["content"]
