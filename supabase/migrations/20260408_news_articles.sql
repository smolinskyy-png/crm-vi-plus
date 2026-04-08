-- Persistent news / Neuigkeiten feed shared by all users
create table if not exists public.news_articles (
  id          bigserial primary key,
  title       text not null,
  category    text not null default 'intern',
  excerpt     text,
  content     text,
  image       text,
  important   boolean not null default false,
  pinned      boolean not null default false,
  author      text,
  author_id   uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists news_articles_created_at_idx
  on public.news_articles (created_at desc);

create index if not exists news_articles_pinned_idx
  on public.news_articles (pinned);
