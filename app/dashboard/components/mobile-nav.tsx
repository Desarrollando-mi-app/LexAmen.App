"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";

/* ─── Sub-item type ─── */

interface SubItem {
  href: string;
  label: string;
  badge?: string;
}

interface MobileNavItem {
  href: string;
  icon: string;
  label: string;
  children?: SubItem[];
}

/* ─── Navigation structure — matches masthead ─── */

const NAV_ITEMS: MobileNavItem[] = [
  {
    href: "/dashboard/noticias",
    icon: "📰",
    label: "Noticias",
  },
  {
    href: "__PERFIL__",
    icon: "👤",
    label: "Perfil",
  },
  {
    href: "/dashboard",
    icon: "🏠",
    label: "Inicio",
    children: [
      { href: "/dashboard", label: "Escritorio" },
      { href: "/dashboard/estadisticas", label: "Estadísticas" },
      { href: "/dashboard/calendario", label: "Calendario" },
      { href: "/dashboard/progreso", label: "Mi Progreso" },
    ],
  },
  {
    href: "/dashboard/estudios",
    icon: "📚",
    label: "Estudiar",
    children: [
      { href: "/dashboard/indice-maestro", label: "Índice Maestro" },
      { href: "/dashboard/instituciones", label: "Instituciones" },
      { href: "/dashboard/integradores", label: "Ejercicios integradores" },
      { href: "/dashboard/flashcards?mode=FAVORITES", label: "Favoritas" },
    ],
  },
  {
    href: "/dashboard/la-toga",
    icon: "🏆",
    label: "Competir",
    children: [
      { href: "/dashboard/la-toga", label: "La Liga de la Toga" },
      { href: "/dashboard/vida-del-derecho", label: "La Vida del Derecho" },
      { href: "/dashboard/ranking", label: "Ranking XP" },
      { href: "/dashboard/ranking-causas", label: "Ranking Causas" },
      { href: "/dashboard/causas", label: "Causas" },
    ],
  },
  {
    href: "/dashboard/sala",
    icon: "🏫",
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
    icon: "✍️",
    label: "Diario",
    children: [
      { href: "/dashboard/diario", label: "Feed" },
      { href: "/dashboard/diario?tab=analisis", label: "Análisis" },
      { href: "/dashboard/diario?tab=ensayos", label: "Ensayos" },
      { href: "/dashboard/diario/debates", label: "Debates" },
      { href: "/dashboard/diario/expediente", label: "Expediente Abierto" },
    ],
  },
];

/* ─── Active detection ─── */

const STUDY_ROUTES = [
  "/dashboard/indice-maestro", "/dashboard/instituciones", "/dashboard/estudios",
  "/dashboard/integradores", "/dashboard/flashcards", "/dashboard/mcq", "/dashboard/truefalse",
  "/dashboard/definiciones", "/dashboard/completar-espacios", "/dashboard/identificar-errores",
  "/dashboard/ordenar-secuencias", "/dashboard/relacionar-columnas", "/dashboard/casos-practicos",
  "/dashboard/dictado-juridico", "/dashboard/linea-de-tiempo", "/dashboard/simulacro",
  "/dashboard/sesion-mixta",
];
const COMPETE_ROUTES = ["/dashboard/la-toga", "/dashboard/vida-del-derecho", "/dashboard/liga", "/dashboard/ranking", "/dashboard/causas"];

function isItemActive(item: MobileNavItem, pathname: string): boolean {
  if (item.href === "/dashboard/noticias") {
    return pathname.startsWith("/dashboard/noticias") || pathname === "/portada";
  }
  if (item.label === "Perfil") {
    return pathname.startsWith("/dashboard/perfil");
  }
  if (item.href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/progreso" ||
      pathname === "/dashboard/calendario" || pathname === "/dashboard/estadisticas";
  }
  if (item.label === "Estudiar") {
    return STUDY_ROUTES.some((r) => pathname.startsWith(r));
  }
  if (item.label === "Competir") {
    return COMPETE_ROUTES.some((r) => pathname.startsWith(r));
  }
  return pathname.startsWith(item.href);
}

/* ─── Component ─── */

export function MobileNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const [sheetIndex, setSheetIndex] = useState<number | null>(null);

  // Close sheet on route change
  useEffect(() => {
    setSheetIndex(null);
  }, [pathname]);

  // Close sheet on escape key
  useEffect(() => {
    if (sheetIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetIndex(null);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [sheetIndex]);

  const handleTap = useCallback(
    (idx: number, item: MobileNavItem) => {
      if (!item.children) {
        // No sub-items — navigate directly (Link handles this)
        setSheetIndex(null);
        return;
      }
      // Toggle sheet
      setSheetIndex((prev) => (prev === idx ? null : idx));
    },
    []
  );

  const isSheetOpen = sheetIndex !== null;
  const activeSheet = isSheetOpen ? NAV_ITEMS[sheetIndex] : null;

  return (
    <>
      {/* Backdrop overlay */}
      {isSheetOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSheetIndex(null)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className={`
          fixed bottom-[52px] left-0 right-0 z-50 lg:hidden
          border-t border-gz-rule shadow-sm
          transition-all duration-200 ease-out
          ${
            isSheetOpen
              ? "translate-y-0 opacity-100 pointer-events-auto"
              : "translate-y-full opacity-0 pointer-events-none"
          }
        `}
        style={{ backgroundColor: "var(--gz-cream, #F7F3ED)" }}
      >
        {activeSheet?.children && (
          <div className="px-4 py-3">
            {/* Sheet header */}
            <div className="flex items-center justify-between mb-2">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
                {activeSheet.label}
              </span>
              <button
                onClick={() => setSheetIndex(null)}
                className="text-gz-ink-light hover:text-gz-ink text-lg leading-none p-1"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* Sub-items */}
            <div className="space-y-0.5">
              {activeSheet.children.map((sub) => {
                const subActive =
                  sub.href.includes("?")
                    ? false // Query-based sub-items can't reliably detect active in SSR
                    : pathname === sub.href || pathname.startsWith(sub.href + "/");

                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`
                      block px-3 py-2.5 rounded-sm font-archivo text-[13px] tracking-[0.3px]
                      transition-colors
                      ${
                        subActive
                          ? "text-gz-gold bg-gz-gold/10 font-semibold"
                          : "text-gz-ink-mid hover:text-gz-ink hover:bg-gz-ink/5"
                      }
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
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden"
        style={{
          backgroundColor: "var(--gz-cream, #F7F3ED)",
          borderColor: "var(--gz-rule, #c4b99a)",
        }}
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {NAV_ITEMS.map((item, idx) => {
            const isActive = isItemActive(item, pathname);
            const isSheetActive = sheetIndex === idx;

            // For items WITH children, use button. For top-level links (Noticias, Perfil), use Link.
            if (!item.children) {
              const resolvedHref = item.href === "__PERFIL__" ? `/dashboard/perfil/${userId}` : item.href;
              return (
                <Link
                  key={item.href}
                  href={resolvedHref}
                  className={`
                    relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors
                    ${isActive ? "text-gz-gold" : "text-gz-ink-light hover:text-gz-ink-mid"}
                  `}
                >
                  <span className="text-lg leading-none">{item.icon}</span>
                  <span className="text-[10px] font-medium leading-none font-archivo">
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={item.href}
                onClick={() => handleTap(idx, item)}
                className={`
                  relative flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors
                  ${
                    isSheetActive
                      ? "text-gz-gold"
                      : isActive
                        ? "text-gz-gold"
                        : "text-gz-ink-light hover:text-gz-ink-mid"
                  }
                `}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium leading-none font-archivo">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
