-- ─────────────────────────────────────────────────────────────────────────────
-- HINDSIGHT+ — product_reviews table
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.product_reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_barcode text not null,
  rating          smallint not null check (rating between 1 and 5),
  title           text not null check (char_length(title) between 1 and 80),
  content         text not null check (char_length(content) between 1 and 500),
  helpful_count   integer not null default 0,
  created_at      timestamptz not null default now()
);

-- Index for fast lookups by barcode
create index if not exists product_reviews_barcode_idx
  on public.product_reviews (product_barcode);

-- Index for lookups by user
create index if not exists product_reviews_user_idx
  on public.product_reviews (user_id);

-- One review per user per product
create unique index if not exists product_reviews_unique_user_barcode
  on public.product_reviews (user_id, product_barcode);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.product_reviews enable row level security;

-- Anyone can read reviews
create policy "Public read"
  on public.product_reviews for select
  using (true);

-- Authenticated users can insert their own review
create policy "Authenticated insert"
  on public.product_reviews for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Users can update only their own reviews
create policy "Own update"
  on public.product_reviews for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can delete only their own reviews
create policy "Own delete"
  on public.product_reviews for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── helpful_count increment (optional RPC) ────────────────────────────────────
create or replace function public.increment_helpful(review_id uuid)
returns void language sql security definer as $$
  update public.product_reviews
  set helpful_count = helpful_count + 1
  where id = review_id;
$$;
