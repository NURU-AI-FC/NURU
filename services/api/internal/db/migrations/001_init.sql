create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text not null default '',
  password_hash text not null,
  pin_hash text not null default '',
  role text not null default 'customer',
  language text not null default 'en',
  theme text not null default 'system',
  currency text not null default 'NGN',
  business_name text not null default '',
  business_type text not null default '',
  bvn_last4 text not null default '',
  kyc_verified boolean not null default false,
  email_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists otps (
  email text primary key,
  code_hash text not null,
  purpose text not null,
  attempts int not null default 0,
  expires_at timestamptz not null
);

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  bank text not null,
  name text not null,
  number_masked text not null,
  kind text not null default 'savings',
  balance numeric(16,2) not null default 0,
  currency text not null default 'NGN',
  linked_via text not null default 'seed'
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  direction text not null check (direction in ('debit','credit')),
  amount numeric(16,2) not null check (amount > 0),
  category text not null,
  merchant text not null,
  narration text not null default '',
  created_at timestamptz not null
);
create index if not exists transactions_user_time on transactions(user_id, created_at desc);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  kind text not null default 'bill',
  amount numeric(16,2) not null default 0,
  due_at timestamptz not null,
  done boolean not null default false
);

create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  role text not null,
  gross numeric(16,2) not null
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  lender text not null,
  principal numeric(16,2) not null,
  rate_pct numeric(5,2) not null,
  months int not null,
  disbursed_at timestamptz not null,
  next_due_at timestamptz not null,
  monthly numeric(16,2) not null,
  balance numeric(16,2) not null
);

create table if not exists investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  name text not null,
  value numeric(16,2) not null,
  contributed numeric(16,2) not null,
  monthly numeric(16,2) not null default 0
);

create table if not exists chats (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  lang text not null default 'en',
  nonce bytea not null,
  ciphertext bytea not null,
  created_at timestamptz not null default now()
);
create index if not exists chats_user_time on chats(user_id, created_at);

create table if not exists security_events (
  id bigserial primary key,
  user_id uuid references users(id) on delete set null,
  kind text not null,
  detail text not null,
  created_at timestamptz not null default now()
);
