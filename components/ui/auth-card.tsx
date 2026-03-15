import Image from "next/image";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex flex-col items-center mb-2">
            <Image
              src="/brand/logo-horizontal.svg"
              alt="Studio Iuris"
              width={240}
              height={52}
              className="h-[48px] w-auto mb-2"
              priority
            />
          </div>
          <h2 className="mt-2 font-cormorant text-[22px] !font-bold text-gz-ink">{title}</h2>
          {subtitle && (
            <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">{subtitle}</p>
          )}
        </div>

        <div className="rounded-[4px] border border-gz-rule bg-white p-8 shadow-sm">
          {children}
        </div>

        {footer && (
          <div className="mt-4 text-center font-archivo text-[13px] text-gz-ink-mid">
            {footer}
          </div>
        )}
      </div>
    </main>
  );
}
