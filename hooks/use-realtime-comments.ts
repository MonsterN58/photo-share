"use client";

import { useState } from "react";
import type { Comment } from "@/types";

export function useRealtimeComments(_photoId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(() => initialComments);

  const addOptimistic = (comment: Comment) => {
    setComments((prev) => [...prev, comment]);
  };

  const removeOptimistic = (id: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));
  };

  const updateOptimistic = (id: string, patch: Partial<Comment>) => {
    setComments((prev) =>
      prev.map((comment) => (comment.id === id ? { ...comment, ...patch } : comment))
    );
  };

  return { comments, addOptimistic, removeOptimistic, updateOptimistic };
}
