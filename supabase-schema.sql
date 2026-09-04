-- ============================================================
-- MOOD TRACKER — SUPABASE SCHEMA (accounts + cloud sync)
--
-- HOW TO RUN (one time):
--   Supabase Dashboard → SQL Editor → New query → paste this
--   whole file → Run.  Safe to re-run (everything is idempotent).
--
-- AFTER RUNNING, for Google login also:
--   1. Authentication → Providers → Google → enable + add your
--      Google OAuth Client ID/Secret (redirect URI for the OAuth
--      client: https://pcgdhkczkyxhpybmrcuf.supabase.co/auth/v1/callback)
--   2. Authentication → URL Configuration → add your Netlify
--      domain (e.g. https://YOUR-SITE.netlify.app/**) to Redirect URLs
--      and set the Site URL to your Netlify domain.
--
-- DESIGN NOTES
-- - Each row carries client_updated_at = the device's epoch-ms
--   timestamp of the change. The app merges with LAST-WRITE-WINS
--   on that column, so offline edits sync safely.
-- - deleted = soft delete, so a delete made offline on one device
--   reaches the other devices instead of "resurrecting" the row.
-- - RLS is enabled everywhere: users can only ever touch their
--   own rows (auth.uid() = user_id).
-- ============================================================


-- ---------- 1. Helper: keep updated_at fresh ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------- 2. Tables ----------

-- User profile + app settings (language, theme, name, age,
-- interests...). Synced as one JSON blob; conflicts resolved
-- last-write-wins by client_updated_at.
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  display_name      text,
  email             text,
  settings          jsonb not null default '{}'::jsonb,
  client_updated_at bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Daily mood entries. date_key is the app's zero-padded Jalali
-- key: "jy-jm-jd" (e.g. "1403-05-12").
create table if not exists public.mood_entries (
  user_id           uuid not null references auth.users (id) on delete cascade,
  date_key          text not null,
  mood              int  not null check (mood between 1 and 5),
  note              text not null default '',
  deleted           boolean not null default false,
  client_updated_at bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, date_key)
);

-- To-do items. client_id = the offline-generated item id
-- (localStorage), so the same item keeps its identity across
-- devices.
create table if not exists public.todos (
  user_id           uuid not null references auth.users (id) on delete cascade,
  client_id         text not null,
  text              text not null,
  done              boolean not null default false,
  fav               boolean not null default false,
  deleted           boolean not null default false,
  client_updated_at bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, client_id)
);

-- Birthdays. date_iso = Gregorian ISO date "yyyy-mm-dd"
-- (the app converts the Jalali dropdowns internally).
create table if not exists public.birthdays (
  user_id           uuid not null references auth.users (id) on delete cascade,
  client_id         text not null,
  name              text not null,
  date_iso          date not null,
  deleted           boolean not null default false,
  client_updated_at bigint not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, client_id)
);

-- Daily-visit streak (one row per user).
create table if not exists public.streaks (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  last_visit_date   text,
  streak_count      int not null default 0 check (streak_count >= 0),
  client_updated_at bigint not null default 0,
  updated_at        timestamptz not null default now()
);

-- ---------- 3. updated_at triggers ----------
drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_mood_entries_updated on public.mood_entries;
create trigger trg_mood_entries_updated
  before update on public.mood_entries
  for each row execute function public.set_updated_at();

drop trigger if exists trg_todos_updated on public.todos;
create trigger trg_todos_updated
  before update on public.todos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_birthdays_updated on public.birthdays;
create trigger trg_birthdays_updated
  before update on public.birthdays
  for each row execute function public.set_updated_at();

drop trigger if exists trg_streaks_updated on public.streaks;
create trigger trg_streaks_updated
  before update on public.streaks
  for each row execute function public.set_updated_at();


-- ---------- 4. Auto-create the profile row on signup ----------
-- Fills display_name from the Google profile name when available,
-- otherwise from the email prefix.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 5. Row Level Security ----------
-- Every table: a user may only read/write rows where
-- auth.uid() matches. No anon access at all.

alter table public.profiles     enable row level security;
alter table public.mood_entries enable row level security;
alter table public.todos        enable row level security;
alter table public.birthdays    enable row level security;
alter table public.streaks      enable row level security;

-- ----- profiles (key column: id) -----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = id);

-- ----- mood_entries -----
drop policy if exists "mood_select_own" on public.mood_entries;
create policy "mood_select_own" on public.mood_entries
  for select using (auth.uid() = user_id);

drop policy if exists "mood_insert_own" on public.mood_entries;
create policy "mood_insert_own" on public.mood_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "mood_update_own" on public.mood_entries;
create policy "mood_update_own" on public.mood_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "mood_delete_own" on public.mood_entries;
create policy "mood_delete_own" on public.mood_entries
  for delete using (auth.uid() = user_id);

-- ----- todos -----
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

-- ----- birthdays -----
drop policy if exists "bday_select_own" on public.birthdays;
create policy "bday_select_own" on public.birthdays
  for select using (auth.uid() = user_id);

drop policy if exists "bday_insert_own" on public.birthdays;
create policy "bday_insert_own" on public.birthdays
  for insert with check (auth.uid() = user_id);

drop policy if exists "bday_update_own" on public.birthdays;
create policy "bday_update_own" on public.birthdays
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "bday_delete_own" on public.birthdays;
create policy "bday_delete_own" on public.birthdays
  for delete using (auth.uid() = user_id);

-- ----- streaks -----
drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select using (auth.uid() = user_id);

drop policy if exists "streaks_insert_own" on public.streaks;
create policy "streaks_insert_own" on public.streaks
  for insert with check (auth.uid() = user_id);

drop policy if exists "streaks_update_own" on public.streaks;
create policy "streaks_update_own" on public.streaks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "streaks_delete_own" on public.streaks;
create policy "streaks_delete_own" on public.streaks
  for delete using (auth.uid() = user_id);


