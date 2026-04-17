"use server";

import { createClient } from "@/lib/supabase/server";
import { commentSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";

export async function addComment(photoId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const parsed = commentSchema.safeParse({
    content: formData.get("content"),
    parent_id: formData.get("parent_id") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

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

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function deleteComment(commentId: string, photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}

export async function likeComment(commentId: string, photoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "请先登录" };

  const { data, error } = await supabase.rpc("increment_comment_likes", {
    comment_id: commentId,
  });

  if (error) return { error: error.message };
  if (!data) return { error: "你已经给这条评论点过赞了" };

  revalidatePath(`/photo/${photoId}`);
  return { success: true };
}
