export default function FlashcardsLoading() {
  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-8">
        {/* Title + filters skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex gap-3">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        </div>

        {/* Flashcard skeleton */}
        <div className="mt-8 mx-auto max-w-lg">
          <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200 mb-4" />
            <div className="space-y-3 py-8">
              <div className="h-5 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 mt-4" />
          </div>

          {/* Controls skeleton */}
          <div className="mt-6 flex items-center justify-between">
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
            <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    </main>
  );
}
