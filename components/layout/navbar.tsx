"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Images, LogOut, Menu, Search, Upload, User, X, BookImage, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { logout } from "@/lib/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifPopupOpen, setNotifPopupOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState<Array<{ id: string; photo_id: string; type: string; from_profile?: { avatar_url?: string | null; username?: string | null } | null; comment_content?: string | null; photo_title?: string | null; is_read: boolean; created_at: string }>>([]);
  const [notifPopupLoading, setNotifPopupLoading] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const notifCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const fetchUnreadNotifs = useCallback(async () => {
    if (notifPopupLoading) return;
    setNotifPopupLoading(true);
    try {
      const res = await fetch("/api/notifications?unread_only=true&limit=5", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifs(data.notifications || []);
      }
    } finally {
      setNotifPopupLoading(false);
    }
  }, [notifPopupLoading]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/notifications?count_only=true", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* ignore */ }
  }, [user]);

  const openNotifPopup = useCallback(() => {
    if (notifCloseTimer.current) {
      clearTimeout(notifCloseTimer.current);
      notifCloseTimer.current = null;
    }
    setNotifPopupOpen(true);
    void fetchUnreadNotifs();
  }, [fetchUnreadNotifs]);

  const closeNotifPopupSoon = useCallback(() => {
    if (notifCloseTimer.current) clearTimeout(notifCloseTimer.current);
    notifCloseTimer.current = setTimeout(() => {
      setNotifPopupOpen(false);
      notifCloseTimer.current = null;
    }, 180);
  }, []);

  const openUserMenu = useCallback(() => {
    if (userMenuCloseTimer.current) {
      clearTimeout(userMenuCloseTimer.current);
      userMenuCloseTimer.current = null;
    }
    setUserMenuOpen(true);
  }, []);

  const closeUserMenuSoon = useCallback(() => {
    if (userMenuCloseTimer.current) clearTimeout(userMenuCloseTimer.current);
    userMenuCloseTimer.current = setTimeout(() => {
      setUserMenuOpen(false);
      userMenuCloseTimer.current = null;
    }, 220);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(fetchUnreadCount, 0);
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      window.clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    return () => {
      if (notifCloseTimer.current) clearTimeout(notifCloseTimer.current);
      if (userMenuCloseTimer.current) clearTimeout(userMenuCloseTimer.current);
    };
  }, []);

  useEffect(() => {
    const container = navRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[data-nav-active="true"]');
    if (!active) { setPill(null); return; }
    const cr = container.getBoundingClientRect();
    const ar = active.getBoundingClientRect();
    setPill({ left: ar.left - cr.left, width: ar.width });
  }, [pathname, user]);

  useEffect(() => {
    if (!mobileOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (headerRef.current?.contains(target)) return;
      setMobileOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  const handleLogout = useCallback(async () => {
    const result = await logout();
    if (result && "success" in result && result.success) {
      setUnreadCount(0);
      window.dispatchEvent(new Event("auth-changed"));
      router.replace("/");
      router.refresh();
    }
  }, [router]);

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative">
              <Image
                src="/nku-logo.png"
                alt="南开印象"
                width={36}
                height={36}
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                南开印象
              </span>
              <span className="hidden sm:block text-[10px] text-gray-400 tracking-widest mt-0.5">
                发现校园瞬间
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center">
            <div ref={navRef} className="relative flex items-center bg-gray-50/80 rounded-full px-1 py-1 gap-0.5">
              {/* Sliding active pill */}
              {pill && (
                <div
                  className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm ring-1 ring-gray-200/80 transition-[left,width] duration-300 ease-out pointer-events-none"
                  style={{ left: pill.left, width: pill.width }}
                />
              )}
              <Link href="/">
                <Button data-nav-active={isActive("/")} variant="ghost" className={`relative z-10 text-sm gap-1.5 rounded-full h-9 px-4 transition-colors ${isActive("/") ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"}`}>
                  <Home className="h-4 w-4" />
                  首页
                </Button>
              </Link>
              <Link href="/search">
                <Button data-nav-active={isActive("/search")} variant="ghost" className={`relative z-10 text-sm gap-1.5 rounded-full h-9 px-4 transition-colors ${isActive("/search") ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"}`}>
                  <Search className="h-4 w-4" />
                  搜索
                </Button>
              </Link>
              <Link href="/portfolios">
                <Button data-nav-active={isActive("/portfolios") || isActive("/portfolio")} variant="ghost" className={`relative z-10 text-sm gap-1.5 rounded-full h-9 px-4 transition-colors ${isActive("/portfolios") || isActive("/portfolio") ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"}`}>
                  <BookImage className="h-4 w-4" />
                  作品集
                </Button>
              </Link>
              {user && (
                <>
                  <Link href="/upload">
                    <Button data-nav-active={isActive("/upload")} variant="ghost" className={`relative z-10 text-sm gap-1.5 rounded-full h-9 px-4 transition-colors ${isActive("/upload") ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"}`}>
                      <Upload className="h-4 w-4" />
                      上传
                    </Button>
                  </Link>
                  <Link href="/me">
                    <Button data-nav-active={isActive("/me")} variant="ghost" className={`relative z-10 text-sm gap-1.5 rounded-full h-9 px-4 transition-colors ${isActive("/me") ? "text-gray-900 font-medium" : "text-gray-600 hover:text-gray-900"}`}>
                      <Images className="h-4 w-4" />
                      我的照片
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Mobile search button - always visible on mobile */}
            <Link href="/search" className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <Search className="h-[18px] w-[18px]" />
              </Button>
            </Link>

            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <>
                {/* Notification bell */}
                <div
                  className="relative"
                  onMouseEnter={openNotifPopup}
                  onMouseLeave={closeNotifPopupSoon}
                >
                  <button
                    onClick={() => router.push("/notifications")}
                    className="relative h-9 w-9 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                  >
                    <Bell className="h-[18px] w-[18px]" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifPopupOpen && (
                    <>
                      <div className="hidden md:block absolute right-0 top-full h-2 w-80" />
                      <div
                        className="hidden md:block absolute right-0 top-full mt-1.5 w-80 rounded-xl border border-gray-200 bg-white shadow-lg z-50 overflow-hidden"
                        onMouseEnter={openNotifPopup}
                        onMouseLeave={closeNotifPopupSoon}
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                          <span className="text-sm font-semibold text-gray-900">未读通知</span>
                          <button
                            type="button"
                            onClick={() => router.push("/notifications")}
                            className="text-xs text-blue-500 hover:text-blue-700"
                          >
                            查看全部
                          </button>
                        </div>
                        {notifPopupLoading ? (
                          <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                            <span className="text-sm">加载中...</span>
                          </div>
                        ) : unreadNotifs.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-400">暂无未读通知</div>
                        ) : (
                          <ul>
                            {unreadNotifs.map((notif) => (
                              <li key={notif.id}>
                                <button
                                  type="button"
                                  onClick={() => { router.push(`/photo/${notif.photo_id}`); setNotifPopupOpen(false); }}
                                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                                >
                                  {notif.from_profile?.avatar_url ? (
                                    <img src={notif.from_profile.avatar_url} alt={notif.from_profile?.username || ""} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                                  ) : (
                                    <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-500">
                                      {(notif.from_profile?.username || "?")[0].toUpperCase()}
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-gray-800 line-clamp-2">
                                      {notif.from_profile?.username || "用户"}{notif.type === "like" ? " 赞了你的照片" : " 评论了你的照片"}
                                      {notif.photo_title ? `「${notif.photo_title}」` : ""}
                                      {notif.type === "comment" && notif.comment_content ? `：${notif.comment_content}` : ""}
                                    </p>
                                    <p className="mt-0.5 text-xs text-gray-400">
                                      {new Date(notif.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Mobile-only: avatar links directly to profile */}
                <button
                  type="button"
                  className="md:hidden"
                  onClick={() => router.push(`/user/${user.id}`)}
                >
                  <Avatar className="h-8 w-8 overflow-hidden">
                    {profile?.avatar_url ? (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.username || "头像"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-gray-900 text-white text-xs">
                      {(profile?.username || user.user_metadata?.username || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>

                {/* Desktop-only: avatar with dropdown */}
                <div
                className="hidden md:block relative"
                onMouseEnter={openUserMenu}
                onMouseLeave={closeUserMenuSoon}
              >
                <DropdownMenu
                  open={userMenuOpen}
                  onOpenChange={(open) => {
                    if (open) {
                      openUserMenu();
                    } else {
                      setUserMenuOpen(false);
                    }
                  }}
                >
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full ring-2 ring-gray-100 hover:ring-gray-200 transition-all"
                      onClick={() => router.push(`/user/${user.id}`)}
                      onFocus={(event) => {
                        if (event.currentTarget.matches(":focus-visible")) {
                          openUserMenu();
                        }
                      }}
                    />
                  }
                >
                  <Avatar className="h-8 w-8 overflow-hidden">
                    {profile?.avatar_url ? (
                      <AvatarImage
                        src={profile.avatar_url}
                        alt={profile.username || "头像"}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <AvatarFallback className="bg-gray-900 text-white text-xs">
                      {(profile?.username || user.user_metadata?.username || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={2}
                  className="w-52 rounded-xl shadow-lg border-gray-100"
                  onMouseEnter={openUserMenu}
                  onMouseLeave={closeUserMenuSoon}
                >
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {profile?.username || user.user_metadata?.username || "用户"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push(`/user/${user.id}`)} className="gap-2.5 py-2">
                    <User className="h-4 w-4 text-gray-400" />
                    个人主页
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/me")} className="gap-2.5 py-2">
                    <Images className="h-4 w-4 text-gray-400" />
                    我的照片
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/upload")} className="gap-2.5 py-2">
                    <Upload className="h-4 w-4 text-gray-400" />
                    上传照片
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await handleLogout();
                    }}
                    className="text-red-600 gap-2.5 py-2"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 text-sm rounded-full h-9 px-4 hover:bg-gray-50">
                    登录
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="sm" className="text-sm rounded-full h-9 px-5 bg-gray-900 hover:bg-gray-800 shadow-sm">
                    注册
                  </Button>
                </Link>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 rounded-full"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 pb-4 animate-in slide-in-from-top-2 duration-200">
            {/* User info banner on mobile */}
            {user && profile && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2 mx-2 rounded-xl bg-gray-50/80">
                <Avatar className="h-9 w-9 overflow-hidden">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.username || "头像"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <AvatarFallback className="bg-gray-900 text-white text-xs">
                    {(profile.username || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {profile.username || "用户"}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
            )}

            <div className="space-y-0.5 px-2">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <Home className="h-4 w-4" />
                </div>
                首页
              </Link>
              <Link
                href="/search"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/search") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/search") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <Search className="h-4 w-4" />
                </div>
                搜索照片
              </Link>
              <Link
                href="/portfolios"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/portfolios") || isActive("/portfolio") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/portfolios") || isActive("/portfolio") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                  <BookImage className="h-4 w-4" />
                </div>
                作品集
              </Link>
              {user && (
                <>
                  <Link
                    href="/upload"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/upload") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/upload") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Upload className="h-4 w-4" />
                    </div>
                    上传照片
                  </Link>
                  <Link
                    href="/me"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/me") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/me") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Images className="h-4 w-4" />
                    </div>
                    我的照片
                  </Link>
                  <Link
                    href="/notifications"
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors ${isActive("/notifications") ? "text-gray-900 bg-gray-100 font-medium" : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"}`}
                  >
                    <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${isActive("/notifications") ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500"}`}>
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    消息通知
                  </Link>
                  <div className="my-2 mx-3 border-t border-gray-100" />
                  <button
                    onClick={async () => {
                      setMobileOpen(false);
                      await handleLogout();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors w-full"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500">
                      <LogOut className="h-4 w-4" />
                    </div>
                    退出登录
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
