"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Expand, Minimize, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DynamicWatermark } from "@/components/photo/dynamic-watermark";
import { ImageProtectionOverlay } from "@/components/photo/image-protection-overlay";
import { useCaptureGuard } from "@/hooks/use-capture-guard";

interface ProtectedPhotoViewerProps {
  url: string;
  title: string;
  width?: number | null;
  height?: number | null;
  antiScreenshotEnabled: boolean;
}

export function ProtectedPhotoViewer({
  url,
  title,
  width,
  height,
  antiScreenshotEnabled,
}: ProtectedPhotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isObscured } = useCaptureGuard(antiScreenshotEnabled);
  const aspectRatio = width && height ? (height / width) * 100 : 66.67;

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const handleEnterFullscreen = async () => {
    if (!containerRef.current?.requestFullscreen) {
      toast.error("当前浏览器不支持全屏查看");
      return;
    }

    try {
      await containerRef.current.requestFullscreen();
    } catch {
      toast.error("进入全屏失败");
    }
  };

  const handleExitFullscreen = async () => {
    if (!document.fullscreenElement) {
      return;
    }

    try {
      await document.exitFullscreen();
    } catch {
      toast.error("退出全屏失败");
    }
  };

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-gray-50 shadow-sm ${
        isFullscreen ? "h-screen w-screen rounded-none bg-black" : "rounded-2xl"
      }`}
    >
      <div
        style={isFullscreen ? undefined : { paddingBottom: `${aspectRatio}%` }}
        className={`relative ${isFullscreen ? "h-full w-full" : ""}`}
      >
        <Image
          src={url}
          alt={title}
          fill
          className={`photo-protected transition duration-300 ${
            isFullscreen ? "object-contain bg-black" : "object-contain"
          } ${isObscured ? "scale-[1.02] blur-2xl" : ""}`}
          sizes={isFullscreen ? "100vw" : "(max-width: 1024px) 100vw, 60vw"}
          priority
          draggable={false}
        />
        <ImageProtectionOverlay />
        {antiScreenshotEnabled && <DynamicWatermark title={title} />}

        <div className="absolute right-3 top-3 z-[3] flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="bg-white/90 text-gray-900 shadow-sm hover:bg-white"
            onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Expand className="h-4 w-4" />
            )}
            {isFullscreen ? "退出全屏" : "全屏查看"}
          </Button>
        </div>

        {antiScreenshotEnabled && isObscured && (
          <div className="pointer-events-none absolute inset-0 z-[4] flex items-center justify-center bg-black/35 backdrop-blur-2xl">
            <div className="rounded-2xl border border-white/15 bg-black/55 px-5 py-4 text-center text-white shadow-2xl">
              <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium">
                <ShieldAlert className="h-4 w-4" />
                全屏内容保护中
              </div>
              <p className="text-xs text-white/70">失焦、切屏或鼠标离开窗口时会自动模糊照片</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}