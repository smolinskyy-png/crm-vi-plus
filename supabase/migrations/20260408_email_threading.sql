-- Add threading headers so we can group emails into Outlook-style conversations.
alter table public.emails
  add column if not exists in_reply_to text,
  add column if not exists "references" text[];

create index if not exists emails_message_id_idx on public.emails (message_id);
create index if not exists emails_in_reply_to_idx on public.emails (in_reply_to);
