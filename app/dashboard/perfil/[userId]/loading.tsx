export default function PerfilLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8 space-y-8">
        {/* Header skeleton */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="flex items-start gap-5">
            <div className="h-16 w-16 animate-pulse rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <div className="h-10 w-36 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white p-4 text-center"
            >
              <div className="mx-auto h-7 w-16 animate-pulse rounded bg-gray-200" />
              <div className="mx-auto mt-1 h-3 w-20 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>

        {/* Badges skeleton */}
        <div className="rounded-xl border border-border bg-white p-6">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 grid grid-cols-3 gap-4 sm:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto h-8 w-8 animate-pulse rounded-full bg-gray-200" />
                <div className="mx-auto mt-1 h-3 w-16 animate-pulse rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
