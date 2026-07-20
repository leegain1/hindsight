-- ─────────────────────────────────────────────────
-- HINDSIGHT+ Community Phase 4 Migration
-- Run in Supabase SQL Editor AFTER 001_initial.sql
-- ─────────────────────────────────────────────────

-- ── Extend community_posts ────────────────────────
alter table public.community_posts
  add column if not exists comments_count      int     default 0,
  add column if not exists fact_check_verdict  text,
  add column if not exists fact_check_color    text,
  add column if not exists fact_check_explanation text,
  add column if not exists product_barcode     text,
  add column if not exists product_name        text;

-- ── post_likes ────────────────────────────────────
create table if not exists public.post_likes (
  id         uuid default uuid_generate_v4() primary key,
  post_id    uuid references public.community_posts(id) on delete cascade not null,
  user_id    uuid references public.profiles(id)        on delete cascade not null,
  created_at timestamptz default now(),
  unique(post_id, user_id)
);

alter table public.post_likes enable row level security;
create policy "likes_select" on public.post_likes for select using (true);
create policy "likes_insert" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "likes_delete" on public.post_likes for delete using (auth.uid() = user_id);

-- ── Trigger: likes_count ──────────────────────────
create or replace function public.update_post_likes_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_posts set likes_count = likes_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.community_posts set likes_count = greatest(0, likes_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_post_like_change on public.post_likes;
create trigger on_post_like_change
  after insert or delete on public.post_likes
  for each row execute procedure public.update_post_likes_count();

-- ── Trigger: comments_count ───────────────────────
create or replace function public.update_post_comments_count()
returns trigger language plpgsql security definer as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_posts set comments_count = comments_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.community_posts set comments_count = greatest(0, comments_count - 1) where id = OLD.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists on_comment_change on public.community_comments;
create trigger on_comment_change
  after insert or delete on public.community_comments
  for each row execute procedure public.update_post_comments_count();

-- ── Fix profiles RLS: allow reading all for community ──
-- (Community posts need to show author name/sensitivity_type)
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- ── Enable Supabase Realtime for comments ─────────
-- Run this in Supabase Dashboard > Database > Replication
-- or via SQL:
alter publication supabase_realtime add table public.community_comments;
