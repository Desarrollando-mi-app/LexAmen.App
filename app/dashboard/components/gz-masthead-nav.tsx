"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";

/* ─── Navigation structure (6 items) ─── */

interface SubItem {
  href: string;
  label: string;
  emoji: string;
}

interface NavItem {
  href: string;
  label: string;
  children?: SubItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/noticias",
    label: "Noticias",
  },
  {
    href: "__PERFIL__",
    label: "Perfil",
  },
  {
    href: "/dashboard",
    label: "Escritorio",
    children: [
      { href: "/dashboard", label: "Inicio", emoji: "🏠" },
      { href: "/dashboard/estadisticas", label: "Estadísticas", emoji: "📊" },
      { href: "/dashboard/calendario", label: "Calendario", emoji: "📅" },
      { href: "/dashboard/progreso", label: "Mi Progreso", emoji: "📈" },
    ],
  },
  {
    href: "/dashboard/estudios",
    label: "Estudiar",
    children: [
      { href: "/dashboard/indice-maestro", label: "Índice Maestro", emoji: "📚" },
      { href: "/dashboard/instituciones", label: "Instituciones", emoji: "🏛️" },
      { href: "/dashboard/integradores", label: "Ejercicios integradores", emoji: "📝" },
      { href: "/dashboard/flashcards?mode=FAVORITES", label: "Favoritas", emoji: "⭐" },
    ],
  },
  {
    href: "/dashboard/la-toga",
    label: "Competencias",
    children: [
      { href: "/dashboard/la-toga", label: "La Liga de la Toga", emoji: "🏆" },
      { href: "/dashboard/vida-del-derecho", label: "La Vida del Derecho", emoji: "🎓" },
      { href: "/dashboard/ranking", label: "Ranking XP", emoji: "📊" },
      { href: "/dashboard/ranking-causas", label: "Ranking Causas", emoji: "🏅" },
      { href: "/dashboard/causas", label: "Causas", emoji: "⚔️" },
    ],
  },
  {
    href: "/dashboard/sala",
    label: "La Sala",
    children: [
      { href: "/dashboard/sala", label: "Ayudantías", emoji: "🏫" },
      { href: "/dashboard/sala/pasantias", label: "Pasantías", emoji: "💼" },
      { href: "/dashboard/sala/eventos", label: "Eventos", emoji: "📅" },
      { href: "/dashboard/sala/ofertas", label: "Ofertas de Trabajo", emoji: "📌" },
    ],
  },
  {
    href: "/dashboard/diario",
    label: "El Diario",
    children: [
      { href: "/dashboard/diario", label: "Feed", emoji: "📰" },
      { href: "/dashboard/diario?tab=analisis", label: "Análisis de Sentencia", emoji: "📋" },
      { href: "/dashboard/diario?tab=ensayos", label: "Ensayos", emoji: "📜" },
      { href: "/dashboard/diario/debates", label: "Debates", emoji: "🆚" },
      { href: "/dashboard/diario/expediente", label: "Expediente Abierto", emoji: "📂" },
    ],
  },
];

/* ─── Active detection ─── */

const STUDY_ROUTES = [
  "/dashboard/indice-maestro",
  "/dashboard/instituciones",
  "/dashboard/estudios",
  "/dashboard/integradores",
  "/dashboard/flashcards",
  "/dashboard/mcq",
  "/dashboard/truefalse",
  "/dashboard/definiciones",
  "/dashboard/completar-espacios",
  "/dashboard/identificar-errores",
  "/dashboard/ordenar-secuencias",
  "/dashboard/relacionar-columnas",
  "/dashboard/casos-practicos",
  "/dashboard/dictado-juridico",
  "/dashboard/linea-de-tiempo",
  "/dashboard/simulacro",
  "/dashboard/sesion-mixta",
];

const COMPETE_ROUTES = [
  "/dashboard/la-toga",
  "/dashboard/vida-del-derecho",
  "/dashboard/liga",
  "/dashboard/ranking",
  "/dashboard/ranking-causas",
  "/dashboard/causas",
];

