alter table public.photos
  add column if not exists allow_download boolean default true not null,
  add column if not exists likes integer default 0 not null;

create index if not exists idx_photos_likes on public.photos(likes desc);

create table if not exists public.photo_likes (
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (photo_id, user_id)
);

create table if not exists public.comment_likes (
  comment_id uuid references public.comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  primary key (comment_id, user_id)
);

alter table public.photo_likes enable row level security;
alter table public.comment_likes enable row level security;

drop policy if exists "photo likes are visible" on public.photo_likes;
create policy "photo likes are visible"
  on public.photo_likes for select
  using (true);

drop policy if exists "users can like photos once" on public.photo_likes;
create policy "users can like photos once"
  on public.photo_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "comment likes are visible" on public.comment_likes;
create policy "comment likes are visible"
  on public.comment_likes for select
  using (true);

drop policy if exists "users can like comments once" on public.comment_likes;
create policy "users can like comments once"
  on public.comment_likes for insert
  with check (auth.uid() = user_id);

create or replace function public.increment_photo_likes(photo_id uuid)
returns boolean as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.photo_likes (photo_id, user_id)
  values (photo_id, current_user_id)
  on conflict do nothing;

  if not found then
    return false;
  end if;

  update public.photos
  set likes = likes + 1
  where id = photo_id;

  return true;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_photo_likes(uuid) to anon, authenticated;

create or replace function public.increment_comment_likes(comment_id uuid)
returns boolean as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  insert into public.comment_likes (comment_id, user_id)
  values (comment_id, current_user_id)
  on conflict do nothing;

  if not found then
    return false;
  end if;

  update public.comments
  set likes = likes + 1
  where id = comment_id;

  return true;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_comment_likes(uuid) to anon, authenticated;

notify pgrst, 'reload schema';
