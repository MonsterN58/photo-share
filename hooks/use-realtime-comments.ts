"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import type { Comment } from "@/types";

export function useRealtimeComments(photoId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(() => initialComments);

  const addOptimistic = useCallback((comment: Comment) => {
    setComments((prev) => [...prev, comment]);
  }, []);

  const removeOptimistic = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  const updateOptimistic = useCallback(
    (commentId: string, updates: Partial<Comment>) => {
      setComments((prev) =>
        prev.map((c) => (c.id === commentId ? { ...c, ...updates } : c))
      );
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`comments:${photoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `photo_id=eq.${photoId}`,
        },
        async () => {
          const { data } = await supabase
            .from("comments")
            .select("*, profiles(*)")
            .eq("photo_id", photoId)
            .order("created_at", { ascending: true });

          if (data) {
            setComments(data as Comment[]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [photoId]);

  return { comments, addOptimistic, removeOptimistic, updateOptimistic };
}
