"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { usePomodoro, FASE_LABELS } from "./pomodoro-context";
import type { PomodoroConfig } from "./pomodoro-context";

// ─── Nav items ─────────────────────────────────────────────

const ENTRENAMIENTO_ITEMS = [
  { href: "/dashboard/flashcards", label: "Flashcards" },
  { href: "/dashboard/mcq", label: "Selección Múltiple" },
  { href: "/dashboard/truefalse", label: "Verdadero / Falso" },
];

const BOTTOM_ITEMS = [
  { href: "/dashboard/causas", icon: "⚔️", label: "Causas" },
  { href: "/dashboard/sala", icon: "🏛️", label: "La Sala" },
];

// ─── Pomodoro sidebar box ──────────────────────────────────

function PomodoroBox() {
  const pomo = usePomodoro();
  const [localConfig, setLocalConfig] = useState(false);

  const mins = Math.floor(pomo.segundosRestantes / 60)
    .toString()
    .padStart(2, "0");
  const secs = (pomo.segundosRestantes % 60).toString().padStart(2, "0");

  return (
    <>
      <button
        onClick={() => setLocalConfig(!localConfig)}
        className="flex w-full items-center gap-2.5 rounded-[3px] px-3 py-2.5 text-left transition-colors hover:bg-navy/5"
      >
        <span className="text-base">🍅</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-navy">Pomodoro</p>
          <p className="text-[10px] text-navy/50">
            {pomo.running
              ? `${mins}:${secs} · ${FASE_LABELS[pomo.fase]}`
              : "Configurar"}
          </p>
        </div>
        <svg className={`h-3.5 w-3.5 text-navy/30 transition-transform ${localConfig ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {localConfig && <PomodoroSettingsInline />}
    </>
  );
}

function PomodoroSettingsInline() {
  const pomo = usePomodoro();
  const [trabajo, setTrabajo] = useState(pomo.config.trabajo);
  const [descCorto, setDescCorto] = useState(pomo.config.descCorto);
  const [descLargo, setDescLargo] = useState(pomo.config.descLargo);
  const [sesionesAntes, setSesionesAntes] = useState(pomo.config.sesionesAntes);

  function handleSave() {
    const c: PomodoroConfig = { trabajo, descCorto, descLargo, sesionesAntes };
    pomo.updateConfig(c);
  }

  return (
    <div className="mx-3 mb-2 space-y-2 rounded-[4px] border border-gz-rule bg-white p-3">
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Trabajo (min)</label>
        <input type="number" min={1} max={120} value={trabajo} onChange={(e) => setTrabajo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Descanso corto (min)</label>
        <input type="number" min={1} max={60} value={descCorto} onChange={(e) => setDescCorto(Math.max(1, +e.target.value || 1))}
          className="w-full rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Descanso largo (min)</label>
        <input type="number" min={1} max={60} value={descLargo} onChange={(e) => setDescLargo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Sesiones antes del largo</label>
        <input type="number" min={1} max={10} value={sesionesAntes} onChange={(e) => setSesionesAntes(Math.max(1, +e.target.value || 1))}
          className="w-full rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <button onClick={handleSave}
        className="w-full rounded-[3px] bg-gold px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-gold/90 transition-colors">
        Guardar configuración
      </button>
    </div>
  );
}

// ─── Sidebar ───────────────────────────────────────────────

export function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const linkClass = (href: string) =>
    `flex items-center gap-2.5 rounded-[3px] px-3 py-2 text-xs font-medium transition-colors ${
      isActive(href)
        ? "bg-gold/10 text-gold font-semibold"
        : "text-navy/70 hover:bg-navy/5 hover:text-navy"
    }`;

  return (
    <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-gz-rule bg-gz-cream-dark">
      <div className="sticky top-0 flex flex-col h-screen overflow-y-auto pt-4 pb-6 px-3">
        {/* Logo */}
        <Link href="/dashboard" className="mb-5 flex items-center justify-center gap-2 px-2 hover:opacity-80 transition-opacity">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={24}
            height={24}
            className="h-[24px] w-[24px]"
          />
          <span className="text-lg font-bold font-cormorant text-gz-ink">
            Studio <span className="text-gz-red">Iuris</span>
          </span>
        </Link>

        {/* Pomodoro box */}
        <div className="mb-4 rounded-[4px] border border-gz-rule bg-white">
          <PomodoroBox />
        </div>

        {/* Entrenamiento group */}
        <div className="mb-4">
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-navy/40">
            📚 Entrenamiento
          </p>
          <div className="space-y-0.5">
            {ENTRENAMIENTO_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                {item.label}
              </Link>
            ))}
          </div>

          {/* Divider + Simulacro */}
          <div className="my-2 mx-3 border-t border-gz-rule" />
          <Link href="/dashboard/simulacro" className={linkClass("/dashboard/simulacro")}>
            🎙️ Simulacro
          </Link>
        </div>

        {/* Other nav items */}
        <div className="space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={linkClass(item.href)}>
              <span className="text-sm">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom links */}
        <div className="mt-4 space-y-0.5">
          <Link href="/dashboard/diario" className={linkClass("/dashboard/diario")}>
            <span className="text-sm">📰</span>
            El Diario
          </Link>
          <Link href="/dashboard/ranking" className={linkClass("/dashboard/ranking")}>
            <span className="text-sm">🏛️</span>
            Ranking
          </Link>
          <Link href="/dashboard/liga" className={linkClass("/dashboard/liga")}>
            <span className="text-sm">🏆</span>
            Liga
          </Link>
        </div>
      </div>
    </aside>
  );
}
