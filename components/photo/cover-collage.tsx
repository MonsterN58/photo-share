import Image from "next/image";
import { BookImage } from "lucide-react";
import { ImageProtectionOverlay } from "@/components/photo/image-protection-overlay";
import { parseCoverUrls } from "@/lib/cover";
import { shouldBypassImageOptimization } from "@/lib/image-url";

interface CoverCollageProps {
  coverUrl?: string | null;
  urls?: string[];
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

export function CoverCollage({
  coverUrl,
  urls,
  alt,
  sizes = "100vw",
  priority = false,
  className = "",
  imageClassName = "",
  fallbackClassName = "",
}: CoverCollageProps) {
  const coverUrls = (urls ?? parseCoverUrls(coverUrl)).slice(0, 4);

  if (coverUrls.length === 0) {
    return (
      <div className={`flex h-full w-full items-center justify-center bg-gray-100 ${fallbackClassName}`}>
        <BookImage className="h-12 w-12 text-gray-300" />
      </div>
    );
  }

  return (
    <div className={`grid h-full w-full grid-cols-3 grid-rows-2 gap-0.5 bg-white ${className}`}>
      {coverUrls.map((url, index) => (
        <div key={`${url}-${index}`} className={`relative overflow-hidden bg-gray-100 ${getTileClass(coverUrls.length, index)}`}>
          <Image
            src={url}
            alt={alt}
            fill
            className={`photo-protected object-cover ${imageClassName}`}
            sizes={sizes}
            priority={priority && index === 0}
            unoptimized={shouldBypassImageOptimization(url)}
            draggable={false}
          />
          <ImageProtectionOverlay />
        </div>
      ))}
    </div>
  );
}

function getTileClass(count: number, index: number) {
  if (count === 1) return "col-span-3 row-span-2";
  if (count === 2) return index === 0 ? "col-span-2 row-span-2" : "row-span-2";
  if (count === 3) return index === 0 ? "col-span-2 row-span-2" : "";
  if (index === 0 || index === 3) return "col-span-2";
  return "";
}
