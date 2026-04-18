import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-adapter";
import { getNotificationsForMode } from "@/lib/db-read";
import { NotificationsClient } from "./client";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await getNotificationsForMode(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <NotificationsClient initialNotifications={notifications} />
    </div>
  );
}
