create table if not exists public.albums (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  created_at timestamptz default now() not null
);

alter table public.photos
  add column if not exists album_id uuid references public.albums(id) on delete set null;

create index if not exists idx_albums_user_id on public.albums(user_id);
create index if not exists idx_photos_album_id on public.photos(album_id);

alter table public.albums enable row level security;

drop policy if exists "users can view own albums" on public.albums;
create policy "users can view own albums"
  on public.albums for select
  using (auth.uid() = user_id);

drop policy if exists "users can create own albums" on public.albums;
create policy "users can create own albums"
  on public.albums for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can update own albums" on public.albums;
create policy "users can update own albums"
  on public.albums for update
  using (auth.uid() = user_id);

drop policy if exists "users can delete own albums" on public.albums;
create policy "users can delete own albums"
  on public.albums for delete
  using (auth.uid() = user_id);

notify pgrst, 'reload schema';
