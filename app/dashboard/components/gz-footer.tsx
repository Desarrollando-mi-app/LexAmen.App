import Image from "next/image";

export function GzFooter() {
  return (
    <footer className="relative mx-4 lg:mx-10 border-t-2 border-gz-ink pt-5 pb-6 mt-10">
      {/* Second line for double-rule effect */}
      <div className="absolute top-[-4px] left-0 right-0 h-px bg-gz-ink" />
      <div className="flex items-center justify-center gap-3">
        <Image
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={20}
          height={20}
          className="h-[20px] w-[20px] opacity-40"
        />
        <p className="font-ibm-mono text-[10px] text-gz-ink-light tracking-[1.5px] uppercase">
          Studio Iuris · Plataforma de aprendizaje jurídico · Santiago, Chile · 2026
        </p>
      </div>
    </footer>
  );
}
