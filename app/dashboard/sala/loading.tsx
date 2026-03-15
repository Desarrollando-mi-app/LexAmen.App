export default function SalaLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Sub-header skeleton */}
        <div className="mb-6">
          <div className="h-6 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-3 w-64 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1 mb-6">
          <div className="h-9 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-36 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Cards grid skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[4px] border border-gz-rule bg-white p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gz-cream-dark" />
                <div className="space-y-1.5">
                  <div className="h-4 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                  <div className="h-3 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-4 w-3/4 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-sm bg-gz-cream-dark" />
                <div className="h-6 w-16 animate-pulse rounded-sm bg-gz-cream-dark" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
