"use server";

import { getCurrentUser } from "@/lib/auth-adapter";
import { getDatabaseMode } from "@/lib/database-mode";
import { markNotificationsRead as markLocalNotificationsRead, deleteNotifications as deleteLocalNotifications } from "@/lib/local-db";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export async function markNotificationsAsRead(notificationIds?: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();

    if (notificationIds && notificationIds.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIds)
        .eq("user_id", user.id);

      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);

      if (error) return { error: error.message };
    }
  } else {
    markLocalNotificationsRead(user.id, notificationIds);
  }

  return { success: true };
}

export async function deleteNotifications(notificationIds?: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "请先登录" };

  if (getDatabaseMode() === "remote") {
    const supabase = await createSupabaseClient();
    if (notificationIds && notificationIds.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .in("id", notificationIds)
        .eq("user_id", user.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
      if (error) return { error: error.message };
    }
  } else {
    deleteLocalNotifications(user.id, notificationIds);
  }

  return { success: true };
}