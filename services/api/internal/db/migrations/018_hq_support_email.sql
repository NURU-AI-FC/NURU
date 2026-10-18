-- NURU HQ: support tickets, an email log and how each AI answer was made.

-- Support tickets. Customer reports and disputes write here; HQ only ever
-- reads counts, the reason and the reference, never the customer's name or
-- the payee.
create sequence if not exists support_ref_seq start 3401;
create table if not exists support_tickets (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,
  user_id uuid references users(id) on delete set null,
  kind text not null check (kind in ('dispute', 'report', 'security', 'question', 'feedback')),
  subject text not null,
  transaction_id uuid references transactions(id) on delete set null,
  dispute_id uuid unique references disputes(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'resolved')),
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  first_reply_at timestamptz,
  resolved_at timestamptz
);
create index if not exists support_tickets_status on support_tickets(status, created_at);

create or replace function support_ref() returns trigger language plpgsql as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := case when new.kind in ('question', 'feedback') then 'NURU-SUP-' else 'NURU-RPT-' end || nextval('support_ref_seq');
  end if;
  return new;
end $$;
drop trigger if exists support_tickets_ref on support_tickets;
create trigger support_tickets_ref before insert on support_tickets for each row execute function support_ref();

-- Disputes opened before tickets existed.
insert into support_tickets(ref, user_id, kind, subject, transaction_id, dispute_id, status, created_at)
select '', d.user_id, 'dispute', d.reason, d.transaction_id, d.id,
  case when d.status in ('refunded', 'reversed', 'declined') then 'resolved' else 'open' end, d.created_at
from disputes d
where not exists (select 1 from support_tickets t where t.dispute_id = d.id)
order by d.created_at;

-- Every email NURU sends, once sending is wired to a provider. Opens and
-- clicks come back from the provider's webhooks.
create table if not exists email_log (
  id uuid primary key default gen_random_uuid(),
  template text not null,
  user_id uuid references users(id) on delete set null,
  provider_id text not null default '',
  sent_at timestamptz not null default now(),
  opened_at timestamptz,
  clicked_at timestamptz
);
create index if not exists email_log_sent on email_log(sent_at desc);

-- How each assistant answer was made (claude, template or guard) and how long
-- it took. Older rows stay blank and are shown as not recorded.
alter table chats add column if not exists engine text not null default '';
alter table chats add column if not exists latency_ms int;
