-- Loans, savings, insurance and business tools: disputes, fixed deposits,
-- pension contributions, insurance, savings vaults, vendors, invoices,
-- payroll runs and a business plan.
alter table users add column if not exists business_staff int not null default 0;
alter table users add column if not exists business_rc text not null default '';
alter table users add column if not exists business_sales numeric(16,2) not null default 0;
alter table users add column if not exists business_customers text not null default '';

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  transaction_id uuid references transactions(id) on delete set null,
  title text not null,
  reason text not null,
  detail text not null default '',
  amount numeric(16,2) not null check (amount > 0),
  status text not null default 'review',
  created_at timestamptz not null default now()
);
create unique index if not exists disputes_one_per_tx on disputes(transaction_id) where transaction_id is not null;

create table if not exists fixed_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  principal numeric(16,2) not null check (principal > 0),
  rate_pct numeric(5,2) not null,
  days int not null,
  started_at timestamptz not null default now(),
  rollover boolean not null default true,
  status text not null default 'active',
  payout numeric(16,2),
  closed_at timestamptz
);

create table if not exists pension_contributions (
  user_id uuid not null references users(id) on delete cascade,
  month date not null,
  employer numeric(16,2) not null default 0,
  employee numeric(16,2) not null default 0,
  primary key (user_id, month)
);

create table if not exists insurance_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  provider text not null,
  plan text not null,
  policy_no text not null,
  cover numeric(16,2) not null,
  premium numeric(16,2) not null,
  excess numeric(16,2) not null default 0,
  renews_at timestamptz not null
);

create table if not exists insurance_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  policy_id uuid not null references insurance_policies(id) on delete cascade,
  description text not null,
  amount numeric(16,2) not null check (amount > 0),
  photos int not null default 0,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

create table if not exists vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  balance numeric(16,2) not null default 0 check (balance >= 0),
  target numeric(16,2) not null default 0,
  rate_pct numeric(5,2) not null default 12,
  note text not null default '',
  unlocks_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  note text not null default '',
  amount numeric(16,2) not null check (amount > 0),
  due_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  number text not null,
  customer text not null,
  amount numeric(16,2) not null check (amount > 0),
  issued_at timestamptz not null default now(),
  due_at timestamptz not null,
  paid_at timestamptz,
  unique (user_id, number)
);

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  month date not null,
  staff int not null,
  gross numeric(16,2) not null,
  net numeric(16,2) not null,
  paye numeric(16,2) not null,
  pension_employee numeric(16,2) not null,
  pension_employer numeric(16,2) not null,
  nhf numeric(16,2) not null,
  total numeric(16,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, month)
);

create table if not exists plan_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  title text not null,
  note text not null default '',
  amount numeric(16,2) not null default 0,
  due_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Demo rows for one customer. Each block only runs when that table is still
-- empty for the user, so it is safe on every start and from the signup seed.
create or replace function nuru_seed_money(u uuid) returns void language plpgsql as $$
declare
  biz boolean;
  d record;
  m int;
