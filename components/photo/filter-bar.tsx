"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

const SORT_OPTIONS = [
  { value: "latest", label: "最新" },
  { value: "popular", label: "最热" },
] as const;

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentSort = searchParams.get("sort") || "latest";

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center bg-gray-50 rounded-full p-0.5 gap-0.5">
      {SORT_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={currentSort === opt.value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleSort(opt.value)}
          className={
            currentSort === opt.value
              ? "text-xs h-8 rounded-full shadow-sm"
              : "text-xs h-8 rounded-full text-gray-500 hover:text-gray-900 hover:bg-white"
          }
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
