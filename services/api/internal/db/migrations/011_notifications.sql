-- In-app notifications built from insights, due reminders, large debits and transfers,
-- plus per user notification preferences.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  key text not null,
  kind text not null,
  tone text not null default 'gray',
  icon text not null default 'bell',
  title text not null,
  body text not null default '',
  amount numeric(16,2) not null default 0,
  tx_id uuid references transactions(id) on delete set null,
  link text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);
create index if not exists notifications_user_time on notifications(user_id, created_at desc);

create table if not exists notification_settings (
  user_id uuid primary key references users(id) on delete cascade,
  prefs jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Demo notifications for existing customers from their real data.
insert into notifications(user_id, key, kind, tone, icon, title, body, amount, tx_id, link, created_at)
select t.user_id, 'tx:' || t.id, 'alert', 'red', 'alert', 'Large payment',
  '₦' || to_char(t.amount, 'FM999,999,990') || ' to ' || t.merchant || ' from ' || a.name || '.', t.amount, t.id, '/history/' || t.id, t.created_at
from transactions t join accounts a on a.id = t.account_id join users u on u.id = t.user_id
where u.role = 'customer' and a.kind <> 'business' and t.direction = 'debit' and t.amount >= 50000
  and t.category not in ('Savings') and t.created_at > now() - interval '30 days'
on conflict do nothing;

insert into notifications(user_id, key, kind, tone, icon, title, body, amount, tx_id, link, created_at)
select t.user_id, 'tx:' || t.id, 'activity', 'green', 'down', t.category || ' received',
  '₦' || to_char(t.amount, 'FM999,999,990') || ' from ' || t.merchant || '.', t.amount, t.id, '/history/' || t.id, t.created_at
from transactions t join accounts a on a.id = t.account_id join users u on u.id = t.user_id
where u.role = 'customer' and a.kind <> 'business' and t.direction = 'credit' and t.category = 'Salary'
  and t.created_at > now() - interval '30 days'
on conflict do nothing;

insert into notifications(user_id, key, kind, tone, icon, title, body, amount, link, created_at)
select r.user_id, 'due:' || r.id, 'reminder', 'amber', 'calendar', r.title || ' is coming up',
  case when r.amount > 0 then '₦' || to_char(r.amount, 'FM999,999,990') || ' due on ' || to_char(r.due_at, 'FMDD Mon') || '.'
       else 'Scheduled for ' || to_char(r.due_at, 'FMDD Mon, HH12:MI am') || '.' end,
  r.amount, '/planner', now() - interval '2 hours'
from reminders r join users u on u.id = r.user_id
where u.role = 'customer' and not r.done and r.due_at between now() and now() + interval '7 days'
on conflict do nothing;
