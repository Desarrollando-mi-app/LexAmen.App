"use client";

import { useState } from "react";
import { usePomodoro, FASE_LABELS } from "./pomodoro-context";
import type { PomodoroConfig } from "./pomodoro-context";

const FASE_COLORS: Record<string, string> = {
  trabajo: "var(--accent)",
  descanso_corto: "#1A5C3A",
  descanso_largo: "#1e4080",
};

export function PomodoroCard() {
  const pomo = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);

  const mins = Math.floor(pomo.segundosRestantes / 60).toString().padStart(2, "0");
  const secs = (pomo.segundosRestantes % 60).toString().padStart(2, "0");

  const totalSeconds = pomo.config[
    pomo.fase === "trabajo" ? "trabajo" : pomo.fase === "descanso_corto" ? "descCorto" : "descLargo"
  ] * 60;
  const progress = totalSeconds > 0 ? pomo.segundosRestantes / totalSeconds : 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = FASE_COLORS[pomo.fase] ?? "var(--accent)";

  function handleSkip() {
    // Force phase completion by resetting to 0
    pomo.reset();
  }

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🍅</span>
          <p className="font-semibold text-navy font-cormorant text-sm">Pomodoro</p>
        </div>
        <button onClick={() => setShowSettings(!showSettings)}
          className="rounded-[3px] p-1.5 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors" title="Configuración">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Settings panel */}
      {showSettings ? (
        <PomodoroSettingsPanel onClose={() => setShowSettings(false)} />
      ) : (
        <>
          {/* SVG Circle */}
          <div className="flex justify-center">
            <div className="relative">
              <svg width={radius * 2 + 16} height={radius * 2 + 16} className="transform -rotate-90">
                <circle cx={radius + 8} cy={radius + 8} r={radius} fill="none" stroke="currentColor" strokeWidth={5} className="text-navy/10" />
                <circle cx={radius + 8} cy={radius + 8} r={radius} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-linear" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-cormorant" style={{ color }}>{mins}:{secs}</span>
                <span className="mt-0.5 text-[10px] font-medium text-navy/50">{FASE_LABELS[pomo.fase]}</span>
              </div>
            </div>
          </div>

          {/* Session indicator */}
          <p className="mt-3 text-center text-xs text-navy/50">
            Sesión {pomo.sesionActual} de {pomo.config.sesionesAntes}
          </p>

          {/* Controls */}
          <div className="mt-3 flex items-center justify-center gap-2">
            <button onClick={pomo.reset}
              className="rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors">
              Reset
            </button>
            <button onClick={pomo.running ? pomo.pausar : pomo.iniciar}
              className="rounded-[3px] px-5 py-1.5 text-xs font-semibold text-white transition-colors" style={{ backgroundColor: color }}>
              {pomo.running ? "⏸ Pausar" : "▶ Iniciar"}
            </button>
            <button onClick={handleSkip}
              className="rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors" title="Saltar fase">
              ⏭
            </button>
          </div>

          {/* Dots */}
          <div className="mt-3 flex items-center justify-center gap-1.5">
            {Array.from({ length: pomo.config.sesionesAntes }).map((_, i) => (
              <div key={i}
                className={`h-2 w-2 rounded-full transition-colors ${
                  i < (pomo.sesionActual - 1) % pomo.config.sesionesAntes ? "" : "bg-navy/15"
                }`}
                style={i < (pomo.sesionActual - 1) % pomo.config.sesionesAntes ? { backgroundColor: color } : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Settings subcomponent ──────────────────────────────────

function PomodoroSettingsPanel({ onClose }: { onClose: () => void }) {
  const pomo = usePomodoro();
  const [trabajo, setTrabajo] = useState(pomo.config.trabajo);
  const [descCorto, setDescCorto] = useState(pomo.config.descCorto);
  const [descLargo, setDescLargo] = useState(pomo.config.descLargo);
  const [sesionesAntes, setSesionesAntes] = useState(pomo.config.sesionesAntes);

  function handleSave() {
    const c: PomodoroConfig = { trabajo, descCorto, descLargo, sesionesAntes };
    pomo.updateConfig(c);
    onClose();
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Trabajo (min)</label>
        <input type="number" min={1} max={120} value={trabajo} onChange={(e) => setTrabajo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Descanso corto (min)</label>
        <input type="number" min={1} max={60} value={descCorto} onChange={(e) => setDescCorto(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Descanso largo (min)</label>
        <input type="number" min={1} max={60} value={descLargo} onChange={(e) => setDescLargo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">Sesiones antes del largo</label>
        <input type="number" min={1} max={10} value={sesionesAntes} onChange={(e) => setSesionesAntes(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none" />
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={onClose}
          className="flex-1 rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave}
          className="flex-1 rounded-[3px] bg-gold px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold/90 transition-colors">
          Guardar
        </button>
      </div>
    </div>
  );
}
