"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Eye, Heart, Images, BookImage } from "lucide-react";
import type { Portfolio } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CoverCollage } from "@/components/photo/cover-collage";

interface PortfolioListProps {
  initialPortfolios: Portfolio[];
}

export function PortfolioList({ initialPortfolios }: PortfolioListProps) {
  if (initialPortfolios.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-24 text-center">
        <BookImage className="mx-auto mb-3 h-12 w-12 text-gray-200" />
        <p className="text-sm text-gray-400">暂无作品集</p>
        <p className="text-xs text-gray-300 mt-1">上传多张照片后可自动创建作品集</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {initialPortfolios.map((portfolio) => (
        <PortfolioCard key={portfolio.id} portfolio={portfolio} />
      ))}
    </div>
  );
}

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const username = portfolio.profiles?.username || "匿名";
  const avatarUrl = portfolio.profiles?.avatar_url;

  return (
    <article className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Cover image */}
      <Link href={`/portfolio/${portfolio.id}`} className="relative block aspect-[3/2] overflow-hidden bg-gray-100">
        {portfolio.cover_url ? (
          <CoverCollage
            coverUrl={portfolio.cover_url}
            alt={portfolio.title}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            imageClassName="transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 via-gray-150 to-gray-200">
            <BookImage className="h-12 w-12 text-gray-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full flex items-center gap-1 font-medium">
          <Images className="h-3 w-3" />
          {portfolio.photo_count || 0}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between p-4 gap-3">
        <div>
          <Link
            href={`/portfolio/${portfolio.id}`}
            className="block text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors truncate leading-snug"
          >
            {portfolio.title}
          </Link>
          {portfolio.description && (
            <p className="description-clamp mt-1 line-clamp-2 text-sm leading-relaxed text-gray-500">{portfolio.description}</p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Link
            href={`/user/${portfolio.user_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity min-w-0"
          >
            <Avatar className="h-6 w-6 overflow-hidden shrink-0">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username} className="h-full w-full object-cover" />
              ) : null}
              <AvatarFallback className="bg-gray-800 text-white text-[10px]">
                {username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-gray-600 truncate">{username}</span>
          </Link>

          <div className="flex items-center gap-2.5 text-[11px] text-gray-400 shrink-0">
            <span className="flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {(portfolio.total_views || 0).toLocaleString()}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="h-3 w-3" />
              {portfolio.total_likes || 0}
            </span>
            <span className="hidden sm:inline">
              {formatDistanceToNow(new Date(portfolio.created_at), {
                addSuffix: true,
                locale: zhCN,
              })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
