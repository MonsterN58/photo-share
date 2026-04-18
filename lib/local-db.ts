import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Album, Comment, LocalUser, Notification, Photo, Portfolio, Profile } from "@/types";

const PAGE_SIZE = 30;
const DEFAULT_DB_PATH = path.join(process.cwd(), "data", "photoshare.sqlite");

let db: Database.Database | null = null;
let dbPathCache: string | null = null;

type PhotoRow = Omit<Photo, "is_public" | "allow_download" | "profiles" | "albums"> & {
  is_public: number;
  allow_download: number;
  profile_id: string | null;
  profile_username: string | null;
  profile_avatar_url: string | null;
  profile_bio: string | null;
  profile_created_at: string | null;
  album_name: string | null;
  album_description: string | null;
  album_created_at: string | null;
};

type CommentRow = Omit<Comment, "profiles"> & {
  profile_id: string | null;
  profile_username: string | null;
  profile_avatar_url: string | null;
  profile_bio: string | null;
  profile_created_at: string | null;
};

function getDbPath() {
  const configuredPath = process.env.LOCAL_DATABASE_PATH?.trim() || DEFAULT_DB_PATH;
  const storageMode = process.env.STORAGE_MODE?.trim().toLowerCase() || "gitee";
  const parsed = path.parse(configuredPath);
  const safeMode =
    storageMode === "github" || storageMode === "local" || storageMode === "gitee"
      ? storageMode
      : "gitee";

  return path.join(parsed.dir, `${parsed.name}-${safeMode}${parsed.ext || ".sqlite"}`);
}

