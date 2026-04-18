"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Eye, Heart, Images, Camera, BookImage } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoCard } from "@/components/photo/photo-card";
import { CoverCollage } from "@/components/photo/cover-collage";
import type { Photo, Portfolio, Profile } from "@/types";

interface UserProfileClientProps {
  profile: Profile;
  stats: { total_views: number; total_likes: number };
  photos: Photo[];
  portfolios: Portfolio[];
}

export function UserProfileClient({
  profile,
  stats,
  photos,
  portfolios,
}: UserProfileClientProps) {
  const [tab, setTab] = useState(portfolios.length > 0 ? "portfolios" : "photos");
  const publicPortfolios = portfolios
    .filter((p) => p.is_public)
    .sort((a, b) => (b.total_likes || 0) - (a.total_likes || 0));
  const sortedPhotos = [...photos].sort((a, b) => (b.likes || 0) - (a.likes || 0));

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Cover with overlay */}
      <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
        {profile.cover_url ? (
          <Image
            src={profile.cover_url}
            alt="封面"
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
      </div>

      {/* Profile card — floats over cover */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative -mt-20 sm:-mt-24 rounded-2xl bg-white shadow-xl shadow-black/5 border border-gray-100/80">
          {/* Top section: avatar + info + stats */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-3 sm:gap-6 px-4 sm:px-8 pt-4 sm:pt-8 pb-4 sm:pb-5">
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 ring-4 ring-white shadow-lg overflow-hidden shrink-0 -mt-16 sm:-mt-24">
              {profile.avatar_url ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-full w-full object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-gray-800 to-gray-900 text-white text-3xl font-semibold">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left min-w-0 sm:pb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{profile.username}</h1>
              {profile.bio && (
                <p className="mt-1.5 text-sm text-gray-500 max-w-md leading-relaxed line-clamp-3 sm:line-clamp-2">{profile.bio}</p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 sm:gap-8 sm:pb-1">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{photos.length}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <Camera className="h-3 w-3" /> 作品
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_views.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <Eye className="h-3 w-3" /> 浏览
                </p>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total_likes.toLocaleString()}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <Heart className="h-3 w-3 text-red-400" /> 获赞
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t border-gray-100">
            <Tabs value={tab} onValueChange={setTab}>
              <div className="px-4 pt-4 sm:px-8">
                <TabsList className="h-auto w-full rounded-lg bg-gray-100/80 p-1 sm:w-auto">
                  <TabsTrigger
                    value="portfolios"
                    className="h-9 flex-1 gap-1.5 rounded-md px-3 text-sm text-gray-500 transition-all hover:text-gray-900 data-active:bg-white data-active:text-gray-900 data-active:shadow-sm data-active:[&_.tab-count]:bg-gray-900 data-active:[&_.tab-count]:text-white sm:flex-none sm:px-4"
                  >
                    <BookImage className="h-4 w-4" />
                    <span>作品集</span>
                    <span className="tab-count rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] leading-none text-gray-500 transition-colors">
                      {publicPortfolios.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="photos"
                    className="h-9 flex-1 gap-1.5 rounded-md px-3 text-sm text-gray-500 transition-all hover:text-gray-900 data-active:bg-white data-active:text-gray-900 data-active:shadow-sm data-active:[&_.tab-count]:bg-gray-900 data-active:[&_.tab-count]:text-white sm:flex-none sm:px-4"
                  >
                    <Camera className="h-4 w-4" />
                    <span>照片</span>
                    <span className="tab-count rounded-full bg-gray-200/80 px-1.5 py-0.5 text-[11px] leading-none text-gray-500 transition-colors">
                      {photos.length}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="px-3 sm:px-8 py-4 sm:py-6">
                <TabsContent value="portfolios" className="mt-0">
                  {publicPortfolios.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center">
                      <BookImage className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">暂无作品集</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      {publicPortfolios.map((portfolio) => (
                        <Link
                          key={portfolio.id}
                          href={`/portfolio/${portfolio.id}`}
                          className="group relative rounded-xl overflow-hidden bg-gray-100 aspect-[3/2] shadow-sm hover:shadow-lg transition-all duration-300"
                        >
                          {portfolio.cover_url ? (
                            <CoverCollage
                              coverUrl={portfolio.cover_url}
                              alt={portfolio.title}
                              sizes="(max-width: 640px) 100vw, 50vw"
                              imageClassName="transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
                              <Images className="h-12 w-12 text-gray-400/60" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                          <div className="absolute bottom-0 left-0 right-0 p-4">
                            <h3 className="text-base font-semibold text-white truncate">{portfolio.title}</h3>
                            {portfolio.description && (
                              <p className="description-clamp mt-0.5 line-clamp-1 text-xs text-white/70">{portfolio.description}</p>
                            )}
                            <div className="mt-2 flex items-center gap-3 text-[11px] text-white/60">
                              <span className="flex items-center gap-1">
                                <Images className="h-3 w-3" /> {portfolio.photo_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <Eye className="h-3 w-3" /> {(portfolio.total_views || 0).toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Heart className="h-3 w-3" /> {portfolio.total_likes || 0}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="photos" className="mt-0">
                  {sortedPhotos.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-20 text-center">
                      <Camera className="mx-auto mb-3 h-10 w-10 text-gray-200" />
                      <p className="text-sm text-gray-400">暂无公开照片</p>
                    </div>
                  ) : (
                    <div className="columns-2 lg:columns-3 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
                      {sortedPhotos.map((photo) => (
                        <div key={photo.id} className="break-inside-avoid">
                          <PhotoCard photo={photo} hideAuthor mobileStatsOnly />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Bottom spacer */}
      <div className="h-16" />
    </div>
  );
}
