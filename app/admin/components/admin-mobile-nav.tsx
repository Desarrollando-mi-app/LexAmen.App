"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin/resumen", label: "Resumen", icon: "📊" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/admin/metricas", label: "Métricas", icon: "📈" },
  { href: "/admin/contenido", label: "Contenido", icon: "📚" },
  { href: "/admin/pagos", label: "Pagos", icon: "💰" },
  { href: "/admin/ligas", label: "Ligas", icon: "🏆" },
  { href: "/admin/notificaciones", label: "Notif.", icon: "🔔" },
  { href: "/admin/reportes", label: "Reportes", icon: "🚩" },
  { href: "/admin/contingencias", label: "Contingencias", icon: "📰" },
  { href: "/admin/hero-slides", label: "Hero Slides", icon: "🖼️" },
  { href: "/admin/institucional", label: "Institucional", icon: "🏛️" },
  { href: "/admin/sistema", label: "Sistema", icon: "⚙️" },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const current = NAV_ITEMS.find((i) => pathname.startsWith(i.href));

  return (
    <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-white">
      <div className="flex items-center justify-between px-4 py-3">
        <Link
          href="/dashboard"
          className="text-lg font-bold text-navy font-display"
        >
          ⚖️ Admin
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
        <nav className="border-t border-border px-2 py-2">
          <ul className="grid grid-cols-3 gap-1">
            {NAV_ITEMS.map((item) => {
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
          <Link
            href="/dashboard"
            className="mt-2 block rounded-lg px-3 py-2 text-center text-sm text-navy/60 hover:bg-navy/5"
            onClick={() => setOpen(false)}
          >
            ← Volver al Dashboard
          </Link>
        </nav>
      )}
    </div>
  );
}
