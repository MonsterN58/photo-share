import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import { CommentSection } from "@/components/comment/comment-section";
import { ShareButton } from "@/components/photo/share-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Eye } from "lucide-react";
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
  const { data } = await supabase.from("photos").select("title, description").eq("id", id).single();
  return {
    title: data?.title ? `${data.title} - PhotoShare` : "PhotoShare",
    description: data?.description || "一个优雅的照片分享社区",
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

  // 获取评论
  const { data: comments } = await supabase
    .from("comments")
    .select("*, profiles(*)")
    .eq("photo_id", id)
    .order("created_at", { ascending: true });

  const typedComments = (comments as Comment[]) || [];

  return (
    <>
      <PhotoDetailClient photoId={id} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 大图展示 */}
          <div className="lg:col-span-2">
            <div className="relative rounded-xl overflow-hidden bg-gray-100">
              <div
                style={{
                  paddingBottom: `${
                    typedPhoto.height && typedPhoto.width
                      ? (typedPhoto.height / typedPhoto.width) * 100
                      : 66.67
                  }%`,
                }}
                className="relative"
              >
                <Image
                  src={typedPhoto.url}
                  alt={typedPhoto.title}
                  fill
                  className="object-contain"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                  priority
                />
              </div>
            </div>
          </div>

          {/* 元信息 */}
          <div className="space-y-6">
            {/* 作者 */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-gray-900 text-white text-sm">
                  {(typedPhoto.profiles?.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {typedPhoto.profiles?.username || "匿名用户"}
                </p>
                <p className="text-xs text-gray-400">摄影师</p>
              </div>
            </div>

            {/* 标题和描述 */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {typedPhoto.title}
              </h1>
              {typedPhoto.description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {typedPhoto.description}
                </p>
              )}
            </div>

            {/* 元数据 */}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  {formatDistanceToNow(new Date(typedPhoto.created_at), {
                    addSuffix: true,
                    locale: zhCN,
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" />
                <span>{typedPhoto.views} 次浏览</span>
              </div>
            </div>

            {/* 分享 */}
            <div className="flex gap-2">
              <ShareButton photoId={id} title={typedPhoto.title} />
            </div>

            <div className="border-t border-gray-100" />

            {/* 评论区 */}
            <CommentSection photoId={id} initialComments={typedComments} />
          </div>
        </div>
      </div>
    </>
  );
}
