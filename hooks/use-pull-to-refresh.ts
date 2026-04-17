"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface UsePullToRefreshOptions {
  /** Pull distance in px needed to trigger refresh (default: 72) */
  threshold?: number;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
}

export function usePullToRefresh({
  threshold = 72,
  enabled = true,
}: UsePullToRefreshOptions = {}) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pulling = pullDistance > 0;

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || refreshing) return;
      // Only activate when the page is scrolled to the very top
      if (window.scrollY !== 0) return;
      startYRef.current = e.touches[0].clientY;
    },
    [enabled, refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || refreshing || startYRef.current === null) return;
      if (window.scrollY !== 0) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Apply rubber-band resistance
      const resistance = 0.45;
      setPullDistance(Math.min(delta * resistance, threshold * 1.5));
    },
    [enabled, refreshing, threshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || startYRef.current === null) return;
    startYRef.current = null;

    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(0);
      // Small delay so the spinner is visible before the page re-renders
      await new Promise((r) => setTimeout(r, 400));
      router.refresh();
      // Keep spinner a moment while Next.js re-fetches
      await new Promise((r) => setTimeout(r, 600));
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [enabled, pullDistance, threshold, router]);

  useEffect(() => {
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, refreshing, pulling };
}
