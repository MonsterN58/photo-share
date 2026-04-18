import { getPublicPortfoliosForMode } from "@/lib/db-read";
import { PortfolioList } from "./client";

export default async function PortfoliosPage() {
  const portfolios = await getPublicPortfoliosForMode(0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">作品集</h1>
        <p className="mt-1.5 text-sm text-gray-500">探索优秀摄影师的作品合集</p>
      </div>
      <PortfolioList initialPortfolios={portfolios} />
    </div>
  );
}
