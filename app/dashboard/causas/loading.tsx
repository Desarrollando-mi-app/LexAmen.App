export default function CausasLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Page header skeleton */}
        <div className="mb-6">
          <div className="h-3 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-8 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark mb-3" />
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2 border border-gz-rule rounded-[4px] p-1 mb-6">
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
            <div className="h-8 w-12 animate-pulse rounded-[3px] bg-gz-cream-dark mb-1" />
            <div className="h-4 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          </div>
          <div className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
            <div className="h-8 w-12 animate-pulse rounded-[3px] bg-gz-cream-dark mb-1" />
            <div className="h-4 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          </div>
        </div>

        {/* Challenge form skeleton */}
        <div className="rounded-[4px] border border-gz-rule p-5" style={{ backgroundColor: "var(--gz-cream)" }}>
          <div className="h-5 w-36 animate-pulse rounded-[3px] bg-gz-cream-dark mb-4" />
          <div className="flex gap-3">
            <div className="h-10 flex-1 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            <div className="h-10 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          </div>
        </div>

        {/* Pending list skeleton */}
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-[4px] border border-gz-rule p-4"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-gz-cream-dark" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-3 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              </div>
              <div className="h-8 w-16 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
