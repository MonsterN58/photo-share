"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { deletePhoto, updatePhoto } from "@/lib/actions/photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import type { Photo } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface MyPhotosClientProps {
  photos: Photo[];
}

export function MyPhotosClient({ photos: initialPhotos }: MyPhotosClientProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [isPending, startTransition] = useTransition();

  const handleDelete = (photoId: string) => {
    if (!confirm("确定要删除这张照片吗？")) return;

    startTransition(async () => {
      const result = await deletePhoto(photoId);
      if (result.error) {
        toast.error(result.error);
      } else {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("删除成功");
      }
    });
  };

  const handleUpdate = (photoId: string, formData: FormData) => {
    startTransition(async () => {
      const result = await updatePhoto(photoId, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        // 更新本地状态
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  title: formData.get("title") as string,
                  description: (formData.get("description") as string) || null,
                  is_public: formData.get("is_public") === "true",
                }
              : p
          )
        );
        toast.success("更新成功");
      }
    });
  };

  if (photos.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
          <svg
            className="h-8 w-8 text-gray-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-gray-500 text-sm">还没有上传照片</p>
        <Link href="/upload">
          <Button className="mt-4" size="sm">
            上传第一张
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative rounded-lg overflow-hidden bg-gray-100 border border-gray-100"
        >
          <Link href={`/photo/${photo.id}`}>
            <div className="relative aspect-[4/3]">
              <Image
                src={photo.url}
                alt={photo.title}
                fill
                className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
          </Link>

          <div className="p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 truncate flex-1">
                {photo.title}
              </h3>
              <Badge
                variant={photo.is_public ? "default" : "secondary"}
                className="text-xs ml-2 shrink-0"
              >
                {photo.is_public ? "公开" : "私密"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(photo.created_at), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Eye className="h-3.5 w-3.5" />
                {photo.views}
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-1 border-t border-gray-50">
              <EditDialog photo={photo} onSave={handleUpdate} />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-gray-400 hover:text-red-500"
                onClick={() => handleDelete(photo.id)}
                disabled={isPending}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Link href={`/photo/${photo.id}`} className="ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-gray-400"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EditDialog({
  photo,
  onSave,
}: {
  photo: Photo;
  onSave: (id: string, formData: FormData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(photo.title);
  const [description, setDescription] = useState(photo.description || "");
  const [isPublic, setIsPublic] = useState(photo.is_public);

  const handleSave = () => {
    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("is_public", String(isPublic));
    onSave(photo.id, formData);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-gray-400 hover:text-gray-600"
          />
        }
      >
        <Pencil className="h-3.5 w-3.5" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>编辑照片</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>标题</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>描述</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">公开</span>
            </label>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {isPublic ? (
                <>
                  <Eye className="h-3.5 w-3.5" /> 所有人可见
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> 仅自己可见
                </>
              )}
            </span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
