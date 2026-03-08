"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Inicio" },
  { href: "/dashboard/flashcards", icon: "📚", label: "Estudiar" },
  { href: "/dashboard/causas", icon: "⚔️", label: "Causas" },
  { href: "/dashboard/calendario", icon: "📅", label: "Calendario" },
  { href: "/dashboard/colegas", icon: "👥", label: "Colegas" },
];

interface MobileNavProps {
  pendingColegaCount?: number;
}

export function MobileNav({ pendingColegaCount = 0 }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href) ||
                (item.href === "/dashboard/flashcards" &&
                  (pathname.startsWith("/dashboard/mcq") ||
                    pathname.startsWith("/dashboard/truefalse")));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive
                  ? "text-gold"
                  : "text-navy/40 hover:text-navy/60"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
              {item.href === "/dashboard/colegas" &&
                pendingColegaCount > 0 && (
                  <span className="absolute -top-0.5 right-1/2 translate-x-5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {pendingColegaCount > 9 ? "9+" : pendingColegaCount}
                  </span>
                )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
