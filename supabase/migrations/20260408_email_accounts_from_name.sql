-- Editable sender display name for email accounts.
alter table public.email_accounts
  add column if not exists from_name text;
