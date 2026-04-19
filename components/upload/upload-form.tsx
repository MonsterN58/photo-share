"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadPhoto } from "@/lib/actions/photo";
import { createAlbum, assignPhotosToAlbum } from "@/lib/actions/album";
import { publishPortfolio } from "@/lib/actions/portfolio";
import { serializeCoverUrls } from "@/lib/cover";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";

interface FilePreview {
  file: File;
  preview: string;
  width: number;
  height: number;
}

const RAW_UPLOAD_LIMIT = 5 * 1024 * 1024;

function getImageDimensions(file: File | Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 1920, height: 1080 });
    img.src = URL.createObjectURL(file);
  });
}

export function UploadForm() {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowDownload, setAllowDownload] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const processFiles = useCallback(async (rawFiles: File[]) => {
    const imageFiles = rawFiles.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error("请选择图片文件");
      return;
    }

    const previews: FilePreview[] = [];
    for (const file of imageFiles) {
      // 前端压缩
      const compressed =
        file.size <= RAW_UPLOAD_LIMIT
          ? file
          : await imageCompression(file, {
              maxSizeMB: 12,
              maxWidthOrHeight: 3840,
              useWebWorker: true,
              fileType: "image/webp",
              initialQuality: 0.92,
            });

      const dims = await getImageDimensions(compressed);
      previews.push({
        file: compressed,
        preview: URL.createObjectURL(compressed),
        width: dims.width,
        height: dims.height,
      });
    }
    setFiles((prev) => [...prev, ...previews]);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = Array.from(e.dataTransfer.files);
    processFiles(dropped);
  };

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("请选择至少一张图片");
      return;
    }
    if (!title.trim()) {
      toast.error("请输入标题");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    const uploadedPhotoIds: string[] = [];
    const uploadedPhotoUrls: string[] = [];
    let firstPhotoUrl: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const formData = new FormData();
      formData.set("file", f.file);
      formData.set("title", files.length > 1 ? `${title} (${i + 1})` : title);
      formData.set("description", description);
      formData.set("is_public", String(isPublic));
      formData.set("allow_download", String(allowDownload));
      formData.set("width", String(f.width));
      formData.set("height", String(f.height));

      const result = await uploadPhoto(formData);
      if (result.error) {
        toast.error(`上传失败: ${result.error}`);
      } else {
        successCount++;
        if (result.photoId) {
          uploadedPhotoIds.push(result.photoId);
        }
        if (result.url) {
          uploadedPhotoUrls.push(result.url);
        }
        if (firstPhotoUrl === null && result.url) {
          firstPhotoUrl = result.url;
        }
      }

      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    // If multiple photos uploaded successfully, auto-create album + portfolio
    if (successCount > 1 && uploadedPhotoIds.length > 1) {
      try {
        const albumFormData = new FormData();
        albumFormData.set("name", title);
        albumFormData.set("description", description || "");
        const albumResult = await createAlbum(albumFormData);
        if (albumResult.success && albumResult.album) {
          await assignPhotosToAlbum(uploadedPhotoIds, albumResult.album.id);

          // Also create a portfolio from the album
          const portfolioFormData = new FormData();
          portfolioFormData.set("album_id", albumResult.album.id);
          portfolioFormData.set("title", title);
          portfolioFormData.set("description", description || "");
          portfolioFormData.set("cover_url", serializeCoverUrls(uploadedPhotoUrls.slice(0, 4)) || firstPhotoUrl || "");
          portfolioFormData.set("is_public", String(isPublic));
          const portfolioResult = await publishPortfolio(portfolioFormData);

          if (portfolioResult.success) {
            toast.success(`已自动创建作品集「${title}」`);
          } else {
            toast.success(`已自动创建相册「${title}」`);
          }
        }
      } catch {
        // Non-critical, don't fail the upload
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`成功上传 ${successCount} 张照片`);
      setFiles([]);
      setTitle("");
      setDescription("");
      setAllowDownload(true);
      router.push("/me");
      router.refresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 拖拽区域 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-gray-900 bg-gray-50"
            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleSelect}
          className="hidden"
        />
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <Upload className="h-6 w-6 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              拖拽照片到这里，或点击选择
            </p>
            <p className="text-xs text-gray-400 mt-1">
              支持 JPG、PNG、WebP，单文件最大 20MB
            </p>
          </div>
        </div>
      </div>

      {/* 文件预览 */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {files.map((f, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden bg-gray-100 aspect-square">
              <Image
                src={f.preview}
                alt={f.file.name || "预览图"}
                fill
                unoptimized
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-xs px-2 py-1">
                {f.width} × {f.height}
              </div>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-gray-500 hover:border-gray-300 transition-colors"
          >
            <ImageIcon className="h-6 w-6" />
            <span className="text-xs">添加更多</span>
          </button>
        </div>
      )}

      {/* 表单信息 */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium text-gray-700">
            标题 *
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给照片起个名字"
            className="bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-700">
            描述
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="描述一下这张照片..."
            rows={3}
            className="resize-none bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">公开分享</span>
          </label>
          <span className="text-xs text-gray-400">
            {isPublic ? "所有人可见" : "仅自己可见"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">允许下载</span>
          </label>
          <span className="text-xs text-gray-400">
            {allowDownload ? "访客可下载 JPG 副本" : "隐藏下载入口"}
          </span>
        </div>
      </div>

      {/* 上传按钮 */}
      <Button
        onClick={handleUpload}
        disabled={uploading || files.length === 0 || !title.trim()}
        className="w-full h-11 text-sm font-medium"
      >
        {uploading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            上传中 {uploadProgress}%
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            上传 {files.length > 0 ? `(${files.length} 张)` : ""}
          </span>
        )}
      </Button>
    </div>
  );
}
