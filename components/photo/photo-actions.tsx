"use client";

import { useState, useTransition, useRef } from "react";
import { Download, Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { likePhoto } from "@/lib/actions/photo";
import { downloadImageAsJpeg } from "@/lib/download-image";
import { toast } from "sonner";

interface PhotoActionsProps {
  photoId: string;
  title: string;
  likes: number;
  allowDownload: boolean;
  hasLiked?: boolean;
}

export function PhotoActions({
  photoId,
  title,
  likes: initialLikes,
  allowDownload,
  hasLiked: initialHasLiked = false,
}: PhotoActionsProps) {
  const [likes, setLikes] = useState(initialLikes || 0);
  const [liked, setLiked] = useState(initialHasLiked);
  const [animating, setAnimating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const heartRef = useRef<HTMLButtonElement>(null);

  const handleLike = () => {
    if (liked) {
      toast.info("你已经给这张照片点过赞了");
      return;
    }
    setLikes((value) => value + 1);
    setLiked(true);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 500);
    startTransition(async () => {
      const result = await likePhoto(photoId);
      if (result.error) {
        setLikes((value) => Math.max(0, value - 1));
        setLiked(false);
        toast.error(result.error);
      }
    });
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadImageAsJpeg(photoId, title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        ref={heartRef}
        type="button"
        variant={liked ? "default" : "outline"}
        onClick={handleLike}
        disabled={isPending}
        className={`${liked ? "bg-red-500 hover:bg-red-600 border-red-500 text-white" : ""} ${animating ? "animate-like-burst" : ""}`}
      >
        <Heart className={`h-4 w-4 transition-all ${liked ? "fill-current" : ""} ${animating ? "animate-like-pop" : ""}`} />
        {likes}
      </Button>
      {allowDownload && (
        <Button
          type="button"
          variant="outline"
          onClick={handleDownload}
          disabled={downloading}
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          下载 JPG
        </Button>
      )}
    </>
  );
}
