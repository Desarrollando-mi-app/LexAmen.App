"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { NavIcons, type NavIconKey } from "./nav-icons";

/* ─── Tipos ─── */

interface SubItem {
  href: string;
  label: string;
  badge?: string;
}

interface MobileNavItem {
  href: string;
  icon: NavIconKey;
  label: string;
  children?: SubItem[];
}

/* ─── Navigation structure — matches masthead ─── */

const NAV_ITEMS: MobileNavItem[] = [
  {
    href: "/dashboard/noticias",
    icon: "newspaper",
    label: "Noticias",
  },
  {
    href: "__PERFIL__",
    icon: "user",
    label: "Perfil",
  },
  {
    href: "/dashboard",
    icon: "home",
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
    icon: "book-open",
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
    icon: "trophy",
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
    icon: "briefcase-users",
    label: "Profesión",
    children: [
      { href: "/dashboard/sala/ayudantias", label: "Ayudantías" },
      { href: "/dashboard/sala/pasantias", label: "Pasantías" },
      { href: "/dashboard/sala/ofertas", label: "Ofertas Laborales" },
      { href: "/dashboard/sala/networking", label: "Networking" },
    ],
  },
  {
    href: "/dashboard/diario/debates",
    icon: "academic-cap",
    label: "Academia",
    children: [
      { href: "/dashboard/diario/debates", label: "Debates" },
      { href: "/dashboard/diario/expediente", label: "Expediente Abierto" },
      { href: "/dashboard/diario/peer-review", label: "Peer Review" },
      { href: "/dashboard/diario/ranking", label: "Ranking de Autores" },
      { href: "/dashboard/sala/eventos", label: "Eventos" },
    ],
  },
  {
    href: "/dashboard/diario",
    icon: "document-stack",
    label: "Publica",
    children: [
      { href: "/dashboard/diario", label: "Obiter Dictum" },
      { href: "/dashboard/diario/analisis", label: "Análisis de Fallos" },
      { href: "/dashboard/diario/ensayos", label: "Ensayos" },
      { href: "/dashboard/diario/revista", label: "Revista" },
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
const COMPETE_ROUTES = ["/dashboard/la-toga", "/dashboard/vida-del-derecho", "/dashboard/liga", "/dashboard/ranking", "/dashboard/ranking-causas", "/dashboard/causas"];
const PROFESION_ROUTES = ["/dashboard/sala/ayudantias", "/dashboard/sala/pasantias", "/dashboard/sala/ofertas", "/dashboard/sala/networking"];
const ACADEMIA_ROUTES = ["/dashboard/diario/debates", "/dashboard/diario/expediente", "/dashboard/diario/peer-review", "/dashboard/diario/ranking", "/dashboard/sala/eventos"];
const PUBLICACIONES_ROUTES = ["/dashboard/diario/analisis", "/dashboard/diario/ensayos", "/dashboard/diario/revista", "/dashboard/diario/columnas", "/dashboard/diario/obiter", "/dashboard/diario/colaboracion"];

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
  if (item.label === "Profesión") {
    return PROFESION_ROUTES.some((r) => pathname.startsWith(r));
  }
  if (item.label === "Academia") {
    return ACADEMIA_ROUTES.some((r) => pathname.startsWith(r));
  }
  if (item.label === "Publica") {
    if (ACADEMIA_ROUTES.some((r) => pathname.startsWith(r))) return false;
    return (
      pathname === "/dashboard/diario" ||
      PUBLICACIONES_ROUTES.some((r) => pathname.startsWith(r))
    );
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
        setSheetIndex(null);
        return;
      }
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
                className="text-gz-ink-light hover:text-gz-ink p-1"
                aria-label="Cerrar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Sub-items */}
            <div className="space-y-0.5">
              {activeSheet.children.map((sub) => {
                const subActive =
                  sub.href.includes("?")
                    ? false
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

      {/* Bottom bar — 8 items, tight but legible */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t lg:hidden"
        style={{
          backgroundColor: "var(--gz-cream, #F7F3ED)",
          borderColor: "var(--gz-rule, #c4b99a)",
        }}
      >
        <div className="mx-auto flex max-w-xl items-stretch">
          {NAV_ITEMS.map((item, idx) => {
            const isActive = isItemActive(item, pathname);
            const isSheetActive = sheetIndex === idx;
            const IconComp = NavIcons[item.icon];

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
                  <IconComp className="h-5 w-5" />
                  <span className="text-[9px] font-medium leading-none font-archivo uppercase tracking-[0.5px]">
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
                    isSheetActive || isActive
                      ? "text-gz-gold"
                      : "text-gz-ink-light hover:text-gz-ink-mid"
                  }
                `}
              >
                <IconComp className="h-5 w-5" />
                <span className="text-[9px] font-medium leading-none font-archivo uppercase tracking-[0.5px]">
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
