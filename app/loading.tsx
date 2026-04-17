export default function HomeLoading() {
  return (
    <section className="mx-auto max-w-[1800px] px-2 sm:px-3 lg:px-4 pt-4 pb-16">
      <div className="flex items-center justify-end mb-3">
        <div className="flex gap-1">
          <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
      <div className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-2 [&>div]:mb-2">
        {[280, 360, 240, 320, 300, 380, 260, 340, 290, 350, 270, 310].map(
          (h, i) => (
            <div key={i} className="break-inside-avoid">
              <div
                className="w-full rounded bg-gray-100 animate-pulse"
                style={{ height: `${h}px` }}
              />
            </div>
          )
        )}
      </div>
    </section>
  );
}
