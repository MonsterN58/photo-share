-- ============================================
-- PhotoShare 数据库建表脚本
-- 在 Supabase SQL Editor 中执行
-- ============================================

-- 1. profiles 表
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null
);

-- 2. photos 表
create table if not exists public.photos (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  title text not null,
  description text,
  user_id uuid references public.profiles(id) on delete cascade not null,
  is_public boolean default true not null,
  allow_download boolean default true not null,
  width integer default 0,
  height integer default 0,
  views integer default 0,
  likes integer default 0,
  file_hash text,
  created_at timestamptz default now() not null
);

-- 3. comments 表
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  likes integer default 0,
  created_at timestamptz default now() not null
);

-- ============================================
-- 索引
-- ============================================
create index if not exists idx_photos_user_id on public.photos(user_id);
create index if not exists idx_photos_is_public on public.photos(is_public);
create index if not exists idx_photos_created_at on public.photos(created_at desc);
create index if not exists idx_photos_likes on public.photos(likes desc);
create index if not exists idx_comments_photo_id on public.comments(photo_id);
create index if not exists idx_comments_parent_id on public.comments(parent_id);

-- ============================================
-- RLS 启用
-- ============================================
alter table public.profiles enable row level security;
alter table public.photos enable row level security;
alter table public.comments enable row level security;

-- ============================================
-- RLS 策略
-- ============================================

-- profiles 策略
create policy "任何人可查看 profiles"
  on public.profiles for select
  using (true);

create policy "用户可更新自己的 profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "用户可插入自己的 profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- photos 策略
create policy "任何人可查看公开照片"
  on public.photos for select
  using (is_public = true or auth.uid() = user_id);

create policy "登录用户可上传照片"
  on public.photos for insert
  with check (auth.uid() = user_id);

create policy "用户可更新自己的照片"
  on public.photos for update
  using (auth.uid() = user_id);

create policy "用户可删除自己的照片"
  on public.photos for delete
  using (auth.uid() = user_id);

-- comments 策略
create policy "任何人可查看评论"
  on public.comments for select
  using (true);

create policy "登录用户可发表评论"
  on public.comments for insert
  with check (auth.uid() = user_id);

create policy "用户可删除自己的评论"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ============================================
-- RPC 函数：浏览量递增
-- ============================================
create or replace function public.increment_views(photo_id uuid)
returns void as $$
begin
  update public.photos
  set views = views + 1
  where id = photo_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- RPC 函数：图片点赞递增
-- ============================================
create or replace function public.increment_photo_likes(photo_id uuid)
returns void as $$
begin
  update public.photos
  set likes = likes + 1
  where id = photo_id;
end;
$$ language plpgsql security definer;

grant execute on function public.increment_photo_likes(uuid) to anon, authenticated;

-- ============================================
-- RPC 函数：评论点赞递增
-- ============================================
create or replace function public.increment_comment_likes(comment_id uuid)
returns void as $$
begin
  update public.comments
  set likes = likes + 1
  where id = comment_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- 触发器：新用户注册时自动创建 profile
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    null,
    null
  );
  return new;
end;
$$ language plpgsql security definer;

-- 删除旧触发器（如果存在）
drop trigger if exists on_auth_user_created on auth.users;

-- 创建触发器
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Realtime 启用
-- ============================================
alter publication supabase_realtime add table public.comments;

notify pgrst, 'reload schema';

-- ============================================
-- 相册迁移
-- ============================================
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

-- ============================================
-- 点赞去重迁移：每个用户对每张图片/每条评论只能点赞一次
-- ============================================
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
