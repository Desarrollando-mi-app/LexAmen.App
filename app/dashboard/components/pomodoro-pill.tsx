"use client";

import { useState, useRef, useEffect } from "react";
import { usePomodoro, FASE_LABELS } from "./pomodoro-context";
import type { PomodoroConfig } from "./pomodoro-context";

const FASE_COLORS: Record<string, string> = {
  trabajo: "var(--accent)",
  descanso_corto: "#1A5C3A",
  descanso_largo: "#1e4080",
};

export function PomodoroPill() {
  const pomo = usePomodoro();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const pillRef = useRef<HTMLDivElement>(null);

  const mins = Math.floor(pomo.segundosRestantes / 60)
    .toString()
    .padStart(2, "0");
  const secs = (pomo.segundosRestantes % 60).toString().padStart(2, "0");

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (pillRef.current && !pillRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popoverOpen]);

  return (
    <div ref={pillRef} className="fixed bottom-20 left-[76px] z-40 lg:bottom-6 lg:z-50">
      {/* ── Popover (opens upward) ────────────────── */}
      {popoverOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-[280px] rounded-[4px] border border-gz-rule bg-white shadow-sm">
          <PopoverContent />
        </div>
      )}

      {/* ── Pill ──────────────────────────────────── */}
      <div
        className={`flex items-center rounded-full border shadow-sm overflow-hidden transition-colors ${
          pomo.isAlerting
            ? "border-red-400 bg-red-50 animate-pulse"
            : "border-gz-rule bg-white"
        }`}
      >
        {/* Clickable area → toggle popover / dismiss alert */}
        <button
          onClick={() => {
            if (pomo.isAlerting) {
              pomo.dismissAlert();
            }
            setPopoverOpen(!popoverOpen);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
            pomo.isAlerting ? "hover:bg-red-100" : "hover:bg-navy/5"
          }`}
        >
          {pomo.isAlerting ? (
            <>
              <span className="text-sm">⏰</span>
              <span className="font-mono text-sm font-bold text-red-600">
                ¡Tiempo!
              </span>
            </>
          ) : (
            <>
              <span className="text-sm">🍅</span>
              <span className="font-mono text-sm font-bold text-navy">
                {mins}:{secs}
              </span>
              <span className="text-[10px] text-navy/40">·</span>
              <span className="text-[10px] font-medium text-navy/50">
                {FASE_LABELS[pomo.fase]}
              </span>
              <span className="text-[10px] text-navy/40">·</span>
              <span className="text-[10px] text-navy/40">
                Sesión {pomo.sesionActual}/{pomo.config.sesionesAntes}
              </span>
            </>
          )}
        </button>

        {/* Play/Pause button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (pomo.isAlerting) {
              pomo.dismissAlert();
              return;
            }
            if (pomo.running) { pomo.pausar(); } else { pomo.iniciar(); }
          }}
          className={`flex items-center justify-center h-full px-3 py-2.5 border-l transition-colors ${
            pomo.isAlerting
              ? "border-red-300 hover:bg-red-100"
              : "border-gz-rule hover:bg-navy/5"
          }`}
          title={pomo.isAlerting ? "Continuar" : pomo.running ? "Pausar" : "Iniciar"}
        >
          <span className="text-sm">
            {pomo.isAlerting ? "▶" : pomo.running ? "⏸" : "▶"}
          </span>
        </button>
      </div>
    </div>
  );
}

// ─── Popover Content ──────────────────────────────────────────

function PopoverContent() {
  const pomo = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);

  const mins = Math.floor(pomo.segundosRestantes / 60)
    .toString()
    .padStart(2, "0");
  const secs = (pomo.segundosRestantes % 60).toString().padStart(2, "0");

  const totalSeconds =
    pomo.config[
      pomo.fase === "trabajo"
        ? "trabajo"
        : pomo.fase === "descanso_corto"
        ? "descCorto"
        : "descLargo"
    ] * 60;
  const progress = totalSeconds > 0 ? pomo.segundosRestantes / totalSeconds : 1;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const color = FASE_COLORS[pomo.fase] ?? "var(--accent)";

  if (showSettings) {
    return (
      <div className="p-4">
        <PomodoroSettings
          onClose={() => setShowSettings(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Timer circle */}
      <div className="flex justify-center">
        <div className="relative">
          <svg
            width={radius * 2 + 12}
            height={radius * 2 + 12}
            className="transform -rotate-90"
          >
            <circle
              cx={radius + 6}
              cy={radius + 6}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              className="text-navy/10"
            />
            <circle
              cx={radius + 6}
              cy={radius + 6}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-xl font-bold font-cormorant"
              style={{ color }}
            >
              {mins}:{secs}
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-navy/50">
              {FASE_LABELS[pomo.fase]}
            </span>
          </div>
        </div>
      </div>

      {/* Session dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: pomo.config.sesionesAntes }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i < (pomo.sesionActual - 1) % pomo.config.sesionesAntes
                ? ""
                : "bg-navy/15"
            }`}
            style={
              i < (pomo.sesionActual - 1) % pomo.config.sesionesAntes
                ? { backgroundColor: color }
                : undefined
            }
          />
        ))}
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={pomo.running ? pomo.pausar : pomo.iniciar}
          className="rounded-[3px] px-5 py-2 text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: color }}
        >
          {pomo.running ? "⏸ Pausar" : "▶ Iniciar"}
        </button>
        <button
          onClick={pomo.skip}
          className="rounded-[3px] border border-gz-rule px-3 py-2 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors"
          title="Saltar fase"
        >
          ⏭
        </button>
        <button
          onClick={pomo.reset}
          className="rounded-[3px] border border-gz-rule px-3 py-2 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors"
          title="Reset"
        >
          🔄
        </button>
      </div>

      {/* Settings link */}
      <button
        onClick={() => setShowSettings(true)}
        className="mt-3 w-full text-center text-[10px] font-medium text-navy/40 hover:text-navy/60 transition-colors"
      >
        ⚙ Configuración
      </button>
    </div>
  );
}

