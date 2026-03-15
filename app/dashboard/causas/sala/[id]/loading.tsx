export default function SalaDetailLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Page header skeleton */}
        <div className="mb-6">
          <div className="h-3 w-36 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-8 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark mb-3" />
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question area */}
          <div className="lg:col-span-2">
            <div className="rounded-[4px] border border-gz-rule p-8" style={{ backgroundColor: "var(--gz-cream)" }}>
              <div className="h-4 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark mb-6" />
              <div className="space-y-2 mb-8">
                <div className="h-5 w-full animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-5 w-4/5 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-[4px] border border-gz-rule p-4"
                  >
                    <div className="h-5 w-5 animate-pulse rounded-full bg-gz-cream-dark" />
                    <div className="h-4 w-3/4 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaderboard sidebar */}
          <div className="rounded-[4px] border border-gz-rule p-5" style={{ backgroundColor: "var(--gz-cream)" }}>
            <div className="h-5 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-gz-cream-dark" />
                  <div className="h-4 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                  <div className="ml-auto h-4 w-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
