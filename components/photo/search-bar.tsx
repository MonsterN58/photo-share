"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") || "");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const params = new URLSearchParams();
      if (value.trim()) {
        params.set("q", value.trim());
      }
      router.push(`/search?${params.toString()}`);
    },
    [value, router]
  );

  return (
    <form onSubmit={handleSearch} className={className}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="搜索照片、描述或作者..."
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full pl-12 pr-4 h-12 text-base bg-gray-50 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-gray-900/5 focus:border-gray-300 transition-all placeholder:text-gray-400"
        />
      </div>
    </form>
  );
}
