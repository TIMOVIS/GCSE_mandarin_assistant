-- Run once in the Supabase SQL editor (Dashboard > SQL Editor > New query).
-- Safe to run again: every statement is "if not exists".

-- Student profile: school year and a level per skill, e.g. {"listening": 2, "writing": 1}
alter table students add column if not exists school_year text;
alter table students add column if not exists levels jsonb not null default '{}'::jsonb;

-- Word bank: words and phrases the tutor uploads, with GCSE tags
create table if not exists word_bank (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid,
  word text not null,
  pinyin text not null default '',
  meaning text not null default '',
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- The app talks to Supabase with the public (anon) key, like the existing
-- lessons and vocab tables, so the word bank needs to be readable and
-- writable by that key.
grant select, insert, update, delete on word_bank to anon, authenticated;
