-- Who can see what: the NURU team signs in to HQ (role 'hq') with an hq_role,
-- Bank staff sign in to the console (role 'staff') with a console_role.
-- Invites and deactivation keep the person's row so the audit log still
-- names who did what.
alter table users add column if not exists hq_role text not null default '';
alter table users add column if not exists console_role text not null default '';
alter table users add column if not exists invited_by uuid references users(id) on delete set null;
alter table users add column if not exists invited_at timestamptz;
alter table users add column if not exists deactivated_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'users_hq_role_check') then
    alter table users add constraint users_hq_role_check check (hq_role in ('', 'owner', 'ops', 'support', 'engineer', 'analyst'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'users_console_role_check') then
    alter table users add constraint users_console_role_check check (console_role in ('', 'viewer', 'analyst', 'campaigns', 'risk', 'admin'));
  end if;
end $$;

-- Bank staff from before roles existed become console admins.
update users set console_role = 'admin' where role = 'staff' and console_role = '';

-- Audit log for HQ and the console. Details never hold customer names,
-- emails or account numbers: customers appear by masked ID only.
create table if not exists audit_log (
  id bigserial primary key,
  scope text not null check (scope in ('hq', 'console')),
  actor_id uuid references users(id) on delete set null,
  actor text not null default '',
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_log_scope_time on audit_log(scope, created_at desc);
