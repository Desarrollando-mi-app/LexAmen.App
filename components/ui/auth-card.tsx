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
          <div className="flex flex-col items-center mb-4">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={192}
              height={192}
              className="h-[192px] w-[192px]"
              priority
            />
            <span className="mt-3 font-cormorant text-[26px] !font-bold text-gz-ink leading-none tracking-[-0.01em]">
              Studio <span className="italic font-normal text-gz-red">IURIS</span>
            </span>
          </div>
          <h2 className="mt-6 font-cormorant text-[22px] !font-bold text-gz-ink">{title}</h2>
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
