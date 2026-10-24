-- NURU is offered to every bank, so the demo no longer names one. Seeded rows
-- that named the original hackathon partner now use neutral names; the host
-- bank's accounts use the default BANK_NAME, 'Partner Bank'.
update accounts set bank = 'Partner Bank' where bank = 'Zenith Bank';
update accounts set name = 'Savings account' where name = 'Zenith Savings';
update payees set bank = 'Access Bank' where bank = 'Zenith Bank' and name = 'Kemi Foods Ltd';
update payees set bank = 'Partner Bank' where bank = 'Zenith Bank';
update loans set lender = 'Personal Loan' where lender = 'Zenith Personal Loan';
update investments set name = 'Money Market Fund' where name = 'Zenith Money Market Fund';
update reminders set title = 'Loan repayment' where title = 'Loan repayment, Zenith';
update transactions set merchant = 'Fixed deposit' where merchant = 'Zenith fixed deposit';
update campaigns set message = replace(message, 'A Zenith ', 'An ') where message like '%A Zenith %';

-- The demo customer signs in as demo@nuru.app.
update users set email = 'demo@nuru.app'
where email = 'judge@nuru.app' and not exists (select 1 from users where email = 'demo@nuru.app');
