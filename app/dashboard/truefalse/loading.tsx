export default function TrueFalseLoading() {
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

        {/* Statement card skeleton */}
        <div className="mt-8 rounded-2xl border border-border bg-white p-8 shadow-sm">
          <div className="h-4 w-24 animate-pulse rounded bg-gray-200 mb-6" />
          <div className="space-y-2 mb-8 py-4">
            <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>

          {/* True/False buttons skeleton */}
          <div className="flex gap-4">
            <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-12 flex-1 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
