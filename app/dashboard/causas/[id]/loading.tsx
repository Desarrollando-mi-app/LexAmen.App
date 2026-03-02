export default function CausaDetailLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
        </div>

        {/* Score bar skeleton */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4 mb-8">
          <div className="text-center space-y-1">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mx-auto" />
            <div className="h-8 w-10 animate-pulse rounded bg-gray-200 mx-auto" />
          </div>
          <div className="h-6 w-8 animate-pulse rounded bg-gray-200" />
          <div className="text-center space-y-1">
            <div className="h-4 w-16 animate-pulse rounded bg-gray-200 mx-auto" />
            <div className="h-8 w-10 animate-pulse rounded bg-gray-200 mx-auto" />
          </div>
        </div>

        {/* Question card skeleton */}
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200 mb-6" />
          <div className="space-y-2 mb-8">
            <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
          </div>
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
        </div>
      </div>
    </main>
  );
}