export function getDb() {
  const dbPath = getDbPath();
  if (db && dbPathCache === dbPath) return db;

  if (db && dbPathCache !== dbPath) {
    db.close();
    db = null;
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  dbPathCache = dbPath;
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    create table if not exists users (
      id text primary key,
      email text not null unique,
      password_hash text not null,
      created_at text not null default (datetime('now'))
    );

    create table if not exists sessions (
      id text primary key,
      user_id text not null references users(id) on delete cascade,
      expires_at text not null,
      created_at text not null default (datetime('now'))
    );

    create table if not exists profiles (
      id text primary key references users(id) on delete cascade,
      username text not null,
      avatar_url text,
      bio text,
      created_at text not null default (datetime('now'))
    );

    create table if not exists albums (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      name text not null,
      description text,
      created_at text not null default (datetime('now'))
    );

    create table if not exists photos (
      id text primary key,
      url text not null,
      title text not null,
      description text,
      user_id text not null references profiles(id) on delete cascade,
      album_id text references albums(id) on delete set null,
      is_public integer not null default 1,
      allow_download integer not null default 1,
      width integer not null default 0,
      height integer not null default 0,
      views integer not null default 0,
      likes integer not null default 0,
      created_at text not null default (datetime('now'))
    );

    create table if not exists comments (
      id text primary key,
      photo_id text not null references photos(id) on delete cascade,
      user_id text not null references profiles(id) on delete cascade,
      content text not null,
      parent_id text references comments(id) on delete cascade,
      likes integer not null default 0,
      created_at text not null default (datetime('now'))
    );

    create table if not exists photo_likes (
      photo_id text not null references photos(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      created_at text not null default (datetime('now')),
      primary key (photo_id, user_id)
    );

    create table if not exists comment_likes (
      comment_id text not null references comments(id) on delete cascade,
      user_id text not null references users(id) on delete cascade,
      created_at text not null default (datetime('now')),
      primary key (comment_id, user_id)
    );

    create index if not exists idx_sessions_user_id on sessions(user_id);
    create index if not exists idx_photos_user_id on photos(user_id);
    create index if not exists idx_photos_public_created on photos(is_public, created_at desc);
    create index if not exists idx_photos_popular on photos(likes desc, views desc);
    create index if not exists idx_photos_album_id on photos(album_id);
    create index if not exists idx_comments_photo_id on comments(photo_id);
    create index if not exists idx_comments_parent_id on comments(parent_id);
    create index if not exists idx_albums_user_id on albums(user_id);
  `);

  // Additional migrations for portfolios, notifications, and profile cover
  database.exec(`
    create table if not exists portfolios (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      album_id text not null references albums(id) on delete cascade,
      title text not null,
      description text,
      cover_url text,
      is_public integer not null default 1,
      created_at text not null default (datetime('now'))
    );

    create table if not exists notifications (
      id text primary key,
      user_id text not null references profiles(id) on delete cascade,
      type text not null,
      from_user_id text not null references profiles(id) on delete cascade,
      photo_id text not null references photos(id) on delete cascade,
      comment_id text references comments(id) on delete cascade,
      is_read integer not null default 0,
      created_at text not null default (datetime('now'))
    );

    create index if not exists idx_portfolios_user_id on portfolios(user_id);
    create index if not exists idx_portfolios_public on portfolios(is_public, created_at desc);
    create index if not exists idx_notifications_user_id on notifications(user_id, is_read);
  `);

  // Add cover_url column to profiles if not exists
  const profileCols = database.prepare("pragma table_info(profiles)").all() as { name: string }[];
  if (!profileCols.some((c) => c.name === "cover_url")) {
    database.exec("alter table profiles add column cover_url text");
  }

  // Add file_hash column to photos if not exists (for duplicate detection)
  const photoCols = database.prepare("pragma table_info(photos)").all() as { name: string }[];
  if (!photoCols.some((c) => c.name === "file_hash")) {
    database.exec("alter table photos add column file_hash text");
    database.exec("create index if not exists idx_photos_file_hash on photos(user_id, file_hash)");
  }

  // Short links table for URL shortening
  database.exec(`
    create table if not exists short_links (
      code text primary key,
      photo_id text not null references photos(id) on delete cascade,
      created_at text not null default (datetime('now'))
    );
  `);
}

function nowIso() {
  return new Date().toISOString();
}

function toProfile(row: PhotoRow | CommentRow | Profile | null | undefined): Profile | undefined {
  if (!row) return undefined;
  if ("username" in row) return row as Profile;
  if (!row.profile_id || !row.profile_username || !row.profile_created_at) return undefined;
  return {
    id: row.profile_id,
    username: row.profile_username,
    avatar_url: row.profile_avatar_url,
    bio: row.profile_bio,
    cover_url: null,
    created_at: row.profile_created_at,
  };
}

function toPhoto(row: PhotoRow): Photo {
  const album =
    row.album_id && row.album_name
      ? {
          id: row.album_id,
          user_id: row.user_id,
          name: row.album_name,
          description: row.album_description,
          created_at: row.album_created_at || row.created_at,
        }
      : null;

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    description: row.description,
    user_id: row.user_id,
    album_id: row.album_id,
    is_public: Boolean(row.is_public),
    allow_download: Boolean(row.allow_download),
    width: row.width,
    height: row.height,
    views: row.views,
    likes: row.likes,
    created_at: row.created_at,
    profiles: toProfile(row),
    albums: album,
  };
}

function toComment(row: CommentRow): Comment {
  return {
    id: row.id,
    photo_id: row.photo_id,
    user_id: row.user_id,
    content: row.content,
    parent_id: row.parent_id,
    likes: row.likes,
    created_at: row.created_at,
    profiles: toProfile(row),
  };
}

function photoSelectSql() {
  return `
    select
      p.*,
      pr.id as profile_id,
      pr.username as profile_username,
      pr.avatar_url as profile_avatar_url,
      pr.bio as profile_bio,
      pr.created_at as profile_created_at,
      a.name as album_name,
      a.description as album_description,
      a.created_at as album_created_at
    from photos p
    left join profiles pr on pr.id = p.user_id
    left join albums a on a.id = p.album_id
  `;
}

function orderBy(sort: string) {
  return sort === "popular"
    ? "order by p.likes desc, p.views desc, p.created_at desc"
    : "order by p.created_at desc";
}

export function createUser(email: string, passwordHash: string, username: string) {
  const database = getDb();
  const id = randomUUID();
  const createdAt = nowIso();

  database
    .prepare("insert into users (id, email, password_hash, created_at) values (?, ?, ?, ?)")
    .run(id, email.toLowerCase(), passwordHash, createdAt);
  database
    .prepare(
      "insert into profiles (id, username, avatar_url, bio, created_at) values (?, ?, null, null, ?)"
    )
    .run(id, username, createdAt);

  return getUserById(id)!;
}

export function getUserByEmail(email: string) {
  return getDb()
    .prepare("select id, email, password_hash as passwordHash, created_at as created_at from users where email = ?")
    .get(email.toLowerCase()) as (LocalUser & { passwordHash: string }) | undefined;
}

export function getUserById(id: string) {
  return getDb()
    .prepare("select id, email, created_at as created_at from users where id = ?")
    .get(id) as LocalUser | undefined;
}

export function getProfile(userId: string) {
  return getDb().prepare("select * from profiles where id = ?").get(userId) as Profile | undefined;
}

export function upsertSession(sessionId: string, userId: string, expiresAt: Date) {
  getDb()
    .prepare(
      "insert or replace into sessions (id, user_id, expires_at, created_at) values (?, ?, ?, ?)"
    )
    .run(sessionId, userId, expiresAt.toISOString(), nowIso());
}

export function deleteSession(sessionId: string) {
  getDb().prepare("delete from sessions where id = ?").run(sessionId);
}

export function getUserBySession(sessionId: string) {
  const row = getDb()
    .prepare(
      `select u.id, u.email, u.created_at
       from sessions s
       join users u on u.id = s.user_id
       where s.id = ? and s.expires_at > ?`
    )
    .get(sessionId, nowIso()) as LocalUser | undefined;
  return row;
}

const PUBLIC_PHOTO_CONDITION = "p.is_public = 1";

export function getPublicPhotos(sort: string, page?: number, currentUserId?: string | null) {
  const sql =
    typeof page === "number"
      ? `${photoSelectSql()} where ${PUBLIC_PHOTO_CONDITION} ${orderBy(sort)} limit ? offset ?`
      : `${photoSelectSql()} where ${PUBLIC_PHOTO_CONDITION} ${orderBy(sort)}`;
  const rows = (typeof page === "number"
    ? getDb().prepare(sql).all(PAGE_SIZE, page * PAGE_SIZE)
    : getDb().prepare(sql).all()) as PhotoRow[];
  return withLikeState(rows.map(toPhoto), currentUserId);
}

export function searchPublicPhotos(
  query: string,
  sort: string,
  page = 0,
  currentUserId?: string | null
) {
  const q = `%${query.trim().toLowerCase()}%`;
  const rows = getDb()
    .prepare(
      `${photoSelectSql()}
       where ${PUBLIC_PHOTO_CONDITION}
         and (
           lower(p.title) like ?
           or lower(coalesce(p.description, '')) like ?
           or lower(coalesce(pr.username, '')) like ?
         )
       ${orderBy(sort)}
       limit ? offset ?`
    )
    .all(q, q, q, PAGE_SIZE, page * PAGE_SIZE) as PhotoRow[];
  return withLikeState(rows.map(toPhoto), currentUserId);
}

export function getUserPhotos(userId: string) {
  const rows = getDb()
    .prepare(`${photoSelectSql()} where p.user_id = ? order by p.created_at desc`)
    .all(userId) as PhotoRow[];
  return rows.map(toPhoto);
}

export function getPhotoById(id: string) {
  const row = getDb()
    .prepare(`${photoSelectSql()} where p.id = ?`)
    .get(id) as PhotoRow | undefined;
  return row ? toPhoto(row) : null;
}

export function getPhotoMetadata(id: string) {
  return getDb()
    .prepare("select title, description from photos where id = ?")
    .get(id) as Pick<Photo, "title" | "description"> | undefined;
}

export function getPhotoByFileHash(userId: string, fileHash: string) {
  return getDb()
    .prepare("select id, title from photos where user_id = ? and file_hash = ? limit 1")
    .get(userId, fileHash) as { id: string; title: string } | undefined;
}

export function insertPhoto(input: {
  url: string;
  title: string;
  description: string | null;
  userId: string;
  isPublic: boolean;
  allowDownload: boolean;
  width: number;
  height: number;
  fileHash?: string;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into photos
       (id, url, title, description, user_id, is_public, allow_download, width, height, file_hash, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.url,
      input.title,
      input.description,
      input.userId,
      input.isPublic ? 1 : 0,
      input.allowDownload ? 1 : 0,
      input.width,
      input.height,
      input.fileHash || null,
      nowIso()
    );
  return getPhotoById(id)!;
}

export function deletePhotoByOwner(photoId: string, userId: string) {
  return getDb()
    .prepare("delete from photos where id = ? and user_id = ?")
    .run(photoId, userId).changes;
}

export function updatePhotoByOwner(
  photoId: string,
  userId: string,
  input: { title: string; description: string | null; isPublic: boolean; allowDownload: boolean }
) {
  return getDb()
    .prepare(
      `update photos
       set title = ?, description = ?, is_public = ?, allow_download = ?
       where id = ? and user_id = ?`
    )
    .run(
      input.title,
      input.description,
      input.isPublic ? 1 : 0,
      input.allowDownload ? 1 : 0,
      photoId,
      userId
    ).changes;
}

export function incrementViews(photoId: string) {
  getDb().prepare("update photos set views = views + 1 where id = ?").run(photoId);
}

export function likePhotoOnce(photoId: string, userId: string) {
  const database = getDb();
  const result = database
    .prepare("insert or ignore into photo_likes (photo_id, user_id, created_at) values (?, ?, ?)")
    .run(photoId, userId, nowIso());
  if (result.changes === 0) return false;
  database.prepare("update photos set likes = likes + 1 where id = ?").run(photoId);
  return true;
}

export function unlikePhotoOnce(photoId: string, userId: string) {
  const database = getDb();
  const result = database
    .prepare("delete from photo_likes where photo_id = ? and user_id = ?")
    .run(photoId, userId);
  if (result.changes === 0) return false;
  database.prepare("update photos set likes = max(0, likes - 1) where id = ?").run(photoId);
  return true;
}

export function getLikedPhotoIds(userId: string, photoIds: string[]) {
  if (photoIds.length === 0) return new Set<string>();
  const placeholders = photoIds.map(() => "?").join(",");
  const rows = getDb()
    .prepare(
      `select photo_id from photo_likes where user_id = ? and photo_id in (${placeholders})`
    )
    .all(userId, ...photoIds) as { photo_id: string }[];
  return new Set(rows.map((row) => row.photo_id));
}

export function withLikeState(photos: Photo[], userId?: string | null) {
  if (!userId || photos.length === 0) return photos;
  const likedIds = getLikedPhotoIds(
    userId,
    photos.map((photo) => photo.id)
  );
  return photos.map((photo) => ({ ...photo, has_liked: likedIds.has(photo.id) }));
}

export function deletePhotosByOwner(photoIds: string[], userId: string) {
  if (photoIds.length === 0) return 0;
  const placeholders = photoIds.map(() => "?").join(",");
  return getDb()
    .prepare(`delete from photos where user_id = ? and id in (${placeholders})`)
    .run(userId, ...photoIds).changes;
}

export function updateProfileAvatar(userId: string, avatarUrl: string) {
  return getDb()
    .prepare("update profiles set avatar_url = ? where id = ?")
    .run(avatarUrl, userId).changes;
}

export function getCommentsForPhoto(photoId: string) {
  const rows = getDb()
    .prepare(
      `select
         c.*,
         pr.id as profile_id,
         pr.username as profile_username,
         pr.avatar_url as profile_avatar_url,
         pr.bio as profile_bio,
         pr.created_at as profile_created_at
       from comments c
       left join profiles pr on pr.id = c.user_id
       where c.photo_id = ?
       order by c.created_at asc`
    )
    .all(photoId) as CommentRow[];
  return rows.map(toComment);
}

export function insertComment(input: {
  photoId: string;
  userId: string;
  content: string;
  parentId: string | null;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into comments (id, photo_id, user_id, content, parent_id, created_at)
       values (?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.photoId, input.userId, input.content, input.parentId, nowIso());
  return id;
}

export function getComment(commentId: string) {
  return getDb()
    .prepare("select id, photo_id, user_id from comments where id = ?")
    .get(commentId) as Pick<Comment, "id" | "photo_id" | "user_id"> | undefined;
}

export function deleteCommentByOwner(commentId: string, userId: string) {
  return getDb()
    .prepare("delete from comments where id = ? and user_id = ?")
    .run(commentId, userId).changes;
}

export function likeCommentOnce(commentId: string, userId: string) {
  const database = getDb();
  const result = database
    .prepare("insert or ignore into comment_likes (comment_id, user_id, created_at) values (?, ?, ?)")
    .run(commentId, userId, nowIso());
  if (result.changes === 0) return false;
  database.prepare("update comments set likes = likes + 1 where id = ?").run(commentId);
  return true;
}

export function unlikeCommentOnce(commentId: string, userId: string) {
  const database = getDb();
  const result = database
    .prepare("delete from comment_likes where comment_id = ? and user_id = ?")
    .run(commentId, userId);
  if (result.changes === 0) return false;
  database.prepare("update comments set likes = max(0, likes - 1) where id = ?").run(commentId);
  return true;
}

export function getAlbumsForUser(userId: string) {
  return getDb()
    .prepare("select * from albums where user_id = ? order by created_at desc")
    .all(userId) as Album[];
}

export function insertAlbum(userId: string, name: string, description: string | null) {
  const id = randomUUID();
  getDb()
    .prepare(
      "insert into albums (id, user_id, name, description, created_at) values (?, ?, ?, ?, ?)"
    )
    .run(id, userId, name, description, nowIso());
  return getDb().prepare("select * from albums where id = ?").get(id) as Album;
}

export function deleteAlbumByOwner(albumId: string, userId: string) {
  return getDb()
    .prepare("delete from albums where id = ? and user_id = ?")
    .run(albumId, userId).changes;
}

export function getAlbumByOwner(albumId: string, userId: string) {
  return getDb()
    .prepare("select id from albums where id = ? and user_id = ?")
    .get(albumId, userId) as { id: string } | undefined;
}

export function assignPhotosToAlbumByOwner(photoIds: string[], albumId: string | null, userId: string) {
  if (photoIds.length === 0) return 0;
  const placeholders = photoIds.map(() => "?").join(",");
  return getDb()
    .prepare(
      `update photos set album_id = ? where user_id = ? and id in (${placeholders})`
    )
    .run(albumId, userId, ...photoIds).changes;
}

// ============ Portfolio functions ============

export function insertPortfolio(input: {
  userId: string;
  albumId: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  isPublic: boolean;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `insert into portfolios (id, user_id, album_id, title, description, cover_url, is_public, created_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.userId, input.albumId, input.title, input.description, input.coverUrl, input.isPublic ? 1 : 0, nowIso());
  return id;
}

export function getPortfolioById(id: string) {
  return getDb()
    .prepare(
      `select p.*, pr.id as profile_id, pr.username as profile_username, pr.avatar_url as profile_avatar_url, pr.bio as profile_bio, pr.created_at as profile_created_at
       from portfolios p
       left join profiles pr on pr.id = p.user_id
       where p.id = ?`
    )
    .get(id) as (Omit<Portfolio, 'is_public'> & { profile_id: string; profile_username: string; profile_avatar_url: string | null; profile_bio: string | null; profile_created_at: string; is_public: number }) | undefined;
}

export function getPublicPortfolios(page = 0) {
  const rows = getDb()
    .prepare(
      `select
         p.*,
         pr.id as profile_id,
         pr.username as profile_username,
         pr.avatar_url as profile_avatar_url,
         pr.bio as profile_bio,
         pr.created_at as profile_created_at,
         a.name as album_name,
         a.description as album_description,
         (select count(*) from photos ph where ph.album_id = p.album_id and ph.is_public = 1) as photo_count,
         coalesce((select sum(ph.views) from photos ph where ph.album_id = p.album_id and ph.is_public = 1), 0) as total_views,
         coalesce((select sum(ph.likes) from photos ph where ph.album_id = p.album_id and ph.is_public = 1), 0) as total_likes
       from portfolios p
       left join profiles pr on pr.id = p.user_id
       left join albums a on a.id = p.album_id
       where p.is_public = 1
       order by p.created_at desc
       limit ? offset ?`
    )
    .all(PAGE_SIZE, page * PAGE_SIZE) as any[];
  return rows.map(toPortfolio);
}

export function getPortfoliosForUser(userId: string) {
  const rows = getDb()
    .prepare(
      `select
         p.*,
         pr.id as profile_id,
         pr.username as profile_username,
         pr.avatar_url as profile_avatar_url,
         pr.bio as profile_bio,
         pr.created_at as profile_created_at,
         a.name as album_name,
         a.description as album_description,
         (select count(*) from photos ph where ph.album_id = p.album_id) as photo_count,
         coalesce((select sum(ph.views) from photos ph where ph.album_id = p.album_id), 0) as total_views,
         coalesce((select sum(ph.likes) from photos ph where ph.album_id = p.album_id), 0) as total_likes
       from portfolios p
       left join profiles pr on pr.id = p.user_id
       left join albums a on a.id = p.album_id
       where p.user_id = ?
       order by p.created_at desc`
    )
    .all(userId) as any[];
  return rows.map(toPortfolio);
}

export function deletePortfolioByOwner(portfolioId: string, userId: string) {
  return getDb()
    .prepare("delete from portfolios where id = ? and user_id = ?")
    .run(portfolioId, userId).changes;
}

export function updatePortfolioCoverByOwner(portfolioId: string, userId: string, coverUrl: string) {
  return getDb()
    .prepare("update portfolios set cover_url = ? where id = ? and user_id = ?")
    .run(coverUrl, portfolioId, userId).changes;
}

export function getPortfolioByAlbum(albumId: string) {
  return getDb()
    .prepare("select id from portfolios where album_id = ?")
    .get(albumId) as { id: string } | undefined;
}

function toPortfolio(row: any): Portfolio {
  return {
    id: row.id,
    user_id: row.user_id,
    album_id: row.album_id,
    title: row.title,
    description: row.description,
    cover_url: row.cover_url,
    is_public: Boolean(row.is_public),
    created_at: row.created_at,
    profiles: row.profile_id
      ? {
          id: row.profile_id,
          username: row.profile_username,
          avatar_url: row.profile_avatar_url,
          bio: row.profile_bio,
          cover_url: null,
          created_at: row.profile_created_at,
        }
      : undefined,
    albums: row.album_name
      ? { id: row.album_id, user_id: row.user_id, name: row.album_name, description: row.album_description, created_at: row.created_at }
      : undefined,
    total_views: row.total_views || 0,
    total_likes: row.total_likes || 0,
    photo_count: row.photo_count || 0,
  };
}

// ============ Notification functions ============

export function insertNotification(input: {
  userId: string;
  type: "like" | "comment";
  fromUserId: string;
  photoId: string;
  commentId: string | null;
}) {
  // Don't notify yourself
  if (input.userId === input.fromUserId) return;
  const database = getDb();
  if (input.type === "like") {
    const existing = database
      .prepare(
        `select id from notifications
         where user_id = ? and type = 'like' and from_user_id = ? and photo_id = ? and comment_id is null
         limit 1`
      )
      .get(input.userId, input.fromUserId, input.photoId);
    if (existing) return;
  }

  const id = randomUUID();
  database
    .prepare(
      `insert into notifications (id, user_id, type, from_user_id, photo_id, comment_id, created_at)
       values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.userId, input.type, input.fromUserId, input.photoId, input.commentId, nowIso());
}

export function getNotificationsForUser(userId: string, unreadOnly = false) {
  const whereClause = unreadOnly
    ? "where n.user_id = ? and n.is_read = 0"
    : "where n.user_id = ?";
  return getDb()
    .prepare(
      `select
         n.*,
         pr.username as from_username,
         pr.avatar_url as from_avatar_url,
         ph.title as photo_title,
         c.content as comment_content
       from notifications n
       left join profiles pr on pr.id = n.from_user_id
       left join photos ph on ph.id = n.photo_id
       left join comments c on c.id = n.comment_id
       ${whereClause}
       order by n.created_at desc
       limit 50`
    )
    .all(userId) as any[];
}

export function getUnreadNotificationCount(userId: string) {
  const row = getDb()
    .prepare("select count(*) as count from notifications where user_id = ? and is_read = 0")
    .get(userId) as { count: number };
  return row.count;
}

export function markNotificationsRead(userId: string, notificationIds?: string[]) {
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => "?").join(",");
    getDb()
      .prepare(`update notifications set is_read = 1 where user_id = ? and id in (${placeholders})`)
      .run(userId, ...notificationIds);
  } else {
    getDb()
      .prepare("update notifications set is_read = 1 where user_id = ?")
      .run(userId);
  }
}

export function deleteNotifications(userId: string, notificationIds?: string[]) {
  if (notificationIds && notificationIds.length > 0) {
    const placeholders = notificationIds.map(() => "?").join(",");
    getDb()
      .prepare(`delete from notifications where user_id = ? and id in (${placeholders})`)
      .run(userId, ...notificationIds);
  } else {
    getDb()
      .prepare("delete from notifications where user_id = ?")
      .run(userId);
  }
}

// ============ Profile extended functions ============

export function getUserStats(userId: string) {
  const row = getDb()
    .prepare(
      `select
         coalesce(sum(views), 0) as total_views,
         coalesce(sum(likes), 0) as total_likes
       from photos where user_id = ?`
    )
    .get(userId) as { total_views: number; total_likes: number };
  return row;
}

export function getPublicPhotosForUser(userId: string, page?: number) {
  const sql =
    typeof page === "number"
      ? `${photoSelectSql()} where p.user_id = ? and ${PUBLIC_PHOTO_CONDITION} order by p.created_at desc limit ? offset ?`
      : `${photoSelectSql()} where p.user_id = ? and ${PUBLIC_PHOTO_CONDITION} order by p.created_at desc`;
  const rows = (typeof page === "number"
    ? getDb().prepare(sql).all(userId, PAGE_SIZE, page * PAGE_SIZE)
    : getDb().prepare(sql).all(userId)) as PhotoRow[];
  return rows.map(toPhoto);
}

export function updateProfile(userId: string, updates: { username?: string; bio?: string | null; cover_url?: string | null }) {
  const sets: string[] = [];
  const values: any[] = [];
  if (updates.username !== undefined) {
    sets.push("username = ?");
    values.push(updates.username);
  }
  if (updates.bio !== undefined) {
    sets.push("bio = ?");
    values.push(updates.bio);
  }
  if (updates.cover_url !== undefined) {
    sets.push("cover_url = ?");
    values.push(updates.cover_url);
  }
  if (sets.length === 0) return 0;
  values.push(userId);
  return getDb()
    .prepare(`update profiles set ${sets.join(", ")} where id = ?`)
    .run(...values).changes;
}

// ─── Short links ────────────────────────────────────────────────────────────

function generateCode(len = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < len; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Returns an existing short code for the photo or creates a new one. */
export function getOrCreateShortLink(photoId: string): string {
  const db = getDb();
  const existing = db.prepare("select code from short_links where photo_id = ?").get(photoId) as { code: string } | undefined;
  if (existing) return existing.code;

  // Try to insert a unique code (retry on collision)
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateCode(7);
    try {
      db.prepare("insert into short_links (code, photo_id) values (?, ?)").run(code, photoId);
      return code;
    } catch {
      // UNIQUE constraint failed — retry
    }
  }
  // Fallback: use first 10 chars of photoId (no dashes)
  return photoId.replace(/-/g, "").slice(0, 10);
}

/** Resolves a short code to a photo ID. Returns null if not found. */
export function getPhotoIdByShortCode(code: string): string | null {
  const row = getDb().prepare("select photo_id from short_links where code = ?").get(code) as { photo_id: string } | undefined;
  return row ? row.photo_id : null;
}
