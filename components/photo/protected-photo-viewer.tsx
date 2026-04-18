"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, Minimize, Minus, Plus, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DynamicWatermark } from "@/components/photo/dynamic-watermark";
import { ImageProtectionOverlay } from "@/components/photo/image-protection-overlay";
import { useCaptureGuard } from "@/hooks/use-capture-guard";
import { shouldBypassImageOptimization } from "@/lib/image-url";

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
  const lastPinchCenter = useRef({ x: 0, y: 0 });
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-hide controls in fullscreen when zoomed
  const scheduleHideControls = useCallback(() => {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    setShowControls(true);
    controlsTimer.current = setTimeout(() => setShowControls(false), 3000);
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Clamp translate so image doesn't go out of bounds, with a small elastic margin
  const clampTranslate = useCallback((tx: number, ty: number, s: number) => {
    if (s <= 1) return { x: 0, y: 0 };
    const wrapper = imageWrapperRef.current;
    if (!wrapper) return { x: tx, y: ty };
    const rect = wrapper.getBoundingClientRect();
    const maxX = (rect.width * (s - 1)) / (2 * s);
    const maxY = (rect.height * (s - 1)) / (2 * s);
    return {
      x: Math.max(-maxX, Math.min(maxX, tx)),
      y: Math.max(-maxY, Math.min(maxY, ty)),
    };
  }, []);

  // Snap back to 1x if scale is very close
  const snapScale = useCallback((s: number) => {
    if (s < 1.08) return 1;
    return s;
  }, []);

  // Reset zoom when exiting fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fs = document.fullscreenElement === containerRef.current;
      setIsFullscreen(fs);
      if (!fs) resetZoom();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [resetZoom]);

  // Desktop scroll-to-zoom (works both fullscreen and normal)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if fullscreen, or if user is holding Ctrl/Cmd
      if (!isFullscreen && !e.ctrlKey && !e.metaKey) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const pointerX = e.clientX - rect.left - rect.width / 2;
      const pointerY = e.clientY - rect.top - rect.height / 2;

      setScale((prev) => {
        const factor = e.deltaY > 0 ? 0.92 : 1.08;
        const next = snapScale(Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * factor)));
        if (next <= 1) {
          setTranslate({ x: 0, y: 0 });
        } else if (prev !== next) {
          // Zoom toward pointer position
          const ratio = next / prev;
          setTranslate((t) => clampTranslate(
            t.x * ratio + pointerX * (1 - ratio),
            t.y * ratio + pointerY * (1 - ratio),
            next
          ));
        }
        return next;
      });
      if (isFullscreen) scheduleHideControls();
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [isFullscreen, clampTranslate, snapScale, scheduleHideControls]);

  // Desktop mouse drag to pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (scale <= 1) return;
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
      container.style.cursor = scale > 1 ? "grab" : "";
    };

    container.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [scale, translate, clampTranslate]);

  // Desktop double-click to toggle zoom (zoom to click point)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDoubleClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      if (scale > 1) {
        resetZoom();
      } else {
        const rect = container.getBoundingClientRect();
        const targetScale = 2.5;
        const pointerX = e.clientX - rect.left - rect.width / 2;
        const pointerY = e.clientY - rect.top - rect.height / 2;
        const newTranslate = clampTranslate(
          -pointerX * (targetScale - 1),
          -pointerY * (targetScale - 1),
          targetScale
        );
        setScale(targetScale);
        setTranslate(newTranslate);
      }
      if (isFullscreen) scheduleHideControls();
    };

    container.addEventListener("dblclick", handleDoubleClick);
    return () => container.removeEventListener("dblclick", handleDoubleClick);
  }, [scale, resetZoom, clampTranslate, isFullscreen, scheduleHideControls]);

  // Mobile pinch-to-zoom + drag-to-pan
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastPinchDist.current = Math.hypot(dx, dy);
        lastPinchScale.current = scale;
        lastPinchCenter.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        lastTranslate.current = { ...translate };
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

        // Zoom toward pinch center
        const rect = container.getBoundingClientRect();
        const centerX = lastPinchCenter.current.x - rect.left - rect.width / 2;
        const centerY = lastPinchCenter.current.y - rect.top - rect.height / 2;
        const scaleRatio = next / lastPinchScale.current;

        setScale(next);
        if (next <= 1) {
          setTranslate({ x: 0, y: 0 });
        } else {
          const newT = clampTranslate(
            lastTranslate.current.x * scaleRatio + centerX * (1 - scaleRatio),
            lastTranslate.current.y * scaleRatio + centerY * (1 - scaleRatio),
            next
          );
          setTranslate(newT);
        }
        if (isFullscreen) scheduleHideControls();
      } else if (e.touches.length === 1 && isPanning.current) {
        e.preventDefault();
        const dx = e.touches[0].clientX - panStart.current.x;
        const dy = e.touches[0].clientY - panStart.current.y;
        const newT = clampTranslate(lastTranslate.current.x + dx, lastTranslate.current.y + dy, scale);
        setTranslate(newT);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      isPanning.current = false;
      lastPinchDist.current = 0;
      // Snap back if pinch-to-zoom ended near 1x
      if (e.touches.length === 0 && scale > 1 && scale < 1.08) {
        resetZoom();
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [scale, translate, clampTranslate, resetZoom, isFullscreen, scheduleHideControls]);

  // Double-tap to toggle zoom on mobile (zoom to tap point)
  const lastTap = useRef(0);
  useEffect(() => {
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
          const rect = container.getBoundingClientRect();
          const targetScale = 2.5;
          const tapX = e.touches[0].clientX - rect.left - rect.width / 2;
          const tapY = e.touches[0].clientY - rect.top - rect.height / 2;
          const newTranslate = clampTranslate(
            -tapX * (targetScale - 1),
            -tapY * (targetScale - 1),
            targetScale
          );
          setScale(targetScale);
          setTranslate(newTranslate);
        }
        if (isFullscreen) scheduleHideControls();
      }
      lastTap.current = now;
    };

    container.addEventListener("touchstart", handleDoubleTap, { passive: false });
    return () => container.removeEventListener("touchstart", handleDoubleTap);
  }, [scale, resetZoom, clampTranslate, isFullscreen, scheduleHideControls]);

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
      scheduleHideControls();
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

  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-gray-50 shadow-sm ${
        isFullscreen ? "h-screen w-screen rounded-none bg-black" : "rounded-2xl"
      } ${isZoomed && !isFullscreen ? "cursor-grab" : ""}`}
      style={isZoomed || isFullscreen ? { touchAction: "none" } : undefined}
    >
      <div
        ref={imageWrapperRef}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isPanning.current ? "none" : "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
          ...(isFullscreen ? {} : !isZoomed ? { paddingBottom: `${aspectRatio}%` } : { paddingBottom: `${aspectRatio}%` }),
        }}
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
          unoptimized={shouldBypassImageOptimization(url)}
          draggable={false}
        />
        <ImageProtectionOverlay />
        {antiScreenshotEnabled && <DynamicWatermark title={title} />}
      </div>

      {/* Zoom controls */}
      <div
        className={`absolute right-3 top-3 z-[3] flex gap-2 transition-opacity duration-300 ${
          isFullscreen && !showControls && isZoomed ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        onMouseEnter={() => isFullscreen && setShowControls(true)}
      >
        {isZoomed && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="bg-white/90 text-gray-900 shadow-sm hover:bg-white active:scale-95 transition-transform"
            onClick={resetZoom}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">重置</span>
          </Button>
        )}
        {(isFullscreen || isZoomed) && (
          <>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 text-gray-900 shadow-sm hover:bg-white active:scale-90 transition-transform"
              onClick={() => {
                const next = snapScale(Math.max(MIN_SCALE, scale - 0.3));
                setScale(next);
                if (next <= 1) setTranslate({ x: 0, y: 0 });
              }}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="flex items-center justify-center min-w-[3rem] rounded-md bg-white/90 px-2 text-xs font-medium text-gray-700 shadow-sm select-none">
              {Math.round(scale * 100)}%
            </span>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 bg-white/90 text-gray-900 shadow-sm hover:bg-white active:scale-90 transition-transform"
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + 0.3))}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="bg-white/90 text-gray-900 shadow-sm hover:bg-white active:scale-95 transition-transform"
          onClick={isFullscreen ? handleExitFullscreen : handleEnterFullscreen}
        >
          {isFullscreen ? (
            <Minimize className="h-4 w-4" />
          ) : (
            <Expand className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">{isFullscreen ? "退出全屏" : "全屏查看"}</span>
        </Button>
      </div>

      {/* Zoom hint - show briefly on first view */}
      {!isZoomed && !isFullscreen && (
        <div className="absolute left-3 bottom-3 z-[3] text-[11px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
          滚轮缩放 · 双击放大
        </div>
      )}

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
  );
}
