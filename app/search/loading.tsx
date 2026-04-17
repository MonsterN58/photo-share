export default function SearchLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="max-w-2xl mx-auto mb-10 space-y-4 text-center">
        <div className="h-8 w-32 bg-gray-100 rounded animate-pulse mx-auto" />
        <div className="h-4 w-48 bg-gray-50 rounded animate-pulse mx-auto" />
        <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
      </div>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 [&>div]:mb-2">
        {[280, 320, 260, 340, 300, 370].map((h, i) => (
          <div key={i} className="break-inside-avoid">
            <div
              className="w-full rounded bg-gray-100 animate-pulse"
              style={{ height: `${h}px` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
