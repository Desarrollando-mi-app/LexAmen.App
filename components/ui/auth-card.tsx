interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-navy">LéxAmen</h1>
          <h2 className="mt-2 text-xl font-semibold text-navy">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-navy/60">{subtitle}</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
          {children}
        </div>

        {footer && (
          <div className="mt-4 text-center text-sm text-navy/60">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
