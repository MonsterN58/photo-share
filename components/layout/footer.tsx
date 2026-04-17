import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50/50 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-gray-400">
            <Image
              src="/nku-logo.png"
              alt="NKU印象"
              width={20}
              height={20}
              className="h-5 w-5 object-contain opacity-60"
            />
            <span className="text-sm">NKU印象</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-400">
            <Link href="/" className="hover:text-gray-600 transition-colors">
              首页
            </Link>
            <Link href="/search" className="hover:text-gray-600 transition-colors">
              搜索
            </Link>
            <span>© {new Date().getFullYear()} NKU印象</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
