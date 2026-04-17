"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Share2, ExternalLink } from "lucide-react";
import type { Photo } from "@/types";
import { useState } from "react";

interface PhotoCardProps {
  photo: Photo;
}

export function PhotoCard({ photo }: PhotoCardProps) {
  const [loaded, setLoaded] = useState(false);
  const aspectRatio = photo.height && photo.width ? photo.height / photo.width : 0.75;

  return (
    <div className="group relative rounded-lg overflow-hidden bg-gray-100">
      <Link href={`/photo/${photo.id}`}>
        <div
          style={{ paddingBottom: `${aspectRatio * 100}%` }}
          className="relative w-full"
        >
          <Image
            src={photo.url}
            alt={photo.title}
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-[1.02] ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onLoad={() => setLoaded(true)}
          />
          {!loaded && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
          <p className="text-sm font-medium truncate">{photo.title}</p>
          <p className="text-xs text-white/80 mt-0.5">
            {photo.profiles?.username || "匿名用户"}
          </p>
        </div>

        {/* Top-right actions */}
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              navigator.clipboard.writeText(
                `${window.location.origin}/photo/${photo.id}`
              );
            }}
            className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md hover:bg-white transition-colors shadow-sm"
            title="分享"
          >
            <Share2 className="h-3.5 w-3.5 text-gray-700" />
          </button>
          <span className="p-1.5 bg-white/90 backdrop-blur-sm rounded-md shadow-sm">
            <ExternalLink className="h-3.5 w-3.5 text-gray-700" />
          </span>
        </div>

        {/* Views */}
        {photo.views > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 text-xs text-white/90 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Eye className="h-3.5 w-3.5" />
            <span>{photo.views}</span>
          </div>
        )}
      </Link>
    </div>
  );
}
