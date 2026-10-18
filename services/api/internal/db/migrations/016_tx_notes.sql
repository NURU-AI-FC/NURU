-- The customer's own description of a transaction, asked for by NURU when money
-- moves with no narration. The text is encrypted with the customer's key.
create table if not exists tx_notes (
  tx_id uuid primary key references transactions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  label text not null default '',
  nonce bytea not null,
  ciphertext bytea not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tx_notes_user on tx_notes(user_id, updated_at desc);
