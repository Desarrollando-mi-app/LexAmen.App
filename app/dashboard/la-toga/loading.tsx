export default function LaTogaLoading() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-5xl px-4 lg:px-10 py-8">
        <div className="h-8 w-40 animate-pulse rounded bg-gz-cream-dark mb-6" />
        <div className="h-32 w-full animate-pulse rounded bg-gz-cream-dark mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="h-10 w-full animate-pulse rounded bg-gz-cream-dark"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
