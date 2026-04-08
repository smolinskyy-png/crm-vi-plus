-- Google Calendar OAuth token storage (per user)
create table if not exists public.google_calendar_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_email text,
  access_token text not null,
  refresh_token text not null,
  expiry_ts timestamptz not null,
  scope text,
  calendar_id text not null default 'primary',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_calendar_tokens_updated_idx on public.google_calendar_tokens (updated_at desc);

-- Let the PostgREST schema cache pick up the new table right away
notify pgrst, 'reload schema';
