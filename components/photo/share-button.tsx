"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Link as LinkIcon, QrCode, Share2 } from "lucide-react";
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
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/photo/${photoId}`
      : `/photo/${photoId}`;

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
    toast.success("链接已复制");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            />
            <Button size="sm" onClick={copyLink} className="gap-1.5 shrink-0">
              <LinkIcon className="h-4 w-4" />
              复制
            </Button>
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
