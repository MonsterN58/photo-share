import { Camera } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Camera className="h-4 w-4" />
            <span className="text-sm">PhotoShare</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              探索
            </Link>
            <span>© {new Date().getFullYear()} PhotoShare</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
