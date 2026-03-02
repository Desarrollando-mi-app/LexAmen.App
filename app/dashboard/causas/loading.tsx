export default function CausasLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Title */}
        <div className="h-8 w-24 animate-pulse rounded bg-gray-200 mb-2" />
        <div className="h-4 w-56 animate-pulse rounded bg-gray-200 mb-6" />

        {/* Tabs skeleton */}
        <div className="flex gap-2 mb-6">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="h-8 w-12 animate-pulse rounded bg-gray-200 mb-1" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <div className="h-8 w-12 animate-pulse rounded bg-gray-200 mb-1" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        {/* Challenge form skeleton */}
        <div className="rounded-xl border border-border bg-white p-5">
          <div className="h-5 w-36 animate-pulse rounded bg-gray-200 mb-4" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* Pending list skeleton */}
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-4"
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-lg bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
