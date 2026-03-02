"use client";

import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/dashboard": "Inicio",
  "/dashboard/flashcards": "Flashcards",
  "/dashboard/mcq": "Selección Múltiple",
  "/dashboard/truefalse": "Verdadero / Falso",
  "/dashboard/liga": "Liga",
  "/dashboard/causas": "Causas",
  "/dashboard/sala": "La Sala",
  "/dashboard/admin": "Panel Admin",
};

export function PageTitle() {
  const pathname = usePathname();

  // Buscar título exacto, luego prefijo más largo
  let title = TITLES[pathname];
  if (!title) {
    const match = Object.entries(TITLES)
      .filter(([path]) => pathname.startsWith(path) && path !== "/dashboard")
      .sort(([a], [b]) => b.length - a.length)[0];
    title = match ? match[1] : "";
  }

  if (!title || pathname === "/dashboard") return null;

  return (
    <span className="text-sm font-semibold text-navy lg:hidden truncate max-w-[160px]">
      {title}
    </span>
  );
}
