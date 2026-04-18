"use client";

import Image from "next/image";
import Link from "next/link";
import type { Photo } from "@/types";
import { useEffect, useRef, useState, useTransition } from "react";
import { Download, Heart, Loader2 } from "lucide-react";
import { DynamicWatermark } from "@/components/photo/dynamic-watermark";
import { ImageProtectionOverlay } from "@/components/photo/image-protection-overlay";
import { Button } from "@/components/ui/button";
import { incrementViews, likePhoto, unlikePhoto } from "@/lib/actions/photo";
import { downloadImageAsJpeg } from "@/lib/download-image";
import { shouldBypassImageOptimization } from "@/lib/image-url";
import { siteConfig } from "@/lib/site-config";
import { toast } from "sonner";

interface PhotoCardProps {
  photo: Photo;
  trackViews?: boolean;
  hideAuthor?: boolean;
  mobileStatsOnly?: boolean;
}

const viewedPhotoIds = new Set<string>();

function MiniAvatar({
  username,
  avatarUrl,
  userId,
  size = 28,
}: {
  username: string;
  avatarUrl?: string | null;
  userId?: string;
  size?: number;
}) {
  const content = (
    <div
      className="rounded-full overflow-hidden bg-gray-700 shrink-0 ring-1 ring-white/30 flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={username}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
          {username.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );

  if (userId) {
    return (
      <Link href={`/user/${userId}`} onClick={(e) => e.stopPropagation()} className="hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }
  return content;
}

export function PhotoCard({ photo, trackViews = true, hideAuthor = false, mobileStatsOnly = false }: PhotoCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [likes, setLikes] = useState(photo.likes || 0);
  const [liked, setLiked] = useState(() => Boolean(photo.has_liked));
  const [likeAnimating, setLikeAnimating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const aspectRatio =
    photo.height && photo.width ? photo.height / photo.width : 0.75;

  const username = photo.profiles?.username || "匿名";
  const avatarUrl = photo.profiles?.avatar_url;
  const userId = photo.profiles?.id || photo.user_id;

  useEffect(() => {
    if (!trackViews || viewedPhotoIds.has(photo.id)) {
      return;
    }

    const node = cardRef.current;
    if (!node) {
      return;
    }

    // Fallback for browsers without IntersectionObserver (e.g. older WebView)
    if (typeof IntersectionObserver === "undefined") {
      viewedPhotoIds.add(photo.id);
      void incrementViews(photo.id);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      viewedPhotoIds.add(photo.id);
      observer.disconnect();
      void incrementViews(photo.id);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [photo.id, trackViews]);

  const handleLike = () => {
    if (liked) {
      setLikes((v) => Math.max(0, v - 1));
      setLiked(false);
      startTransition(async () => {
        const result = await unlikePhoto(photo.id);
        if (result.error) {
          setLikes((v) => v + 1);
          setLiked(true);
          toast.error(result.error);
        }
      });
    } else {
      setLikes((v) => v + 1);
      setLiked(true);
      setLikeAnimating(true);
      setTimeout(() => setLikeAnimating(false), 500);
      startTransition(async () => {
        const result = await likePhoto(photo.id);
        if (result.error) {
          setLikes((v) => Math.max(0, v - 1));
          setLiked(false);
          toast.error(result.error);
        }
      });
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadImageAsJpeg(photo.id, photo.title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article ref={cardRef} className="group/card bg-white sm:bg-transparent overflow-hidden sm:rounded-xl border-b border-gray-100 sm:border-b-0">
      {!hideAuthor && (<div className="flex items-center gap-2.5 px-3 py-2 sm:hidden">
        <MiniAvatar username={username} avatarUrl={avatarUrl} userId={userId} size={30} />
        <Link href={`/user/${userId}`} className="text-sm font-medium text-gray-900 truncate hover:underline">{username}</Link>
      </div>)}

      <div className="relative overflow-hidden bg-gray-100 sm:rounded-xl">
        <Link href={`/photo/${photo.id}`} className="block" onClick={() => {
          // Save scroll position for back navigation
          try { sessionStorage.setItem("photo-share-scroll-pos", String(window.scrollY)); } catch {}
        }}>
          <div
            style={{ paddingBottom: `${aspectRatio * 100}%` }}
            className="relative w-full"
          >
            <Image
              src={photo.url}
              alt={photo.title}
              fill
              className={`object-cover transition-all duration-500 sm:group-hover/card:scale-[1.03] photo-protected ${
                loaded ? "opacity-100" : "opacity-0"
              }`}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
              onLoad={() => setLoaded(true)}
              unoptimized={shouldBypassImageOptimization(photo.url)}
              draggable={false}
            />
            <ImageProtectionOverlay />
            {siteConfig.antiScreenshotEnabled && <DynamicWatermark title={photo.title} />}
            {!loaded && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse" />
            )}
          </div>
        </Link>

        <div className="hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-300 pointer-events-none" />

          <div className="absolute left-2 top-2 z-[2] flex gap-2 opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-300">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={`h-8 hover:bg-white ${liked ? "bg-red-500 text-white hover:bg-red-600" : "bg-white/90 text-gray-900"} ${likeAnimating ? "animate-like-burst" : ""}`}
              onClick={handleLike}
              disabled={isPending}
            >
              <Heart className={`h-3.5 w-3.5 transition-all ${liked ? "fill-current" : ""} ${likeAnimating ? "animate-like-pop" : ""}`} />
              {likes}
            </Button>
          </div>

          {photo.allow_download !== false && (
            <div className="absolute right-2 top-2 z-[2] opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 transition-opacity duration-300">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-white/90 text-gray-900 hover:bg-white"
                onClick={handleDownload}
                disabled={downloading}
                aria-label="下载图片"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-3 text-white translate-y-1 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-within/card:translate-y-0 group-focus-within/card:opacity-100 transition-all duration-300 pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto">
              <MiniAvatar username={username} avatarUrl={avatarUrl} userId={userId} size={26} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{photo.title}</p>
                <Link href={`/user/${userId}`} onClick={(e) => e.stopPropagation()} className="text-xs text-white/70 truncate hover:text-white/90 transition-colors">{username}</Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar: always show title + like + download on mobile */}
      {mobileStatsOnly ? (
        <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-[13px] text-gray-800 truncate flex-1 font-medium leading-snug">{photo.title}</p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className={`inline-flex items-center gap-1 text-xs font-medium transition-all active:scale-90 ${liked ? "text-red-500" : "text-gray-400"}`}
              onClick={handleLike}
              disabled={isPending}
            >
              <Heart className={`h-4 w-4 transition-all ${liked ? "fill-current" : ""} ${likeAnimating ? "animate-like-pop" : ""}`} />
              <span className="tabular-nums">{likes}</span>
            </button>
            {photo.allow_download !== false && (
              <button
                type="button"
                className="text-gray-400 active:text-gray-600 transition-colors"
                onClick={handleDownload}
                disabled={downloading}
                aria-label="下载"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="sm:hidden flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-50">
          <p className="text-sm text-gray-800 truncate flex-1 font-medium">{photo.title}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              className={`inline-flex items-center gap-1 h-8 px-3 rounded-full text-xs font-medium transition-all active:scale-90 ${liked ? "text-red-500 bg-red-50" : "text-gray-500 bg-gray-50 active:bg-gray-100"}`}
              onClick={handleLike}
              disabled={isPending}
            >
              <Heart className={`h-4 w-4 transition-all ${liked ? "fill-current" : ""} ${likeAnimating ? "animate-like-pop" : ""}`} />
              <span className="tabular-nums">{likes}</span>
            </button>
            {photo.allow_download !== false && (
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full bg-gray-900 text-white hover:bg-gray-700 gap-1.5 px-3.5 text-xs shadow-sm active:scale-95 transition-transform"
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                下载
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  );
}
