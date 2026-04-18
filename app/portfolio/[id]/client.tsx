"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Heart, Images, BookImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhotoCard } from "@/components/photo/photo-card";
import { CoverCollage } from "@/components/photo/cover-collage";
import type { Photo, Portfolio } from "@/types";

interface PortfolioDetailProps {
  portfolio: Portfolio;
  photos: Photo[];
}

export function PortfolioDetail({ portfolio, photos }: PortfolioDetailProps) {
  const username = portfolio.profiles?.username || "匿名";
  const avatarUrl = portfolio.profiles?.avatar_url;
  const totalViews = photos.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLikes = photos.reduce((sum, p) => sum + (p.likes || 0), 0);

  return (
    <div className="min-h-screen">
      {/* Hero cover */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[3/1] overflow-hidden bg-gray-100">
        {portfolio.cover_url ? (
          <CoverCollage
            coverUrl={portfolio.cover_url}
            alt={portfolio.title}
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

        {/* Back button on cover */}
        <div className="absolute top-4 left-4 z-10">
          <Link href="/portfolios">
            <Button variant="ghost" size="sm" className="gap-1.5 text-white/80 hover:text-white hover:bg-white/15 backdrop-blur-sm rounded-full">
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>
          </Link>
        </div>

        {/* Title overlay on cover */}
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-8 pb-6 sm:pb-8">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
              {portfolio.title}
            </h1>
            {portfolio.description && (
              <p className="mt-2 text-sm sm:text-base text-white/75 max-w-2xl leading-relaxed">
                {portfolio.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Info bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/user/${portfolio.user_id}`}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Avatar className="h-9 w-9 overflow-hidden ring-2 ring-gray-100">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : null}
              <AvatarFallback className="bg-gray-800 text-white text-xs">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-gray-900">{username}</p>
              <p className="text-[11px] text-gray-400">作者</p>
            </div>
          </Link>

          <div className="flex items-center gap-4 sm:gap-5">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Images className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{photos.length}</span>
              <span className="text-gray-400 text-xs">张</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Eye className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{totalViews.toLocaleString()}</span>
            </div>
            <div className="h-4 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Heart className="h-4 w-4 text-red-400" />
              <span className="font-medium">{totalLikes.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Photos grid */}
      <div className="mx-auto max-w-5xl px-4 sm:px-8 py-8">
        {photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-24 text-center">
            <BookImage className="mx-auto mb-3 h-12 w-12 text-gray-200" />
            <p className="text-sm text-gray-400">作品集中暂无照片</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {photos.map((photo) => (
              <div key={photo.id} className="break-inside-avoid">
                <PhotoCard photo={photo} hideAuthor />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