// ─── Settings Panel ──────────────────────────────────────────

function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const pomo = usePomodoro();
  const [trabajo, setTrabajo] = useState(pomo.config.trabajo);
  const [descCorto, setDescCorto] = useState(pomo.config.descCorto);
  const [descLargo, setDescLargo] = useState(pomo.config.descLargo);
  const [sesionesAntes, setSesionesAntes] = useState(
    pomo.config.sesionesAntes
  );

  function handleSave() {
    const c: PomodoroConfig = { trabajo, descCorto, descLargo, sesionesAntes };
    pomo.updateConfig(c);
    onClose();
  }

  return (
    <div className="space-y-2.5">
      <h4 className="text-xs font-bold text-navy mb-2">Configuración</h4>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">
          Trabajo (min)
        </label>
        <input
          type="number"
          min={1}
          max={120}
          value={trabajo}
          onChange={(e) => setTrabajo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">
          Descanso corto (min)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={descCorto}
          onChange={(e) => setDescCorto(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">
          Descanso largo (min)
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={descLargo}
          onChange={(e) => setDescLargo(Math.max(1, +e.target.value || 1))}
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-[10px] font-medium text-navy/50 mb-0.5">
          Sesiones antes del largo
        </label>
        <input
          type="number"
          min={1}
          max={10}
          value={sesionesAntes}
          onChange={(e) =>
            setSesionesAntes(Math.max(1, +e.target.value || 1))
          }
          className="w-full rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs text-navy focus:border-gold focus:outline-none"
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onClose}
          className="flex-1 rounded-[3px] border border-gz-rule px-3 py-1.5 text-xs font-medium text-navy/60 hover:bg-navy/5 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-[3px] bg-gold px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold/90 transition-colors"
        >
          Guardar
        </button>
      </div>
    </div>
  );
}
