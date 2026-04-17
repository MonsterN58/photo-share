"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Comment } from "@/types";

export function useRealtimeComments(photoId: string, initialComments: Comment[]) {
  const [comments, setComments] = useState<Comment[]>(() => initialComments);

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
          // 重新获取所有评论（包含 profile 信息）
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

  return comments;
}
