"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";

const SORT_OPTIONS = [
  { value: "latest", label: "最新" },
  { value: "popular", label: "最热" },
] as const;

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSort = searchParams.get("sort") || "latest";

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", sort);
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {SORT_OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={currentSort === opt.value ? "default" : "ghost"}
          size="sm"
          onClick={() => handleSort(opt.value)}
          className={
            currentSort === opt.value
              ? "text-sm"
              : "text-sm text-gray-500 hover:text-gray-900"
          }
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
