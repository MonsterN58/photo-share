export interface Photo {
  id: string;
  url: string;
  title: string;
  description: string | null;
  user_id: string;
  album_id: string | null;
  is_public: boolean;
  allow_download: boolean;
  width: number;
  height: number;
  views: number;
  likes: number;
  created_at: string;
  // joined
  profiles?: Profile;
  albums?: Album | null;
  comment_count?: number;
  has_liked?: boolean;
}

export interface Album {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  photo_count?: number;
}

export interface Comment {
  id: string;
  photo_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  likes: number;
  created_at: string;
  // joined
  profiles?: Profile;
  replies?: Comment[];
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  cover_url: string | null;
  created_at: string;
  total_views?: number;
  total_likes?: number;
}

export interface Portfolio {
  id: string;
  user_id: string;
  album_id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  is_public: boolean;
  created_at: string;
  // joined
  profiles?: Profile;
  albums?: Album;
  total_views?: number;
  total_likes?: number;
  photo_count?: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "like" | "comment";
  from_user_id: string;
  photo_id: string;
  comment_id: string | null;
  is_read: boolean;
  created_at: string;
  // joined
  from_profile?: Profile;
  photo_title?: string;
  comment_content?: string;
}

export interface LocalUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    username?: string;
  };
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export type SortOption = "latest" | "popular";
export type FilterOption = "all" | "public" | "mine";
