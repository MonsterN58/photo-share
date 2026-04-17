"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Upload, User, LogOut, Menu, X } from "lucide-react";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";

export function Navbar() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Camera className="h-6 w-6 text-gray-900 group-hover:text-gray-600 transition-colors" />
            <span className="text-lg font-semibold text-gray-900 tracking-tight">
              PhotoShare
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm">
                探索
              </Button>
            </Link>
            {user && (
              <>
                <Link href="/upload">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm gap-1.5">
                    <Upload className="h-4 w-4" />
                    上传
                  </Button>
                </Link>
                <Link href="/me">
                  <Button variant="ghost" className="text-gray-600 hover:text-gray-900 text-sm">
                    我的照片
                  </Button>
                </Link>
              </>
            )}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" className="rounded-full" />}
                >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-gray-900 text-white text-xs">
                        {(user.user_metadata?.username || user.email || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.user_metadata?.username || "用户"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/me")}>
                    <User className="h-4 w-4 mr-2" />
                    我的照片
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/upload")}>
                    <Upload className="h-4 w-4 mr-2" />
                    上传照片
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                    }}
                    className="text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 text-sm">
                    登录
                  </Button>
                </Link>
                <Link href="/login?tab=register">
                  <Button size="sm" className="text-sm">
                    注册
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-3 space-y-1">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              探索
            </Link>
            {user && (
              <>
                <Link
                  href="/upload"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
                  上传照片
                </Link>
                <Link
                  href="/me"
                  onClick={() => setMobileOpen(false)}
                  className="block px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                >
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
