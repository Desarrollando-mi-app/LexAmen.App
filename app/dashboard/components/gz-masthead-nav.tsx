"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";

/* ─── Navigation structure ─── */

interface SubItem {
  href: string;
  label: string;
  badge?: string; // e.g. "PRÓXIMO"
}

interface NavItem {
  href: string;
  label: string;
  children?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Escritorio",
    children: [
      { href: "/dashboard/progreso", label: "Mi Progreso" },
      { href: "/dashboard/calendario", label: "Calendario" },
      { href: "/dashboard/estadisticas", label: "Mis Estadísticas" },
    ],
  },
  {
    href: "/dashboard/indice-maestro",
    label: "Materias",
  },
  {
    href: "/dashboard/estudios",
    label: "Estudios",
    children: [
      { href: "/dashboard/flashcards", label: "Flashcards" },
      { href: "/dashboard/mcq", label: "MCQ" },
      { href: "/dashboard/truefalse", label: "Verdadero / Falso" },
      { href: "/dashboard/simulacro", label: "Simulacro Oral" },
    ],
  },
  {
    href: "/dashboard/causas",
    label: "Causas",
    children: [
      { href: "/dashboard/causas?mode=relampage", label: "1v1" },
      { href: "/dashboard/causas?mode=2v2", label: "2v2" },
      { href: "/dashboard/causas?mode=individual", label: "Desafío Grupal" },
    ],
  },
  {
    href: "/dashboard/sala",
    label: "La Sala",
    children: [
      { href: "/dashboard/sala", label: "Ayudantías" },
      { href: "/dashboard/sala/pasantias", label: "Pasantías" },
      { href: "/dashboard/sala/eventos", label: "Eventos" },
      { href: "/dashboard/sala/ofertas", label: "Ofertas de Trabajo" },
    ],
  },
  {
    href: "/dashboard/diario",
    label: "El Diario",
    children: [
      { href: "/dashboard/diario", label: "Feed" },
      { href: "/dashboard/diario?tab=analisis", label: "Análisis de Sentencia" },
      { href: "/dashboard/diario?tab=ensayos", label: "Ensayos" },
      { href: "/dashboard/diario/analisis/nuevo", label: "Nuevo Análisis" },
      { href: "/dashboard/diario/ensayos/nuevo", label: "Nuevo Ensayo" },
    ],
  },
  {
    href: "/dashboard/perfil",
    label: "Perfil",
  },
];

/* ─── Active detection ─── */

function isItemActive(item: NavItem, pathname: string): boolean {
  // Exact match for dashboard home
  if (item.href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/progreso" ||
      pathname === "/dashboard/calendario" ||
      pathname === "/dashboard/estadisticas"
    );
  }

  // Materias: exact match
  if (item.href === "/dashboard/indice-maestro") {
    return pathname.startsWith("/dashboard/indice-maestro");
  }

  // Estudios: match its own route + all study sub-routes
  if (item.href === "/dashboard/estudios") {
    return (
      pathname === "/dashboard/estudios" ||
      pathname.startsWith("/dashboard/flashcards") ||
      pathname.startsWith("/dashboard/mcq") ||
      pathname.startsWith("/dashboard/truefalse") ||
      pathname.startsWith("/dashboard/simulacro")
    );
  }

  // Default: starts with the item's href
  return pathname.startsWith(item.href);
}

/* ─── Component ─── */

const HOVER_DELAY = 150; // ms before closing dropdown

export function GzMastheadNav() {
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleEnter = useCallback(
    (idx: number) => {
      clearTimer();
      setOpenIndex(idx);
    },
    [clearTimer]
  );

  const handleLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setOpenIndex(null);
    }, HOVER_DELAY);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenIndex(null);
  }, [pathname]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return (
    <nav className="hidden lg:flex justify-center gap-0 mt-3.5 border-t border-gz-rule pt-2.5">
      {NAV_ITEMS.map((item, i) => {
        const active = isItemActive(item, pathname);
        const isOpen = openIndex === i && !!item.children;
        const isLast = i === NAV_ITEMS.length - 1;

        return (
          <div
            key={item.href}
            className="relative"
            onMouseEnter={() => item.children && handleEnter(i)}
            onMouseLeave={handleLeave}
          >
            {/* Top-level link */}
            <Link
              href={item.href}
              className={`
                block font-archivo text-[11px] font-semibold uppercase tracking-[2px]
                px-[18px] py-1 transition-colors hover:text-gz-gold
                ${!isLast ? "border-r border-gz-rule" : ""}
                ${active ? "text-gz-ink font-bold" : "text-gz-ink-mid"}
              `}
            >
              {item.label}
              {item.children && (
                <span
                  className={`ml-1 inline-block text-[8px] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              )}
            </Link>

            {/* Dropdown */}
            {item.children && (
              <div
                className={`
                  absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50
                  min-w-[200px] py-2
                  border border-gz-rule rounded-sm shadow-sm
                  transition-all duration-200 origin-top
                  ${
                    isOpen
                      ? "opacity-100 scale-y-100 pointer-events-auto"
                      : "opacity-0 scale-y-95 pointer-events-none"
                  }
                `}
                style={{ backgroundColor: "var(--gz-cream)" }}
                onMouseEnter={() => handleEnter(i)}
                onMouseLeave={handleLeave}
              >
                {/* Caret arrow */}
                <div
                  className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-l border-t border-gz-rule"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />

                {item.children.map((sub) => {
                  const subActive =
                    sub.href.includes("?")
                      ? pathname + (typeof window !== "undefined" ? window.location.search : "") === sub.href
                      : pathname === sub.href || pathname.startsWith(sub.href + "/");

                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`
                        block px-4 py-2 font-archivo text-[12px] tracking-[0.5px]
                        transition-colors hover:bg-gz-gold/10 hover:text-gz-gold
                        ${subActive ? "text-gz-gold font-semibold" : "text-gz-ink-mid"}
                      `}
                    >
                      {sub.label}
                      {sub.badge && (
                        <span className="ml-2 font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light border border-gz-rule rounded-full px-2 py-0.5">
                          {sub.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
