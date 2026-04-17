"use client";

import { useEffect } from "react";
import { incrementViews } from "@/lib/actions/photo";

export function PhotoDetailClient({ photoId }: { photoId: string }) {
  useEffect(() => {
    incrementViews(photoId);
  }, [photoId]);

  return null;
}
