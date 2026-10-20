-- Indexes for the per-customer reads behind the first screens. Postgres does
-- not index foreign keys on its own, so "where user_id=$1" on these tables was
-- a full scan that grows with every customer.
create index if not exists accounts_user on accounts(user_id);
create index if not exists reminders_user_due on reminders(user_id, due_at);
create index if not exists loans_user on loans(user_id);
create index if not exists investments_user on investments(user_id);
create index if not exists staff_user on staff(user_id);
create index if not exists payees_user on payees(user_id);
create index if not exists goals_user on goals(user_id);
create index if not exists security_events_user_time on security_events(user_id, created_at desc);
create index if not exists transactions_account_time on transactions(account_id, created_at desc);
create index if not exists fixed_deposits_user on fixed_deposits(user_id);
create index if not exists insurance_policies_user on insurance_policies(user_id);
create index if not exists insurance_claims_user on insurance_claims(user_id);
create index if not exists vaults_user on vaults(user_id);
create index if not exists vendors_user on vendors(user_id);
create index if not exists invoices_user on invoices(user_id);
create index if not exists payroll_runs_user_month on payroll_runs(user_id, month desc);
create index if not exists plan_items_user_due on plan_items(user_id, due_at);
