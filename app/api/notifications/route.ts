import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getNotificationsForMode, getUnreadNotificationCountForMode } from "@/lib/db-read";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }

  const { searchParams } = new URL(request.url);
  const countOnly = searchParams.get("count_only") === "true";
  const unreadOnly = searchParams.get("unread_only") === "true";
  const limit = parseInt(searchParams.get("limit") || "0", 10) || undefined;

  if (countOnly) {
    const unreadCount = await getUnreadNotificationCountForMode(user.id);
    return NextResponse.json({ unreadCount });
  }

  const notifications = await getNotificationsForMode(user.id);
  const unreadCount = await getUnreadNotificationCountForMode(user.id);

  const filtered = unreadOnly ? notifications.filter((n) => !n.is_read) : notifications;
  const limited = limit ? filtered.slice(0, limit) : filtered;

  return NextResponse.json({ notifications: limited, unreadCount });
}
