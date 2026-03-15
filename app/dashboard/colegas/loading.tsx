export default function ColegasLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-6">
        {/* Page header skeleton */}
        <div>
          <div className="h-3 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-8 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark mb-3" />
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        {/* Search skeleton */}
        <div className="h-11 w-full animate-pulse rounded-[4px] bg-gz-cream-dark" />

        {/* Tabs skeleton */}
        <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1">
          <div className="h-9 flex-1 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 flex-1 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 flex-1 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* List skeleton */}
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-[4px] border border-gz-rule p-4"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gz-cream-dark" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                  <div className="h-3 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                </div>
              </div>
              <div className="h-8 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
