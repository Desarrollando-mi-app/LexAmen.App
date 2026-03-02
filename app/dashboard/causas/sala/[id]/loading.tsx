export default function SalaDetailLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <div className="h-7 w-36 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question area */}
          <div className="lg:col-span-2">
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

          {/* Leaderboard sidebar */}
          <div className="rounded-xl border border-border bg-white p-5">
            <div className="h-5 w-28 animate-pulse rounded bg-gray-200 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-gray-200" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="ml-auto h-4 w-10 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
