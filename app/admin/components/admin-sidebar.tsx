"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface AdminSidebarProps {
  adminName: string;
}

interface NavGroup {
  group: string;
  items: { href: string; label: string; icon: string }[];
  defaultCollapsed?: boolean;
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
    defaultCollapsed: true,
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
    defaultCollapsed: true,
    items: [
      { href: "/admin/noticias", label: "Noticias Jurídicas", icon: "📰" },
      { href: "/admin/expedientes", label: "Expedientes", icon: "📂" },
      { href: "/admin/fallo-semana", label: "Fallo de la Semana", icon: "🔥" },
      { href: "/admin/peer-review", label: "Peer Review", icon: "✠" },
    ],
  },
  {
    group: "PLATAFORMA",
    items: [
      { href: "/admin/ligas", label: "Liga / Grados", icon: "🏆" },
      { href: "/admin/pagos", label: "Pagos", icon: "💰" },
      { href: "/admin/hero-slides", label: "Hero Slides", icon: "🖼️" },
      { href: "/admin/notificaciones", label: "Notificaciones", icon: "🔔" },
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
      { href: "/admin/configuracion", label: "Config Global", icon: "🔧" },
      { href: "/admin/logs", label: "Logs de Actividad", icon: "📋" },
    ],
  },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

function getInitialCollapsed(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const defaults: Record<string, boolean> = {};
  for (const g of NAV_GROUPS) {
    if (g.defaultCollapsed) defaults[g.group] = true;
  }
  return defaults;
}

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const initial = getInitialCollapsed();
    // Auto-expand the group containing the current page
    for (const g of NAV_GROUPS) {
      if (g.items.some((i) => pathname.startsWith(i.href))) {
        initial[g.group] = false;
      }
    }
    setCollapsed(initial);
    setHydrated(true);
  }, []);

  function toggleGroup(group: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border bg-white">
      {/* Header */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={24}
            height={24}
            className="h-[24px] w-[24px]"
          />
          <span className="font-cormorant text-[16px] font-bold text-navy">
            Studio <span className="text-gz-red">Iuris</span>
          </span>
        </Link>
      </div>

      {/* Admin Badge */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold text-gold">
            {adminName[0]?.toUpperCase() ?? "A"}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy">{adminName}</p>
            <p className="text-[10px] font-medium text-gold">Administrador</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = hydrated ? !!collapsed[group.group] : !!group.defaultCollapsed;
          return (
            <div key={group.group}>
              <button
                onClick={() => toggleGroup(group.group)}
                className="flex w-full items-center justify-between px-3 py-1.5 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light hover:text-navy transition-colors"
              >
                <span>{group.group}</span>
                <span className="text-[10px] transition-transform duration-200" style={{ transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>
                  ▼
                </span>
              </button>
              {!isCollapsed && (
                <ul className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-gold/10 text-gold"
                              : "text-navy/70 hover:bg-navy/5 hover:text-navy"
                          }`}
                        >
                          <span className="text-base">{item.icon}</span>
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy/60 hover:bg-navy/5 hover:text-navy transition-colors"
        >
          ← Volver a la app
        </Link>
      </div>
    </aside>
  );
}
