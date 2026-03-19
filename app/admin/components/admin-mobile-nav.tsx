"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavGroup {
  group: string;
  items: { href: string; label: string; icon: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: "PRINCIPAL",
    items: [
      { href: "/admin/resumen", label: "Dashboard", icon: "📊" },
      { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
      { href: "/admin/metricas", label: "Métricas", icon: "📈" },
    ],
  },
  {
    group: "CONTENIDO ESTUDIO",
    items: [
      { href: "/admin/contenido", label: "Flashcards / MCQ / V-F", icon: "📚" },
      { href: "/admin/definiciones", label: "Definiciones", icon: "📖" },
      { href: "/admin/fill-blank", label: "Completar Espacios", icon: "📋" },
      { href: "/admin/error-identification", label: "Identificar Errores", icon: "🔍" },
      { href: "/admin/order-sequence", label: "Ordenar Secuencias", icon: "📑" },
      { href: "/admin/match-columns", label: "Relacionar Columnas", icon: "🔗" },
      { href: "/admin/caso-practico", label: "Casos Prácticos", icon: "⚖" },
      { href: "/admin/dictado", label: "Dictado Jurídico", icon: "🎤" },
      { href: "/admin/timeline", label: "Líneas de Tiempo", icon: "📅" },
    ],
  },
  {
    group: "EL DIARIO",
    items: [
      { href: "/admin/noticias", label: "Noticias", icon: "📰" },
      { href: "/admin/expedientes", label: "Expedientes", icon: "📂" },
      { href: "/admin/fallo-semana", label: "Fallo Semana", icon: "🔥" },
    ],
  },
  {
    group: "PLATAFORMA",
    items: [
      { href: "/admin/ligas", label: "Liga / Grados", icon: "🏆" },
      { href: "/admin/pagos", label: "Pagos", icon: "💰" },
      { href: "/admin/hero-slides", label: "Hero Slides", icon: "🖼️" },
      { href: "/admin/notificaciones", label: "Notif.", icon: "🔔" },
      { href: "/admin/reportes", label: "Reportes", icon: "🚩" },
      { href: "/admin/sala", label: "La Sala", icon: "🏫" },
      { href: "/admin/institucional", label: "Institucional", icon: "🏛️" },
    ],
  },
  {
    group: "SISTEMA",
    items: [
      { href: "/admin/contingencias", label: "Contingencias", icon: "⚠️" },
      { href: "/admin/sistema", label: "Configuración", icon: "⚙️" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = ALL_ITEMS.find((i) => pathname.startsWith(i.href));

  return (
    <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-navy font-display"
        >
          Studio <span className="text-gz-red">Iuris</span> · Admin
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-navy"
        >
          {current?.icon} {current?.label ?? "Menú"}
          <span className="text-xs">{open ? "▲" : "▼"}</span>
        </button>
      </div>
      {open && (
        <nav className="border-t border-border px-2 py-2 max-h-[70vh] overflow-y-auto">
          {NAV_GROUPS.map((group) => (
            <div key={group.group} className="mb-3">
              <p className="px-2 py-1 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
                {group.group}
              </p>
              <ul className="grid grid-cols-3 gap-1">
                {group.items.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-gold/10 text-gold"
                            : "text-navy/60 hover:bg-navy/5"
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <Link
            href="/dashboard"
            className="mt-2 block rounded-lg px-3 py-2 text-center text-sm text-navy/60 hover:bg-navy/5"
            onClick={() => setOpen(false)}
          >
            ← Volver a la app
          </Link>
        </nav>
      )}
    </div>
  );
}
