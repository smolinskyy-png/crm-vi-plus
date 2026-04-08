-- Per-account email signature, appended automatically in the compose view
alter table public.email_accounts
  add column if not exists signature text;
