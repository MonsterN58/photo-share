"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { incrementViews } from "@/lib/actions/photo";

const SCROLL_STORAGE_KEY = "photo-share-scroll-pos";

export function PhotoDetailClient({ photoId }: { photoId: string }) {
  const router = useRouter();

  useEffect(() => {
    incrementViews(photoId);
  }, [photoId]);

  // Save the referrer path on mount so we can go back
  useEffect(() => {
    // Store current scroll position of the previous page
    const handleBeforeUnload = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY));
    };
    // Restore scroll on popstate (back navigation)
    const restoreScroll = () => {
      const saved = sessionStorage.getItem(SCROLL_STORAGE_KEY);
      if (saved) {
        requestAnimationFrame(() => {
          window.scrollTo(0, parseInt(saved, 10));
          sessionStorage.removeItem(SCROLL_STORAGE_KEY);
        });
      }
    };
    window.addEventListener("popstate", restoreScroll);
    return () => {
      window.removeEventListener("popstate", restoreScroll);
    };
  }, []);

  const handleBack = () => {
    // Save current page's scroll position before going back
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="sm:hidden fixed top-3 left-3 z-50 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-100 px-3 py-2 text-sm font-medium text-gray-700 active:scale-95 transition-transform"
      aria-label="返回"
    >
      <ArrowLeft className="h-4 w-4" />
      返回
    </button>
  );
}
