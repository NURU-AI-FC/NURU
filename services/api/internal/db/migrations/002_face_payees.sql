-- Face enrolment for transfers, a lockout after repeated failures, and saved payees.
alter table users add column if not exists face_nonce bytea;
alter table users add column if not exists face_template bytea;
alter table users add column if not exists face_enrolled_at timestamptz;
alter table users add column if not exists transfer_fails int not null default 0;
alter table users add column if not exists transfer_locked_until timestamptz;

create table if not exists payees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  bank text not null,
  account text not null,
  created_at timestamptz not null default now(),
  unique (user_id, account)
);

-- The judge account starts without a PIN so the first transfer shows PIN creation.
update users set pin_hash = '' where email = 'judge@nuru.app' and face_template is null;

-- Saved payees for existing customers (new customers get them from the seed).
insert into payees(user_id, name, bank, account)
select u.id, p.name, p.bank, p.account from users u
cross join (values ('Tunde Bakare','GTBank','0123456621'), ('Mile 12 Market','Wema Bank','0034561290'),
                   ('Mama Ngozi','OPay','8123457788'), ('Mr Adeyemi, landlord','First Bank','3012349981')) as p(name, bank, account)
where u.role = 'customer'
on conflict do nothing;
