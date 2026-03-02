export default function SalaLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Title */}
        <div className="h-8 w-28 animate-pulse rounded bg-gray-200 mb-2" />
        <div className="h-4 w-64 animate-pulse rounded bg-gray-200 mb-6" />

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
                <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
