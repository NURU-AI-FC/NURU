-- Knowledge chunks for NURU's answers, searched by meaning with pgvector.
-- Supabase ships pgvector; plain Postgres (for example Railway's image or
-- the local docker one) may not. Without the extension this file does
-- nothing, the AI service skips retrieval and answers as before.
-- embedding is 384 numbers: the size services/ai/knowledge.py produces, and
-- the size of small sentence models such as all-MiniLM-L6-v2 should we swap.
do $$
begin
  begin
    create extension if not exists vector;
  exception when others then
    raise notice 'pgvector is not available here, skipping knowledge_chunks';
    return;
  end;

  if not exists (select 1 from pg_extension where extname = 'vector') then
    return;
  end if;

  execute $sql$
    create table if not exists knowledge_chunks (
      id bigserial primary key,
      source text not null,
      content text not null,
      embedding vector(384) not null,
      created_at timestamptz not null default now()
    )
  $sql$;
  -- re-running an import skips chunks it already has
  execute 'create unique index if not exists knowledge_chunks_source_content_idx on knowledge_chunks (source, md5(content))';

  begin
    execute 'create index if not exists knowledge_chunks_embedding_idx on knowledge_chunks using hnsw (embedding vector_cosine_ops)';
  exception when others then
    -- pgvector older than 0.5 has no HNSW; a small table is fine without it
    raise notice 'could not create HNSW index on knowledge_chunks: %', sqlerrm;
  end;
end
$$;
