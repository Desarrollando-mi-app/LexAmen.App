"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  adminName: string;
}

const NAV_ITEMS = [
  { href: "/admin/resumen", label: "Resumen", icon: "📊" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
  { href: "/admin/metricas", label: "Métricas", icon: "📈" },
  { href: "/admin/contenido", label: "Contenido", icon: "📚" },
  { href: "/admin/definiciones", label: "Definiciones", icon: "📖" },
  { href: "/admin/pagos", label: "Pagos", icon: "💰" },
  { href: "/admin/ligas", label: "Ligas", icon: "🏆" },
  { href: "/admin/notificaciones", label: "Notificaciones", icon: "🔔" },
  { href: "/admin/reportes", label: "Reportes", icon: "🚩" },
  { href: "/admin/sala", label: "La Sala", icon: "🏫" },
  { href: "/admin/contingencias", label: "Contingencias", icon: "📰" },
  { href: "/admin/hero-slides", label: "Hero Slides", icon: "🖼️" },
  { href: "/admin/institucional", label: "Institucional", icon: "🏛️" },
  { href: "/admin/sistema", label: "Sistema", icon: "⚙️" },
];

export function AdminSidebar({ adminName }: AdminSidebarProps) {
  const pathname = usePathname();

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
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
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
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy/60 hover:bg-navy/5 hover:text-navy transition-colors"
        >
          ← Volver al Dashboard
        </Link>
      </div>
    </aside>
  );
}
