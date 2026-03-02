export default function LigaLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
            <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-xl border border-border bg-white overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b border-border px-5 py-3 bg-paper/50">
            <div className="h-4 w-6 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Rows */}
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0"
            >
              <div className="h-5 w-6 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
              <div className="ml-auto h-5 w-14 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
