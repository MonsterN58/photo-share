"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import {
  deleteCommentByOwner,
  getComment,
  insertComment,
  insertNotification,
  likeCommentOnce,
  unlikeCommentOnce,
} from "@/lib/local-db";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { commentSchema } from "@/lib/validators";
import { getPhotoByIdForMode } from "@/lib/db-read";

export async function addComment(photoId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  const parsed = commentSchema.safeParse({
    content: formData.get("content"),
    parent_id: formData.get("parent_id") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();

    if (parsed.data.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from("comments")
        .select("id, photo_id")
        .eq("id", parsed.data.parent_id)
        .maybeSingle();

      if (parentError) return { error: parentError.message };
      if (!parentComment || parentComment.photo_id !== photoId) {
        return { error: "回复目标不存在或已失效" };
      }
    }

    const { error } = await supabase.from("comments").insert({
      photo_id: photoId,
      user_id: user.id,
      content: parsed.data.content,
      parent_id: parsed.data.parent_id || null,
    });

    if (error) return { error: error.message };

    // Create notification for photo owner (remote)
    const photo = await getPhotoByIdForMode(photoId);
    if (photo && photo.user_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: photo.user_id,
        type: "comment",
        from_user_id: user.id,
        photo_id: photoId,
      });
    }
  } else {
    if (parsed.data.parent_id) {
      const parentComment = getComment(parsed.data.parent_id);
      if (!parentComment || parentComment.photo_id !== photoId) {
        return { error: "回复目标不存在或已失效" };
      }
    }

    insertComment({
      photoId,
      userId: user.id,
      content: parsed.data.content,
      parentId: parsed.data.parent_id || null,
    });

    // Create notification for photo owner (local)
    const { getPhotoById } = await import("@/lib/local-db");
    const photo = getPhotoById(photoId);
    if (photo && photo.user_id !== user.id) {
      insertNotification({
        userId: photo.user_id,
        type: "comment",
        fromUserId: user.id,
        photoId,
        commentId: null,
      });
    }
  }

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) return { error: error.message };
  } else {
    deleteCommentByOwner(commentId, user.id);
  }

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function likeComment(commentId: string, photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { data, error } = await supabase.rpc("increment_comment_likes", {
      comment_id: commentId,
    });

    if (error) return { error: error.message };
    if (!data) return { error: "你已经给这条评论点过赞了" };
  } else {
    if (!likeCommentOnce(commentId, user.id)) {
      return { error: "你已经给这条评论点过赞了" };
    }
  }

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function unlikeComment(commentId: string, photoId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    const { error: deleteError } = await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", user.id);
    if (deleteError) return { error: deleteError.message };

    const { data: comment } = await supabase
      .from("comments")
      .select("likes")
      .eq("id", commentId)
      .single();

    await supabase
      .from("comments")
      .update({ likes: Math.max(0, (comment?.likes || 1) - 1) })
      .eq("id", commentId);
  } else {
    unlikeCommentOnce(commentId, user.id);
  }

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}
