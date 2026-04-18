"use client";

import { useEffect, useMemo, useState } from "react";

interface DynamicWatermarkProps {
  title: string;
  className?: string;
}

const WATERMARK_TILE_COUNT = 12;

function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getSessionWatermarkId() {
  const key = "photo-share-watermark-id";
  const existing = window.sessionStorage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = Math.random().toString(36).slice(2, 8).toUpperCase();
  window.sessionStorage.setItem(key, next);
  return next;
}

export function DynamicWatermark({
  title,
  className = "absolute inset-0 z-[2] overflow-hidden pointer-events-none select-none",
}: DynamicWatermarkProps) {
  const [sessionId] = useState(() =>
    typeof window === "undefined" ? "------" : getSessionWatermarkId()
  );
  const [timestamp, setTimestamp] = useState(() => formatTimestamp(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimestamp(formatTimestamp(new Date()));
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const text = useMemo(() => {
    const normalizedTitle = title.trim() || "未命名照片";
    return `NKU印象 · ${normalizedTitle} · ${timestamp} · ${sessionId}`;
  }, [sessionId, timestamp, title]);

  return (
    <div className={className} aria-hidden="true">
      <div className="watermark-layer absolute inset-[-18%]">
        {Array.from({ length: WATERMARK_TILE_COUNT }, (_, index) => {
          const column = index % 3;
          const row = Math.floor(index / 3);
          return (
            <div
              key={`${text}-${index}`}
              className="watermark-tile absolute text-[10px] font-medium uppercase tracking-[0.28em] text-white/18 drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)] sm:text-xs"
              style={{
                left: `${column * 33 + (row % 2 === 0 ? 1 : 8)}%`,
                top: `${row * 24 + (column % 2 === 0 ? 4 : 10)}%`,
                animationDelay: `${index * 0.6}s`,
              }}
            >
              <div className="watermark-chip rounded-full border border-white/12 bg-black/10 px-3 py-1 backdrop-blur-[1px]">
                {text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
