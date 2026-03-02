"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Inicio" },
  { href: "/dashboard/flashcards", icon: "📚", label: "Estudiar" },
  { href: "/dashboard/causas", icon: "⚔️", label: "Causas" },
  { href: "/dashboard/liga", icon: "🏆", label: "Liga" },
  { href: "/dashboard/sala", icon: "🏛️", label: "La Sala" },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch">
        {NAV_ITEMS.map((item) => {
          // "Estudiar" matches flashcards, mcq, truefalse
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
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive
                  ? "text-gold"
                  : "text-navy/40 hover:text-navy/60"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[10px] font-medium leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
