"use client";

import { ShieldAlert } from "lucide-react";
import { useCaptureGuard } from "@/hooks/use-capture-guard";
import { siteConfig } from "@/lib/site-config";

export function CaptureGuard() {
  const enabled = siteConfig.antiScreenshotEnabled;
  const { isObscured } = useCaptureGuard(enabled);

  if (!enabled || !isObscured) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black/45 backdrop-blur-2xl">
      <div className="rounded-2xl border border-white/15 bg-black/55 px-6 py-4 text-center text-white shadow-2xl">
        <div className="mb-2 flex items-center justify-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4" />
          内容保护已启用
        </div>
        <p className="text-xs text-white/70">页面失焦或鼠标离开窗口时，内容会临时模糊显示</p>
      </div>
    </div>
  );
}