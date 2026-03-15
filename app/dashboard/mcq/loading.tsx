export default function MCQLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Page header skeleton */}
        <div className="mb-6">
          <div className="h-3 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-8 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark mb-3" />
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        {/* Title + counter */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-5 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-3">
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Question card skeleton */}
        <div className="mt-8 rounded-[4px] border border-gz-rule p-8" style={{ backgroundColor: "var(--gz-cream)" }}>
          <div className="h-4 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark mb-6" />
          <div className="space-y-2 mb-8">
            <div className="h-5 w-full animate-pulse rounded-[3px] bg-gz-cream-dark" />
            <div className="h-5 w-4/5 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          </div>

          {/* Options skeleton */}
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

          <div className="mt-6 h-11 w-full animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>
      </div>
    </main>
  );
}
