/* eslint-disable @next/next/no-img-element */
export default function DashboardLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* Centered logo pulse */}
      <div className="flex flex-col items-center justify-center py-8">
        <img
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={100}
          height={48}
          className="h-[80px] w-[80px] lg:h-[100px] lg:w-[100px] animate-pulse mb-3"
        />
        <span className="font-ibm-mono text-[10px] text-gz-ink-light uppercase tracking-[2px]">
          Cargando...
        </span>
      </div>
      <div className="mx-auto flex max-w-[1440px] gap-6 px-4 py-6">
        {/* Left sidebar skeleton */}
        <aside className="hidden lg:block w-[280px] shrink-0">
          <div className="space-y-4">
            <div className="rounded-[4px] border border-gz-rule bg-white p-5">
              <div className="h-5 w-32 animate-pulse rounded bg-gz-cream-dark mb-4" />
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              </div>
            </div>
            <div className="rounded-[4px] border border-gz-rule bg-white p-5">
              <div className="h-5 w-24 animate-pulse rounded bg-gz-cream-dark mb-4" />
              <div className="space-y-3">
                <div className="h-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
                <div className="h-10 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              </div>
            </div>
          </div>
        </aside>

        {/* Center skeleton */}
        <div className="min-w-0 flex-1">
          {/* Saludo */}
          <div className="h-8 w-48 animate-pulse rounded bg-gz-cream-dark" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gz-cream-dark" />

          {/* Stat cards */}
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-[4px] border border-gz-rule bg-white p-4"
              >
                <div className="h-10 w-10 animate-pulse rounded-full bg-gz-cream-dark" />
                <div className="space-y-2">
                  <div className="h-6 w-12 animate-pulse rounded bg-gz-cream-dark" />
                  <div className="h-3 w-16 animate-pulse rounded bg-gz-cream-dark" />
                </div>
              </div>
            ))}
          </div>

          {/* Activity grid skeleton */}
          <div className="mt-8 rounded-[4px] border border-gz-rule bg-white p-5">
            <div className="h-5 w-36 animate-pulse rounded bg-gz-cream-dark mb-4" />
            <div className="h-28 animate-pulse rounded bg-gz-cream-dark" />
          </div>

          {/* Mobile grid skeleton */}
          <div className="mt-6 grid grid-cols-3 gap-3 lg:hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[4px] border border-gz-rule bg-white p-3 text-center"
              >
                <div className="mx-auto h-6 w-6 animate-pulse rounded bg-gz-cream-dark" />
                <div className="mx-auto mt-2 h-3 w-16 animate-pulse rounded bg-gz-cream-dark" />
              </div>
            ))}
          </div>

          {/* Curriculum skeleton */}
          <div className="mt-10">
            <div className="h-6 w-48 animate-pulse rounded bg-gz-cream-dark mb-4" />
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              <div className="h-12 animate-pulse rounded-[3px] bg-gz-cream-dark" />
              <div className="h-12 animate-pulse rounded-[3px] bg-gz-cream-dark" />
            </div>
          </div>
        </div>

        {/* Right sidebar skeleton */}
        <aside className="hidden lg:block w-[260px] shrink-0">
          <div className="rounded-[4px] border border-gz-rule bg-white p-5">
            <div className="h-5 w-20 animate-pulse rounded bg-gz-cream-dark mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 animate-pulse rounded-full bg-gz-cream-dark" />
                  <div className="h-4 w-24 animate-pulse rounded bg-gz-cream-dark" />
                  <div className="ml-auto h-4 w-10 animate-pulse rounded bg-gz-cream-dark" />
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
