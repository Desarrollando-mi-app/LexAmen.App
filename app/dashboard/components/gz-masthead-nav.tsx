"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { NavIcons, type NavIconKey } from "./nav-icons";

/* ─── Navigation structure (7 secciones + Noticias + Perfil) ─── */

interface SubItem {
  href: string;
  label: string;
  icon: NavIconKey;
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
      { href: "/dashboard", label: "Inicio", icon: "home" },
      { href: "/dashboard/estadisticas", label: "Estadísticas", icon: "chart-bar" },
      { href: "/dashboard/calendario", label: "Calendario", icon: "calendar" },
      { href: "/dashboard/progreso", label: "Mi Progreso", icon: "trending-up" },
    ],
  },
  {
    href: "/dashboard/estudios",
    label: "Estudiar",
    children: [
      { href: "/dashboard/indice-maestro", label: "Índice Maestro", icon: "book-open" },
      { href: "/dashboard/instituciones", label: "Instituciones", icon: "building-library" },
      { href: "/dashboard/integradores", label: "Ejercicios integradores", icon: "pencil-square" },
      { href: "/dashboard/flashcards?mode=FAVORITES", label: "Favoritas", icon: "star" },
    ],
  },
  {
    href: "/dashboard/la-toga",
    label: "Competencias",
    children: [
      { href: "/dashboard/la-toga", label: "La Liga de la Toga", icon: "trophy" },
      { href: "/dashboard/vida-del-derecho", label: "La Vida del Derecho", icon: "academic-cap" },
      { href: "/dashboard/ranking", label: "Ranking XP", icon: "chart-bar" },
      { href: "/dashboard/ranking-causas", label: "Ranking Causas", icon: "medal" },
      { href: "/dashboard/causas", label: "Causas", icon: "swords" },
    ],
  },
  {
    href: "/dashboard/sala",
    label: "Profesión",
    children: [
      { href: "/dashboard/sala/ayudantias", label: "Ayudantías", icon: "chalkboard" },
      { href: "/dashboard/sala/pasantias", label: "Pasantías", icon: "briefcase" },
      { href: "/dashboard/sala/ofertas", label: "Ofertas Laborales", icon: "bookmark-square" },
      { href: "/dashboard/sala/networking", label: "Networking", icon: "users-group" },
    ],
  },
  {
    href: "/dashboard/diario/debates",
    label: "Academia",
    children: [
      { href: "/dashboard/diario/debates", label: "Debates", icon: "chat-versus" },
      { href: "/dashboard/diario/expediente", label: "Expediente Abierto", icon: "folder-open" },
      { href: "/dashboard/diario/peer-review", label: "Peer Review", icon: "magnifier" },
      { href: "/dashboard/diario/ranking", label: "Ranking de Autores", icon: "chart-bar" },
      { href: "/dashboard/sala/eventos", label: "Eventos", icon: "calendar" },
    ],
  },
  {
    href: "/dashboard/diario",
    label: "Publicaciones",
    children: [
      { href: "/dashboard/diario", label: "Obiter Dictum", icon: "newspaper" },
      { href: "/dashboard/diario/analisis", label: "Análisis de Fallos", icon: "clipboard-doc" },
      { href: "/dashboard/diario/ensayos", label: "Ensayos", icon: "scroll" },
      { href: "/dashboard/diario/revista", label: "Revista", icon: "book-stack" },
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

// Profesión: ayudantías, pasantías, ofertas, networking
const PROFESION_ROUTES = [
  "/dashboard/sala/ayudantias",
  "/dashboard/sala/pasantias",
  "/dashboard/sala/ofertas",
  "/dashboard/sala/networking",
];

// Academia: debates, expediente, peer-review, ranking autores, eventos
const ACADEMIA_ROUTES = [
  "/dashboard/diario/debates",
  "/dashboard/diario/expediente",
  "/dashboard/diario/peer-review",
  "/dashboard/diario/ranking",
  "/dashboard/sala/eventos",
];

// Publicaciones: obiter (feed), análisis, ensayos, revista, columnas, obiter/[id]
const PUBLICACIONES_ROUTES = [
  "/dashboard/diario/analisis",
  "/dashboard/diario/ensayos",
  "/dashboard/diario/revista",
  "/dashboard/diario/columnas",
  "/dashboard/diario/obiter",
  "/dashboard/diario/colaboracion",
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

  // Escritorio
  if (item.href === "/dashboard") {
    return (
      pathname === "/dashboard" ||
      pathname === "/dashboard/progreso" ||
      pathname === "/dashboard/calendario" ||
      pathname === "/dashboard/estadisticas"
    );
  }

  // Estudiar
  if (item.label === "Estudiar") {
    return STUDY_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Competencias
  if (item.label === "Competencias") {
    return COMPETE_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Profesión
  if (item.label === "Profesión") {
    return PROFESION_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Academia
  if (item.label === "Academia") {
    return ACADEMIA_ROUTES.some((r) => pathname.startsWith(r));
  }

  // Publicaciones: feed root + known sub-routes, pero NO si estamos en una ruta Academia
  if (item.label === "Publicaciones") {
    if (ACADEMIA_ROUTES.some((r) => pathname.startsWith(r))) return false;
    return (
      pathname === "/dashboard/diario" ||
      PUBLICACIONES_ROUTES.some((r) => pathname.startsWith(r))
    );
  }

  // Default
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
                  px-[16px] py-1 transition-colors hover:text-gz-gold cursor-pointer
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
                  px-[16px] py-1 transition-colors hover:text-gz-gold
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
                  min-w-[240px] py-2
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

                  const IconComp = NavIcons[sub.icon];

                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={`
                        flex items-center gap-2.5 px-4 py-2.5 font-archivo text-[11px] uppercase tracking-[1.5px]
                        transition-colors hover:bg-gz-gold/[0.06] hover:text-gz-ink
                        ${subActive ? "text-gz-gold font-semibold" : "text-gz-ink-mid"}
                      `}
                    >
                      <IconComp className="h-4 w-4 shrink-0" />
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
