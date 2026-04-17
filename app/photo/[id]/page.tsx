import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/comment/comment-section";
import { ProtectedPhotoViewer } from "@/components/photo/protected-photo-viewer";
import { ShareButton } from "@/components/photo/share-button";
import { PhotoActions } from "@/components/photo/photo-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { siteConfig } from "@/lib/site-config";
import { Eye, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { Photo, Comment } from "@/types";
import { PhotoDetailClient } from "./client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("photos")
    .select("title, description")
    .eq("id", id)
    .single();

  return {
    title: data?.title ? `${data.title} - NKU印象` : "NKU印象",
    description: data?.description || "记录与分享南开校园印象",
  };
}

export default async function PhotoDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("*, profiles(*)")
    .eq("id", id)
    .single();

  if (!photo) notFound();

  const typedPhoto = photo as Photo;

  const { data: { user } } = await supabase.auth.getUser();

  let hasLiked = false;
  if (user) {
    const { data: likeRow } = await supabase
      .from("photo_likes")
      .select("photo_id")
      .eq("photo_id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    hasLiked = !!likeRow;
  }

  const { data: comments } = await supabase
    .from("comments")
    .select("*, profiles(*)")
    .eq("photo_id", id)
    .order("created_at", { ascending: true });

  const typedComments = (comments as Comment[]) || [];

  return (
    <>
      <PhotoDetailClient photoId={id} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* 左侧图片区域 */}
          <div className="lg:col-span-3">
            <ProtectedPhotoViewer
              url={typedPhoto.url}
              title={typedPhoto.title}
              width={typedPhoto.width}
              height={typedPhoto.height}
              antiScreenshotEnabled={siteConfig.antiScreenshotEnabled}
            />
          </div>

          {/* 右侧信息区域 */}
          <div className="lg:col-span-2 space-y-5">
            {/* 作者 */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 overflow-hidden">
                {typedPhoto.profiles?.avatar_url ? (
                  <AvatarImage
                    src={typedPhoto.profiles.avatar_url}
                    alt={typedPhoto.profiles?.username || "头像"}
                  />
                ) : null}
                <AvatarFallback className="bg-gray-900 text-white text-sm">
                  {(typedPhoto.profiles?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {typedPhoto.profiles?.username || "匿名用户"}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(typedPhoto.created_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </p>
              </div>
            </div>

            {/* 标题描述 */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">
                {typedPhoto.title}
              </h1>
              {typedPhoto.description && (
                <p className="text-sm text-gray-500 leading-relaxed">
                  {typedPhoto.description}
                </p>
              )}
            </div>

            {/* 数据统计 */}
            <div className="flex items-center gap-5 text-sm text-gray-400 border-y border-gray-100 py-4">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{typedPhoto.views} 浏览</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Heart className="h-4 w-4" />
                <span>{typedPhoto.likes || 0} 点赞</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-wrap gap-2">
              <PhotoActions
                photoId={id}
                title={typedPhoto.title}
                likes={typedPhoto.likes || 0}
                allowDownload={typedPhoto.allow_download !== false}
                hasLiked={hasLiked}
              />
              <ShareButton photoId={id} title={typedPhoto.title} />
            </div>

            <div className="border-t border-gray-100" />

            {/* 评论 */}
            <CommentSection photoId={id} initialComments={typedComments} />
          </div>
        </div>
      </div>
    </>
  );
}
