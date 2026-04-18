import { notFound } from "next/navigation";
import Link from "next/link";
import { CommentSection } from "@/components/comment/comment-section";
import { ProtectedPhotoViewer } from "@/components/photo/protected-photo-viewer";
import { ShareButton } from "@/components/photo/share-button";
import { PhotoActions } from "@/components/photo/photo-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { siteConfig } from "@/lib/site-config";
import { Eye, Heart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { PhotoDetailClient } from "./client";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth-adapter";
import {
  getCommentsForPhotoForMode,
  getLikedPhotoIdsForMode,
  getPhotoByIdForMode,
  getPhotoMetadataForMode,
  getProfileForMode,
} from "@/lib/db-read";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const data = await getPhotoMetadataForMode(id);

  return {
    title: data?.title ? `${data.title} - NKU印象` : "NKU印象",
    description: data?.description || "记录与分享南开校园印象",
  };
}

export default async function PhotoDetailPage({ params }: Props) {
  const { id } = await params;
  const typedPhoto = await getPhotoByIdForMode(id);

  if (!typedPhoto) notFound();

  const user = await getCurrentUser();
  const hasLiked = user ? (await getLikedPhotoIdsForMode(user.id, [id])).has(id) : false;
  const initialProfile = user ? await getProfileForMode(user.id) : null;
  const typedComments = await getCommentsForPhotoForMode(id);

  return (
    <>
      <PhotoDetailClient photoId={id} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <ProtectedPhotoViewer
              url={typedPhoto.url}
              title={typedPhoto.title}
              width={typedPhoto.width}
              height={typedPhoto.height}
              antiScreenshotEnabled={siteConfig.antiScreenshotEnabled}
            />
          </div>

          <div className="lg:col-span-2 space-y-5 min-w-0">
            <Link
              href={`/user/${typedPhoto.profiles?.id || typedPhoto.user_id}`}
              className="flex items-center gap-3 group w-fit"
            >
              <Avatar className="h-10 w-10 overflow-hidden ring-2 ring-transparent group-hover:ring-gray-200 transition-all">
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
                <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {typedPhoto.profiles?.username || "匿名用户"}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(typedPhoto.created_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </p>
              </div>
            </Link>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-gray-900 leading-snug">
                {typedPhoto.title}
              </h1>
              {typedPhoto.description && (
                <p className="description-text text-sm leading-relaxed text-gray-500">
                  {typedPhoto.description}
                </p>
              )}
            </div>

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

            <CommentSection
              photoId={id}
              initialComments={typedComments}
              initialUser={user}
              initialProfile={initialProfile}
            />
          </div>
        </div>
      </div>
    </>
  );
}
