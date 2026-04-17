"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useUser } from "@/hooks/use-user";

export function FloatingUploadButton() {
  const { user } = useUser();

  if (!user) return null;

  return (
    <Link
      href="/upload"
      className="fixed right-4 bottom-20 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg shadow-gray-900/25 transition-all duration-300 hover:bg-gray-800 hover:shadow-xl hover:scale-105 active:scale-95 md:hidden"
      aria-label="上传照片"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
