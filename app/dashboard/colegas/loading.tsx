export default function ColegasLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Search */}
        <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg bg-border/20 p-1">
          <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 flex-1 animate-pulse rounded-md bg-gray-200" />
        </div>

        {/* List skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-border bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-24 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