begin
  select business_name <> '' into biz from users where id = u;

  if not exists (select 1 from disputes where user_id = u) then
    for d in select * from (values ('Shopping', 'Item not delivered', 'review', 0), ('Food', 'Charged twice', 'investigating', 1),
                                   ('Transport', 'Trip cancelled, still charged', 'refunded', 2), ('Entertainment', 'Cancelled, still charged', 'reversed', 3)) v(cat, reason, status, n) loop
      insert into disputes(user_id, transaction_id, title, reason, amount, status, created_at)
      select u, x.id, x.merchant, d.reason, x.amount, d.status, least(now(), x.created_at + interval '1 day')
      from transactions x where x.user_id = u and x.category = d.cat and x.direction = 'debit'
      order by x.created_at desc offset d.n * 3 limit 1
      on conflict do nothing;
    end loop;
  end if;

  if not exists (select 1 from fixed_deposits where user_id = u) then
    insert into fixed_deposits(user_id, principal, rate_pct, days, started_at) values (u, 1000000, 18, 182, now() - interval '102 days');
  end if;

  if not exists (select 1 from pension_contributions where user_id = u) then
    for m in 1..6 loop
      insert into pension_contributions(user_id, month, employer, employee)
      values (u, (date_trunc('month', now()) - make_interval(months => m))::date, case when m = 4 then 0 else 64000 end, 51200);
    end loop;
  end if;

  if not exists (select 1 from insurance_policies where user_id = u) then
    insert into insurance_policies(user_id, kind, provider, plan, policy_no, cover, premium, excess, renews_at) values
      (u, 'health', 'AXA Mansard', 'HMO Silver, you and 2 dependants', 'AXA-H-' || substr(md5(u::text), 1, 6), 5000000, 9800, 0, now() + interval '106 days'),
      (u, 'car', 'Leadway', 'Toyota Corolla 2016, comprehensive', 'LDW-C-' || substr(md5(u::text), 7, 6), 4500000, 8600, 25000, now() + interval '24 days');
    if biz then
      insert into insurance_policies(user_id, kind, provider, plan, policy_no, cover, premium, excess, renews_at)
      values (u, 'shop', 'AIICO', 'Shop stock and fire', 'AIC-S-' || substr(md5(u::text), 13, 6), 6000000, 6250, 50000, now() + interval '136 days');
    end if;
  end if;

  if not exists (select 1 from vaults where user_id = u) then
    insert into vaults(user_id, name, balance, target, rate_pct, note, unlocks_at) values
      (u, 'Emergency fund', 560000, 1500000, 12, 'Flexible, for real emergencies', null),
      (u, 'Rent fund', 290000, 700000, 12, 'For the January rent', date_trunc('year', now()) + interval '1 year'),
      (u, 'New laptop', 310000, 850000, 10, 'Flexible', null),
      (u, 'Japa fund', 120000, 3000000, 15, 'Locked for 2 years', now() + interval '2 years');
  end if;

  if biz and not exists (select 1 from vendors where user_id = u) then
    insert into vendors(user_id, name, note, amount, due_at, paid_at) values
      (u, 'Mile 12 Market (Alhaji Sule)', 'Tomatoes and peppers, weekly', 185000, now() + interval '3 days', null),
      (u, 'Gas Plus Ikota', 'Cooking gas, every 2 weeks', 64000, now() + interval '6 days', null),
      (u, 'Femi Solar Ltd', 'Inverter maintenance', 45000, now() - interval '9 days', now() - interval '9 days'),
      (u, 'Pack-It Nigeria', 'Takeaway packs', 92000, now() - interval '12 days', now() - interval '12 days'),
      (u, 'IKEDC (shop)', 'Electricity', 38000, now() - interval '15 days', now() - interval '15 days');
  end if;

  if biz and not exists (select 1 from invoices where user_id = u) then
    insert into invoices(user_id, number, customer, amount, issued_at, due_at, paid_at) values
      (u, 'INV-0139', 'Bimbo''s wedding', 85000, now() - interval '36 days', now() - interval '6 days', null),
      (u, 'INV-0140', 'Chevron canteen', 260000, now() - interval '30 days', now() - interval '10 days', now() - interval '11 days'),
      (u, 'INV-0142', 'Lekki Tech Hub (lunch)', 120000, now() - interval '44 days', now() - interval '14 days', null),
      (u, 'INV-0145', 'Yaba Coworking', 35000, now() - interval '16 days', now() - interval '2 days', null),
      (u, 'INV-0147', 'Access Bank staff party', 175000, now() - interval '4 days', now() + interval '12 days', null);
  end if;

  if biz and not exists (select 1 from plan_items where user_id = u) then
    insert into plan_items(user_id, kind, title, note, amount, due_at) values
      (u, 'meeting', 'Investor meeting', 'Tola Capital, revenue and growth review', 0, now() + interval '4 days'),
      (u, 'insurance', 'Insurance', 'Shop and staff health cover', -150000, date_trunc('month', now()) + interval '3 months'),
      (u, 'marketing', 'Marketing', 'Target offices in Victoria Island', -120000, date_trunc('month', now()) + interval '4 months'),
      (u, 'funding', 'Funding', 'Raise ₦5m for a second kitchen', 5000000, date_trunc('month', now()) + interval '5 months');
  end if;
end $$;

select nuru_seed_money(id) from users where role = 'customer';
