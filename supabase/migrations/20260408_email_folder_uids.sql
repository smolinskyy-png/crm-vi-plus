-- Add per-folder UID watermarks so syncs of Sent/Drafts/Archive/Spam/Trash
-- can track progress independently of the legacy INBOX-only `last_uid`.
alter table public.email_accounts
  add column if not exists folder_uids jsonb not null default '{}'::jsonb;
