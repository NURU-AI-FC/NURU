-- Staff console: anonymised customer profiles and campaigns.
-- Profiles never hold names, emails or account numbers. Rows with source 'live'
-- are computed from real customers' transactions by the API; rows with source
-- 'pilot' are a modelled cohort so the console shows bank scale figures, and
-- the console labels them as estimated.
create table if not exists console_customers (
  id bigserial primary key,
  user_id uuid unique references users(id) on delete cascade,
  source text not null default 'pilot' check (source in ('live','pilot')),
  state text not null default 'Lagos',
  age_band text not null default '25-34',
  joined date not null default current_date,
  first_seen date not null default current_date,
  last_active timestamptz not null default now(),
  language text not null default 'en',
  voice boolean not null default false,
  tier int not null default 1,
  income numeric(14,2) not null default 0,
  spend numeric(14,2) not null default 0,
  savings numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  credits_month int not null default 0,
  credit_sources int not null default 0,
  low_balance_days int not null default 0,
  has_business boolean not null default false,
  salary_regular boolean not null default false,
  family_inflow boolean not null default false,
  fx_buyer boolean not null default false,
  car_owner boolean not null default false,
  insured boolean not null default false,
  quick_loans boolean not null default false,
  products text[] not null default '{}',
  product_value numeric(16,2) not null default 0,
  nuru_weekly int not null default 0,
  questions int not null default 0,
  insights_shown int not null default 0,
  insights_acted int not null default 0,
  health int not null default 600,
  churn numeric(4,3) not null default 0.1,
  ltv numeric(14,2) not null default 0,
  consent_insights boolean not null default true,
  consent_offers boolean not null default true,
  consent_ai boolean not null default true,
  consent_open_banking boolean not null default false,
  flags text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create index if not exists console_customers_source on console_customers(source, consent_insights);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null,
  offer text not null,
  message text not null,
  language text not null default 'en',
  channels text[] not null default '{chat}',
  send_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft','pending','approved','sent','stopped')),
  reach int not null default 0,
  expected int not null default 0,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Modelled pilot cohort, 24,000 opted in and opted out profiles, made once.
do $$
begin
if exists (select 1 from console_customers where source = 'pilot') then
  return;
end if;
perform setseed(0.2026);
create temp table pilot_raw on commit drop as
  select g, random()::numeric r0, random()::numeric r1, random()::numeric r2, random()::numeric r3, random()::numeric r4, random()::numeric r5, random()::numeric r6, random()::numeric r7,
         random()::numeric r8, random()::numeric r9, random()::numeric r10, random()::numeric r11, random()::numeric r12, random()::numeric r13, random()::numeric r14, random()::numeric r15
  from generate_series(1, 24000) g;
create temp table pilot_k on commit drop as
  select *,
    case when r0 < 0.38 then 'salary' when r0 < 0.55 then 'trader' when r0 < 0.75 then 'student' when r0 < 0.85 then 'business' else 'high' end k
  from pilot_raw;
create temp table pilot_f on commit drop as
  select *,
    round(case k
      when 'salary' then 150000 + r1 * r1 * 730000
      when 'trader' then 80000 + r1 * r1 * 1100000
      when 'student' then 15000 + r1 * 95000
      when 'business' then 400000 + r1 * r1 * 5600000
      else 1000000 + r1 * r1 * 3000000 end, -2) income,
    case k
      when 'salary' then case when r2 < 0.35 then 0.9 + r3 * 0.1 else 0.6 + r3 * 0.3 end
      when 'trader' then 0.7 + r3 * 0.28
      when 'student' then 0.75 + r3 * 0.25
      when 'business' then 0.6 + r3 * 0.35
      else 0.75 + r3 * 0.25 end ratio
  from pilot_k;
insert into console_customers(source, state, age_band, joined, first_seen, last_active, language, voice, tier, income, spend, savings, balance,
  credits_month, credit_sources, low_balance_days, has_business, salary_regular, family_inflow, fx_buyer, car_owner, insured, quick_loans,
  products, product_value, nuru_weekly, questions, insights_shown, insights_acted, health, churn, ltv,
  consent_insights, consent_offers, consent_ai, consent_open_banking, flags)
select 'pilot',
  (array['Lagos','Lagos','Lagos','Lagos','Lagos','Lagos','Lagos','Lagos','Lagos','Abuja','Abuja','Abuja','Rivers','Rivers','Oyo','Oyo','Kano','Kano','Enugu','Anambra','Kaduna','Ogun','Delta','Edo'])[1 + floor(r4 * 24)::int],
  case when k = 'student' then '18-24' else (array['25-34','25-34','25-34','35-44','35-44','45-54','55+'])[1 + floor(r5 * 7)::int] end,
  date '2012-01-01' + floor(r6 * (current_date - date '2012-01-01'))::int,
  current_date - floor(180 * power(r7, 1.4))::int,
  now() - make_interval(secs => power(r8, 3) * 45 * 86400),
  case when r9 < 0.61 then 'en' when r9 < 0.80 then 'yo' when r9 < 0.91 then 'ha' else 'ig' end,
  r9 >= 0.61 and r10 < 0.27,
  case when k = 'business' then 3 when r10 < 0.7 then 2 else 1 end,
  income,
  round(income * ratio, -2),
  round(case when k = 'high' then income * (1 - ratio) * 0.3 else income * least(0.15, greatest(0, 1 - ratio) * 0.6) end, -2),
  round(income * (0.1 + r11 * 1.9), -2),
  case k when 'trader' then 25 + floor(r12 * 65)::int when 'business' then 30 + floor(r12 * 120)::int when 'student' then 3 + floor(r12 * 6)::int else 1 + floor(r12 * 3)::int end,
  case k when 'trader' then 8 + floor(r13 * 32)::int when 'business' then 10 + floor(r13 * 60)::int when 'student' then 1 + floor(r13 * 3)::int else 1 + floor(r13 * 3)::int end,
  case when k in ('trader','business') then floor(r14 * r14 * 14)::int when ratio > 0.92 then floor(r14 * 9)::int else floor(r14 * 3)::int end,
  k = 'business',
  k = 'salary' or (k = 'high' and r12 < 0.7),
  k = 'student',
  r15 < case when k = 'high' then 0.4 else 0.14 end,
  r2 < case k when 'student' then 0.03 when 'salary' then 0.32 else 0.5 end,
  r2 < case k when 'student' then 0.01 when 'salary' then 0.12 else 0.22 end,
  k in ('salary','student') and ratio > 0.9 and r11 < 0.45,
  array_remove(array['Savings',
    case when r3 < 0.9 then 'Debit card' end,
    case when r4 < 0.18 and k <> 'student' then 'Personal loan' end,
    case when r5 < 0.22 then 'Target savings' end,
    case when r2 < case k when 'student' then 0.01 when 'salary' then 0.12 else 0.22 end then 'Motor insurance' end,
    case when r15 < 0.07 then 'Domiciliary account' end,
    case when k = 'business' then 'Business account' end,
    case when k = 'business' and r6 < 0.3 then 'Overdraft' end,
    case when r7 < 0.15 and k <> 'student' then 'Investments' end], null),
  round((case when r4 < 0.18 and k <> 'student' then 300000 + r1 * 2700000 else 0 end)
    + (case when r5 < 0.22 then income * 0.1 * 6 else 0 end)
    + (case when k = 'business' and r6 < 0.3 then 500000 + r1 * 4500000 else 0 end)
    + (case when r7 < 0.15 and k <> 'student' then 200000 + r12 * 2000000 else 0 end), -2),
  floor(r10 * r10 * 12)::int,
  floor(r10 * r10 * 12 * (1 + 180 * power(r7, 1.4) / 7) * 1.3)::int,
  4 + floor(r13 * 36)::int,
  floor((4 + floor(r13 * 36)) * (0.15 + r14 * 0.45))::int,
  greatest(300, least(850, round(800 - ratio * 300 + case when k = 'high' then 0 else (1 - ratio) * 400 end + r15 * 120 - 60)))::int,
  round(least(0.9, 0.03 + power(r8, 3) * 0.35 + r12 * 0.06)::numeric, 3),
  round(income * (0.1 + r11 * 1.9) * 0.06 * 5 + income * ratio * 12 * 0.006 * 5 + case when k = 'business' then income * 0.4 else 0 end, -2),
  r12 < 0.86,
  r13 < 0.72,
  r14 < 0.91,
  r15 < 0.48,
  array_remove(array[
    case when r3 < 0.03 then 'Failed PINs' end,
    case when r4 > 0.985 then 'Face mismatch' end,
    case when r5 > 0.99 then 'Transfers locked' end,
    case when k in ('salary','student') and ratio > 0.9 and r11 < 0.45 then 'Quick loan apps' end,
    case when k in ('trader','business') and floor(r14 * r14 * 14) >= 6 then 'Cash gap' end], null)
from pilot_f;
end $$;

-- Campaigns already in the pipeline so the list is not empty.
insert into campaigns(name, segment, offer, message, language, channels, send_at, status, reach, expected, created_at)
select c.name, c.segment, c.offer, c.message, c.language, c.channels, now() + c.send_in, c.status, c.reach, c.expected, now() - c.made
from (values
  ('Payday savings nudge', 'salary', 'Target savings plan', 'Your salary just landed. Shall I move 10% into your savings plan every payday? It earns 12% a year.', 'en', '{chat,push}'::text[], interval '6 days', 'pending', 5810, 1970, interval '1 day'),
  ('Cash gap overdraft', 'business', 'Business overdraft', 'Cash runs low before your sales come in. An overdraft line covers the gap and you only pay interest on what you use.', 'en', '{chat,email}'::text[], interval '-9 days', 'sent', 1690, 470, interval '14 days'),
  ('Student zero fee account', 'student', 'Zero fee student account', 'Ẹ kú àṣeyọrí! Open a student account with no transfer fees and save your allowance automatically.', 'yo', '{chat,push,sms}'::text[], interval '12 days', 'draft', 3420, 750, interval '3 hours')
) as c(name, segment, offer, message, language, channels, send_in, status, reach, expected, made)
where not exists (select 1 from campaigns);
