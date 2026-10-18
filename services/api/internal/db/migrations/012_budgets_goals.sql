-- Monthly category budgets, savings goals with contributions, and answers to unusual spend alerts.
-- Demo rows go in only when the tables are first created, so deleting them sticks.
do $$
begin
  if to_regclass('budgets') is null then
    create table budgets (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      category text not null,
      monthly_limit numeric(16,2) not null check (monthly_limit > 0),
      created_at timestamptz not null default now(),
      unique (user_id, category)
    );
    insert into budgets(user_id, category, monthly_limit)
    select u.id, b.category, b.lim from users u
    cross join (values ('Food', 120000), ('Transport', 60000), ('Data and power', 45000), ('Shopping', 60000),
                       ('Entertainment', 35000), ('Family', 60000)) as b(category, lim)
    where u.role = 'customer';
  end if;

  if to_regclass('goals') is null then
    create table goals (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references users(id) on delete cascade,
      name text not null,
      note text not null default '',
      icon text not null default 'target',
      target numeric(16,2) not null check (target > 0),
      due_at date,
      auto_amount numeric(16,2) not null default 0,
      auto_day int not null default 0,
      created_at timestamptz not null default now()
    );
    create table goal_contributions (
      id uuid primary key default gen_random_uuid(),
      goal_id uuid not null references goals(id) on delete cascade,
      amount numeric(16,2) not null check (amount <> 0),
      note text not null default '',
      created_at timestamptz not null default now()
    );
    create index goal_contributions_goal on goal_contributions(goal_id, created_at);

    with g as (
      insert into goals(user_id, name, note, icon, target, due_at, auto_amount, auto_day)
      select u.id, x.name, x.note, x.icon, x.target, (date_trunc('month', now()) + x.due)::date, x.auto, x.day from users u
      cross join (values ('Rent fund', 'Half year rent', 'building', 350000, interval '3 months', 25000, 26),
                         ('Emergency fund', '3 months of expenses', 'umbrella', 1200000, interval '12 months', 20000, 26),
                         ('New laptop', 'MacBook Air', 'laptop', 1450000, interval '6 months', 0, 0),
                         ('Japa fund', 'Long term', 'globe', 5000000, interval '30 months', 15000, 26)) as x(name, note, icon, target, due, auto, day)
      where u.role = 'customer'
      returning id, name, target
    )
    insert into goal_contributions(goal_id, amount, note, created_at)
    select g.id, round(g.target * (case g.name when 'Rent fund' then 0.75 when 'Emergency fund' then 0.46 when 'New laptop' then 0.21 else 0.03 end) / 4 / 50) * 50,
           'Saved', least(now(), date_trunc('month', now()) - make_interval(months => m.ago) + interval '25 days')
    from g cross join generate_series(0, 3) as m(ago);
  end if;

  if to_regclass('alert_reviews') is null then
    create table alert_reviews (
      user_id uuid not null references users(id) on delete cascade,
      transaction_id uuid not null references transactions(id) on delete cascade,
      answer text not null,
      created_at timestamptz not null default now(),
      primary key (user_id, transaction_id)
    );
    -- one recent unusual card payment per customer for the alert screen
    with pick as (
      select distinct on (u.id) u.id uid, a.id aid from users u join accounts a on a.user_id=u.id
      where u.role='customer' and a.kind<>'business' order by u.id, a.kind='current' desc, a.name
    ), t as (
      insert into transactions(user_id, account_id, direction, amount, category, merchant, narration, created_at)
      select uid, aid, 'debit', 85000, 'Shopping', 'Slot Systems Ikeja', 'POS purchase', date_trunc('day', now()) - interval '1 day' + interval '14 hours 14 minutes' from pick
      returning account_id
    )
    update accounts set balance=greatest(balance-85000, 20000) where id in (select account_id from t);
  end if;
end $$;
