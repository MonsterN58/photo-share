"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Bell, Heart, MessageCircle, CheckCheck, Trash2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { markNotificationsAsRead, deleteNotifications } from "@/lib/actions/notification";
import { toast } from "sonner";
import type { Notification } from "@/types";

interface NotificationsClientProps {
  initialNotifications: Notification[];
}

export function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const [isPending, startTransition] = useTransition();
  const hasInitialUnread = initialNotifications.some((n) => !n.is_read);
  const [notifications, setNotifications] = useState(() =>
    hasInitialUnread ? initialNotifications.map((n) => ({ ...n, is_read: true })) : initialNotifications
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Auto-mark all unread as read when the page mounts
  useEffect(() => {
    if (hasInitialUnread) {
      markNotificationsAsRead().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(notifications.map((n) => n.id)));
  const clearSelect = () => { setSelectedIds(new Set()); setSelecting(false); };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setNotifications((prev) => prev.filter((n) => !selectedIds.has(n.id)));
    setSelectedIds(new Set());
    setSelecting(false);
    startTransition(async () => {
      const result = await deleteNotifications(ids);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDeleteOne = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    startTransition(async () => {
      const result = await deleteNotifications([id]);
      if (result.error) toast.error(result.error);
    });
  };

  const handleDeleteAll = () => {
    setNotifications([]);
    setSelecting(false);
    startTransition(async () => {
      const result = await deleteNotifications();
      if (result.error) toast.error(result.error);
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            消息通知
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {unreadCount > 0 ? `${unreadCount} 条未读` : "暂无未读消息"}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            {selecting ? (
              <>
                <Button variant="ghost" size="sm" onClick={selectAll} disabled={isPending} className="text-gray-600 text-xs h-8 px-3">
                  全选
                </Button>
                {selectedIds.size > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={isPending} className="gap-1.5 h-8 px-3 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                    删除 ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearSelect} className="text-gray-500 h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => setSelecting(true)} className="gap-1.5 h-8 px-3 text-xs">
                  <CheckCheck className="h-3.5 w-3.5" />
                  批量删除
                </Button>
                <Button
                  variant="ghost" size="sm" onClick={handleDeleteAll} disabled={isPending}
                  className="gap-1.5 h-8 px-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清空
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <Bell className="mx-auto mb-3 h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-400">暂无通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              selecting={selecting}
              selected={selectedIds.has(notification.id)}
              onToggleSelect={() => toggleSelect(notification.id)}
              onDelete={() => handleDeleteOne(notification.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  selecting,
  selected,
  onToggleSelect,
  onDelete,
}: {
  notification: Notification;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const fromProfile = notification.from_profile;
  const router = useRouter();
  const username = fromProfile?.username || "匿名用户";
  const avatarUrl = fromProfile?.avatar_url;

  const isLike = notification.type === "like";
  const icon = isLike ? (
    <Heart className="h-4 w-4 text-red-500 fill-red-500" />
  ) : (
    <MessageCircle className="h-4 w-4 text-blue-500" />
  );

  const message = isLike
    ? `赞了你的照片「${notification.photo_title || ""}」`
    : `评论了你的照片「${notification.photo_title || ""}」`;

  const itemContent = (
    <div className="flex items-start gap-3 flex-1 min-w-0">
      {selecting && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(); }}
          className={`mt-0.5 h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
            selected ? "bg-blue-500 border-blue-500" : "border-gray-300 bg-white"
          }`}
        >
          {selected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      )}
      <Link href={`/user/${notification.from_user_id}`} onClick={(e) => e.stopPropagation()}>
        <Avatar className="h-10 w-10 overflow-hidden shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={username} className="h-full w-full object-cover" /> : null}
          <AvatarFallback className="bg-gray-800 text-white text-sm">{username.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm">
            <Link href={`/user/${notification.from_user_id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-gray-900 hover:underline">
              {username}
            </Link>
            <span className="text-gray-600 ml-1">{message}</span>
          </span>
        </div>
        {notification.comment_content && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2 pl-6">“{notification.comment_content}”</p>
        )}
        <p className="mt-1 text-xs text-gray-400 pl-6">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: zhCN })}
        </p>
      </div>
    </div>
  );

  const deleteBtn = (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
      className="shrink-0 self-start mt-0.5 h-7 w-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all"
      aria-label="删除"
    >
      <X className="h-4 w-4" />
    </button>
  );

  if (selecting) {
    return (
      <div
        onClick={onToggleSelect}
        className={`group flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${
          selected ? "border-blue-200 bg-blue-50/40" : "border-gray-100 bg-white hover:bg-gray-50"
        }`}
      >
        {itemContent}
      </div>
    );
  }

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(`/photo/${notification.photo_id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(`/photo/${notification.photo_id}`);
        }
      }}
      className={`group flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-gray-50 ${
        notification.is_read ? "border-gray-100 bg-white" : "border-blue-100 bg-blue-50/30"
      }`}
    >
      {itemContent}
      {deleteBtn}
    </div>
  );
}
