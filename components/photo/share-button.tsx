"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Check, Link as LinkIcon, Loader2, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareButtonProps {
  photoId: string;
  title: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "icon";
  className?: string;
  iconOnly?: boolean;
}

export function ShareButton({
  photoId,
  title,
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [loadingShort, setLoadingShort] = useState(false);
  const [copied, setCopied] = useState(false);

  const longUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/photo/${photoId}`
      : `/photo/${photoId}`;

  const shareUrl = shortUrl || longUrl;

  const fetchShortUrl = useCallback(async () => {
    setLoadingShort(true);
    try {
      const response = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json().catch(() => null)) as { url?: string } | null;
      if (data?.url) {
        setShortUrl(data.url);
      }
    } finally {
      setLoadingShort(false);
    }
  }, [photoId]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (nextOpen && !shortUrl && !loadingShort) {
        void fetchShortUrl();
      }
    },
    [fetchShortUrl, loadingShort, shortUrl]
  );

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#111111", light: "#ffffff" },
      });
    }
  }, [open, shareUrl]);

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("链接已复制");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={className}
            aria-label="分享照片"
          />
        }
      >
        <Share2 className="h-4 w-4" />
        {!iconOnly && "分享"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享照片</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="truncate text-sm text-gray-500">{title}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  readOnly
                  value={loadingShort ? "生成短链中…" : shareUrl}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 pr-8"
                />
                {loadingShort && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              <Button
                size="sm"
                onClick={copyLink}
                className="gap-1.5 shrink-0"
                disabled={loadingShort}
              >
                {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
                {copied ? "已复制" : "复制"}
              </Button>
            </div>
            {shortUrl && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                已生成短链接，更简洁易分享
              </p>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <QrCode className="h-4 w-4" />
              扫码分享
            </div>
            <canvas ref={canvasRef} className="rounded-lg" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
