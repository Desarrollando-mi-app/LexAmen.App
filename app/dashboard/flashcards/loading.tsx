export default function FlashcardsLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Page header skeleton */}
        <div className="mb-6">
          <div className="h-3 w-40 animate-pulse rounded-[3px] bg-gz-cream-dark mb-2" />
          <div className="h-8 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark mb-3" />
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>

        {/* Title + filters skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-5 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex gap-3">
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          <div className="h-9 w-28 animate-pulse rounded-[3px] bg-gz-cream-dark" />
        </div>

        {/* Flashcard skeleton */}
        <div className="mt-8 mx-auto max-w-lg">
          <div className="rounded-[4px] border border-gz-rule p-8" style={{ backgroundColor: "var(--gz-cream)" }}>
            <div className="h-4 w-20 animate-pulse rounded-[3px] bg-gz-cream-dark mb-4" />
            <div className="space-y-3 py-8">
              <div className="h-5 w-full animate-pulse rounded-[3px] bg-gz-cream-dark" />
              <div className="h-5 w-3/4 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              <div className="h-5 w-1/2 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            </div>
            <div className="h-4 w-32 animate-pulse rounded-[3px] bg-gz-cream-dark mt-4" />
          </div>

          {/* Controls skeleton */}
          <div className="mt-6 flex items-center justify-between">
            <div className="h-10 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            <div className="h-5 w-16 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            <div className="h-10 w-24 animate-pulse rounded-[3px] bg-gz-cream-dark" />
          </div>
        </div>
      </div>
    </main>
  );
}
