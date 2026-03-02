export default function MCQLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Title + counter */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-3">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Question card skeleton */}
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 mb-6" />
          <div className="space-y-2 mb-8">
            <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Options skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-border p-4"
              >
                <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>

          <div className="mt-6 h-11 w-full animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </main>
  );
}
