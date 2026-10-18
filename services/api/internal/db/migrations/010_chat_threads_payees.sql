-- Chats are grouped into conversations, and refused or blocked answers keep
-- their flag plus the data sources an answer used.
alter table chats add column if not exists thread_id uuid;
alter table chats add column if not exists blocked text not null default '';
alter table chats add column if not exists sources jsonb;
create index if not exists chats_thread on chats(user_id, thread_id, id);

-- Existing history becomes one conversation per day.
update chats c set thread_id = t.tid
from (select user_id, created_at::date as d, gen_random_uuid() as tid from chats where thread_id is null group by 1, 2) t
where c.thread_id is null and c.user_id = t.user_id and c.created_at::date = t.d;

-- Beneficiaries can be grouped and starred.
alter table payees add column if not exists tag text not null default '';
alter table payees add column if not exists starred boolean not null default false;

update payees set tag = 'Family', starred = true where name = 'Mama Ngozi' and tag = '';
update payees set tag = 'Vendors' where name in ('Mile 12 Market', 'Mr Adeyemi, landlord') and tag = '';
update payees set starred = true where name = 'Tunde Bakare' and tag = '' and not starred;

insert into payees(user_id, name, bank, account, tag)
select u.id, p.name, p.bank, p.account, p.tag from users u
cross join (values ('Kemi Foods Ltd', 'Zenith Bank', '1010940094', 'Business'),
                   ('Chidi Okeke', 'Access Bank', '0693313310', 'Family')) as p(name, bank, account, tag)
where u.role = 'customer'
on conflict do nothing;

-- Scheduled payments shown on the Pay hub are reminders with an amount.
insert into reminders(user_id, title, kind, amount, due_at)
select u.id, 'Mama upkeep', 'transfer', 30000, date_trunc('month', now()) + interval '27 days 9 hours'
  + case when extract(day from now()) > 28 then interval '1 month' else interval '0' end
from users u
where u.role = 'customer' and not exists (select 1 from reminders r where r.user_id = u.id and r.title = 'Mama upkeep');
