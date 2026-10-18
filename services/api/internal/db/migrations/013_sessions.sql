-- Signed in devices, so customers can see and revoke sessions, plus voice and privacy preferences.
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  device text not null,
  user_agent text not null default '',
  ip text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists sessions_user on sessions(user_id, last_seen_at desc);

alter table users add column if not exists prefs jsonb not null default '{}';
alter table users add column if not exists password_changed_at timestamptz;
alter table users add column if not exists pin_changed_at timestamptz;

-- Earlier devices for existing customers (new customers get them from the seed).
insert into sessions(user_id, device, user_agent, ip, created_at, last_seen_at, revoked_at)
select u.id, d.device, d.ua, d.ip, now() - d.age, now() - d.seen, case when d.out then now() - d.seen end
from users u
cross join (values
  ('MacBook Pro · Chrome', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Chrome/129.0', '102.89.xx.xx', interval '40 days', interval '2 hours', false),
  ('Samsung A54 · Chrome', 'Mozilla/5.0 (Linux; Android 14; SM-A546E) Chrome/128.0', '105.112.xx.xx', interval '90 days', interval '21 days', true)
) as d(device, ua, ip, age, seen, out)
where u.role = 'customer' and not exists (select 1 from sessions s where s.user_id = u.id and s.device = d.device);
