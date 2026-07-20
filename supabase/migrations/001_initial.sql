-- ─────────────────────────────────────────────────
-- HINDSIGHT+ Initial Schema
-- Run in Supabase SQL Editor
-- ─────────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── profiles ─────────────────────────────────────
create table if not exists public.profiles (
  id              uuid references auth.users on delete cascade primary key,
  email           text,
  name            text,
  avatar_url      text,
  sensitivity_type text check (sensitivity_type in ('beginner','selective','comprehensive','expert')),
  onboarding_completed boolean default false,
  created_at      timestamptz default now()
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── sensitivity_answers ───────────────────────────
create table if not exists public.sensitivity_answers (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  question_id int  not null,
  answer      int  not null check (answer between 1 and 3),
  created_at  timestamptz default now()
);

-- ── scan_history ──────────────────────────────────
create table if not exists public.scan_history (
  id           uuid default uuid_generate_v4() primary key,
  user_id      uuid references public.profiles(id) on delete cascade not null,
  barcode      text not null,
  product_name text,
  score        int  check (score between 1 and 100),
  scanned_at   timestamptz default now()
);

-- ── bookmarks ────────────────────────────────────
create table if not exists public.bookmarks (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references public.profiles(id) on delete cascade not null,
  product_barcode  text not null,
  category         text,
  created_at       timestamptz default now(),
  unique(user_id, product_barcode)
);

-- ── community_posts ───────────────────────────────
create table if not exists public.community_posts (
  id          uuid default uuid_generate_v4() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  title       text not null,
  content     text not null,
  category    text,
  likes_count int  default 0,
  created_at  timestamptz default now()
);

-- ── community_comments ────────────────────────────
create table if not exists public.community_comments (
  id         uuid default uuid_generate_v4() primary key,
  post_id    uuid references public.community_posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Row Level Security ────────────────────────────
alter table public.profiles          enable row level security;
alter table public.sensitivity_answers enable row level security;
alter table public.scan_history      enable row level security;
alter table public.bookmarks         enable row level security;
alter table public.community_posts   enable row level security;
alter table public.community_comments enable row level security;

-- profiles: users can read/update their own
create policy "profiles_select" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- sensitivity_answers: own rows only
create policy "sa_all" on public.sensitivity_answers for all using (auth.uid() = user_id);

-- scan_history: own rows only
create policy "sh_all" on public.scan_history for all using (auth.uid() = user_id);

-- bookmarks: own rows only
create policy "bm_all" on public.bookmarks for all using (auth.uid() = user_id);

-- community_posts: anyone can read, owners can write
create policy "posts_select" on public.community_posts for select using (true);
create policy "posts_insert" on public.community_posts for insert with check (auth.uid() = user_id);
create policy "posts_update" on public.community_posts for update using (auth.uid() = user_id);
create policy "posts_delete" on public.community_posts for delete using (auth.uid() = user_id);

-- community_comments: anyone can read, owners can write
create policy "comments_select" on public.community_comments for select using (true);
create policy "comments_insert" on public.community_comments for insert with check (auth.uid() = user_id);
create policy "comments_delete" on public.community_comments for delete using (auth.uid() = user_id);
