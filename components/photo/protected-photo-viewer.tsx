"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Minimize, Minus, Plus, RotateCcw, ShieldAlert } from "lucide-react";
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

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export function ProtectedPhotoViewer({
  url,
  title,
  width,
  height,
  antiScreenshotEnabled,
}: ProtectedPhotoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { isObscured } = useCaptureGuard(antiScreenshotEnabled);
  const aspectRatio = width && height ? (height / width) * 100 : 66.67;

  // Zoom / pan state
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastTranslate = useRef({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const lastPinchScale = useRef(1);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Clamp translate so image doesn't go out of bounds
  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const wrapper = imageWrapperRef.current;
    if (!wrapper) return { x: tx, y: ty };
    const rect = wrapper.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / 2;
    const maxY = (rect.height * (s - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  // Reset zoom when exiting fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = document.fullscreenElement === containerRef.current;
      setIsFullscreen(fs);
      if (!fs) resetZoom();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // webkit for Honor browser / Safari
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [resetZoom]);

  // Desktop scroll-to-zoom (fullscreen only)
  useEffect(() => {
    if (!isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev - e.deltaY * 0.002));
        if (next <= 1) setTranslate({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isFullscreen]);

  // Desktop mouse drag to pan (fullscreen only)
  useEffect(() => {
    if (!isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (scale <= 1) return;
      // Don't start pan on buttons
      if ((e.target as HTMLElement).closest("button")) return;
      isPanning.current = true;
      panStart.current = { x: e.clientX, y: e.clientY };
      lastTranslate.current = { ...translate };
      container.style.cursor = "grabbing";
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanning.current) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const newT = clampTranslate(lastTranslate.current.x + dx, lastTranslate.current.y + dy, scale);
      setTranslate(newT);
    };

    const handleMouseUp = () => {
      isPanning.current = false;
      container.style.cursor = "";
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isFullscreen, scale, translate, clampTranslate]);

  // Mobile pinch-to-zoom + drag-to-pan (fullscreen only)
  useEffect(() => {
    if (!isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.hypot(dx, dy);
        lastPinchScale.current = scale;
        e.preventDefault();
      } else if (e.touches.length === 1 && scale > 1) {
        isPanning.current = true;
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTranslate.current = { ...translate };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const ratio = dist / lastPinchDist.current;
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, lastPinchScale.current * ratio));
        setScale(next);
        if (next <= 1) setTranslate({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && isPanning.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        const newT = clampTranslate(lastTranslate.current.x + dx, lastTranslate.current.y + dy, scale);
        setTranslate(newT);
      }
    };

    const handleTouchEnd = () => {
      isPanning.current = false;
      lastPinchDist.current = 0;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isFullscreen, scale, translate, clampTranslate]);

  // Double-tap to toggle zoom on mobile
  const lastTap = useRef(0);
  useEffect(() => {
    if (!isFullscreen) return;
    const container = containerRef.current;
    if (!container) return;

    const handleDoubleTap = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const now = Date.now();
      if (now - lastTap.current < 300) {
        e.preventDefault();
        if (scale > 1) {
          resetZoom();
        } else {
          setScale(2.5);
        }
      }
      lastTap.current = now;
    };

    container.addEventListener("touchstart", handleDoubleTap, { passive: false });
    return () => container.removeEventListener("touchstart", handleDoubleTap);
  }, [isFullscreen, scale, resetZoom]);

  const handleEnterFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    const rfs = el.requestFullscreen || (el as any).webkitRequestFullscreen;
    if (!rfs) {
      toast.error("当前浏览器不支持全屏查看");
      return;
    }
    try {
      await rfs.call(el);
    } catch {
      toast.error("进入全屏失败");
    }
  };

  const handleExitFullscreen = async () => {
    const exitFn = document.exitFullscreen || (document as any).webkitExitFullscreen;
    if (!exitFn) return;
    try {
      await exitFn.call(document);
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
      style={isFullscreen ? { touchAction: "none" } : undefined}
    >
      <div
        ref={imageWrapperRef}
        style={
          isFullscreen
            ? { transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`, transition: isPanning.current ? "none" : "transform 0.15s ease-out" }
            : { paddingBottom: `${aspectRatio}%` }
        }
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
          {isFullscreen && scale > 1 && (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-900 shadow-sm hover:bg-white"
              onClick={resetZoom}
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </Button>
          )}
          {isFullscreen && (
            <>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 text-gray-900 shadow-sm hover:bg-white"
                onClick={() => setScale((s) => Math.max(MIN_SCALE, s - 0.5))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="flex items-center justify-center min-w-[3rem] rounded-md bg-white/90 px-2 text-xs font-medium text-gray-700 shadow-sm">
                {Math.round(scale * 100)}%
              </span>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-white/90 text-gray-900 shadow-sm hover:bg-white"
                onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.5))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
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