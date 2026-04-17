"use client";

interface ImageProtectionOverlayProps {
  className?: string;
}

export function ImageProtectionOverlay({
  className = "absolute inset-0 z-[1]",
}: ImageProtectionOverlayProps) {
  return (
    <div
      className={className}
      onContextMenu={(event) => event.preventDefault()}
      onDragStart={(event) => event.preventDefault()}
    />
  );
}