function isItemActive(item: NavItem, pathname: string): boolean {
  // Noticias
  if (item.href === "/dashboard/noticias") {
    return pathname.startsWith("/dashboard/noticias") || pathname === "/portada";
  }

  // Perfil
  if (item.label === "Perfil") {
    return pathname.startsWith("/dashboard/perfil");
  }

  // Escritorio: exact match only
  if (item.href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/progreso" ||
      pathname === "/dashboard/calendario" ||
      pathname === "/dashboard/estadisticas"
    );
  }

  // Estudiar: matches any study route
  if (item.label === "Estudiar") {
    return STUDY_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Competencias: matches liga, ranking, causas
  if (item.label === "Competencias") {
    return COMPETE_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Default: starts with href
  return pathname.startsWith(item.href);
}

/* ─── Component ─── */

export function GzMastheadNav({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(
    (idx: number) => {
      setOpenIndex((prev) => (prev === idx ? null : idx));
    },
    []
  );

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on route change
  useEffect(() => {
    setOpenIndex(null);
  }, [pathname]);

  return (
    <nav
      ref={containerRef}
      className="hidden lg:flex justify-center gap-0 mt-3.5 border-t border-gz-rule pt-2.5"
    >
      {NAV_ITEMS
        .filter((item) => !(item.href === "__PERFIL__" && !userId))
        .map((item, i, arr) => {
        const active = isItemActive(item, pathname);
        const isOpen = openIndex === i && !!item.children;
        const isLast = i === arr.length - 1;
        const resolvedHref = item.href === "__PERFIL__" ? `/dashboard/perfil/${userId}` : item.href;

        return (
          <div key={item.href + item.label} className="relative">
            {/* Top-level link or dropdown trigger */}
            {item.children ? (
              <button
                onClick={() => handleToggle(i)}
                className={`
                  block font-archivo text-[11px] font-semibold uppercase tracking-[2px]
                  px-[18px] py-1 transition-colors hover:text-gz-gold cursor-pointer
                  ${!isLast ? "border-r border-gz-rule" : ""}
                  ${active ? "text-gz-ink font-bold" : "text-gz-ink-mid"}
                `}
              >
                {item.label}
                <span
                  className={`ml-1 inline-block text-[8px] transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>
            ) : (
              <Link
                href={resolvedHref}
                className={`
                  block font-archivo text-[11px] font-semibold uppercase tracking-[2px]
                  px-[18px] py-1 transition-colors hover:text-gz-gold
                  ${!isLast ? "border-r border-gz-rule" : ""}
                  ${active ? "text-gz-ink font-bold" : "text-gz-ink-mid"}
                `}
              >
                {item.label}
              </Link>
            )}

            {/* Dropdown */}
            {item.children && (
              <div
                className={`
                  absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-50
                  min-w-[220px] py-2
                  border border-gz-rule rounded-lg shadow-md
                  transition-all duration-200 origin-top
                  ${
                    isOpen
                      ? "opacity-100 scale-y-100 pointer-events-auto"
                      : "opacity-0 scale-y-95 pointer-events-none"
                  }
                `}
                style={{ backgroundColor: "var(--gz-cream)" }}
              >
                {/* Caret arrow */}
                <div
                  className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 border-l border-t border-gz-rule"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />

                {item.children.map((sub) => {
                  const subActive =
                    sub.href.includes("?")
                      ? pathname + (typeof window !== "undefined" ? window.location.search : "") ===
                        sub.href
                      : pathname === sub.href || pathname.startsWith(sub.href + "/");

                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`
                        flex items-center gap-2 px-4 py-2.5 font-archivo text-[11px] uppercase tracking-[1.5px]
                        transition-colors hover:bg-gz-gold/[0.06] hover:text-gz-ink
                        ${subActive ? "text-gz-gold font-semibold" : "text-gz-ink-mid"}
                      `}
                    >
                      <span className="text-[14px]">{sub.emoji}</span>
                      {sub.label}
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
