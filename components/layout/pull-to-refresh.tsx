"use client";

import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Loader2, RefreshCw } from "lucide-react";

/** Mobile-only pull-to-refresh indicator.
 *  Place once in the root layout or per-page. Only renders on touch devices.
 */
export function PullToRefresh() {
  const { pullDistance, refreshing, pulling } = usePullToRefresh({ threshold: 72 });

  const progress = Math.min(pullDistance / 72, 1); // 0 → 1
  const translateY = refreshing ? 48 : pulling ? pullDistance : 0;
  const opacity = refreshing ? 1 : Math.min(progress * 1.5, 1);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:hidden"
      style={{
        transform: `translateY(${translateY - 48}px)`,
        transition: refreshing ? "transform 0.2s ease-out" : undefined,
      }}
    >
      <div
        className="mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md"
        style={{ opacity }}
      >
        {refreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-gray-700" />
        ) : (
          <RefreshCw
            className="h-5 w-5 text-gray-700"
            style={{ transform: `rotate(${progress * 360}deg)` }}
          />
        )}
      </div>
    </div>
  );
}
