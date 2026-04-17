"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Home, Images, LogOut, Menu, Search, Upload, User, X } from "lucide-react";
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
import { useState } from "react";

export function Navbar() {
  const { user, profile, loading } = useUser();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-gray-200/60 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="relative">
              <Image
                src="/nku-logo.png"
                alt="NKU印象"
                width={36}
                height={36}
                className="h-8 w-8 sm:h-9 sm:w-9 object-contain transition-transform duration-300 group-hover:scale-105"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
                NKU印象
              </span>
              <span className="hidden sm:block text-[10px] text-gray-400 tracking-widest mt-0.5">
                发现校园瞬间
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center">
            <div className="flex items-center bg-gray-50/80 rounded-full px-1 py-1 gap-0.5">
              <Link href="/">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-white text-sm gap-1.5 rounded-full h-9 px-4 transition-all">
                  <Home className="h-4 w-4" />
                  首页
                </Button>
              </Link>
              <Link href="/search">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-white text-sm gap-1.5 rounded-full h-9 px-4 transition-all">
                  <Search className="h-4 w-4" />
                  搜索
                </Button>
              </Link>
              {user && (
                <>
                  <Link href="/upload">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-white text-sm gap-1.5 rounded-full h-9 px-4 transition-all">
                      <Upload className="h-4 w-4" />
                      上传
                    </Button>
                  </Link>
                  <Link href="/me">
                    <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-white text-sm gap-1.5 rounded-full h-9 px-4 transition-all">
                      <Images className="h-4 w-4" />
                      我的照片
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <div
                className="relative"
                onMouseEnter={() => setUserMenuOpen(true)}
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full ring-2 ring-gray-100 hover:ring-gray-200 transition-all"
                      onMouseDown={() => setUserMenuOpen(true)}
                      onFocus={(event) => {
                        if (event.currentTarget.matches(":focus-visible")) {
                          setUserMenuOpen(true);
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
                <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-gray-100">
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {profile?.username || user.user_metadata?.username || "用户"}
                    </p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/me")} className="gap-2.5 py-2">
                    <User className="h-4 w-4 text-gray-400" />
                    我的照片
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/upload")} className="gap-2.5 py-2">
                    <Upload className="h-4 w-4 text-gray-400" />
                    上传照片
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                    }}
                    className="text-red-600 gap-2.5 py-2"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
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
          <div className="md:hidden border-t border-gray-100 py-2 pb-3 space-y-0.5 animate-in slide-in-from-top-2 duration-200">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4 text-gray-400" />
              首页
            </Link>
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Search className="h-4 w-4 text-gray-400" />
              搜索
            </Link>
            {user && (
              <>
                <Link
                  href="/upload"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Upload className="h-4 w-4 text-gray-400" />
                  上传照片
                </Link>
                <Link
                  href="/me"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Images className="h-4 w-4 text-gray-400" />
                  我的照片
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
