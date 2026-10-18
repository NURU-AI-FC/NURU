-- Console exports: masked CSVs kept for 7 days, then they can no longer be
-- downloaded and are deleted.
create table if not exists console_exports (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references users(id) on delete set null,
  kind text not null,
  rows int not null default 0,
  body text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);
create index if not exists console_exports_staff on console_exports(staff_id, created_at desc);
