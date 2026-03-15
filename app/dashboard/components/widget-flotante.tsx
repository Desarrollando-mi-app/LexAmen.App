"use client";

import { useState, useEffect, useMemo } from "react";
import { usePomodoro, FASE_LABELS } from "./pomodoro-context";

const LS_WIDGET = "iuris_widget_state";
const LS_FECHA = "iuris_fecha_examen";

// ─── Countdown helpers ──────────────────────────────────────

function getCountdownDays(fechaExamen: string | null): number | null {
  if (!fechaExamen) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(fechaExamen);
  exam.setHours(0, 0, 0, 0);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

// ─── Widget ─────────────────────────────────────────────────

interface WidgetFlotanteProps {
  serverExamDate: string | null;
}

export function WidgetFlotante({ serverExamDate }: WidgetFlotanteProps) {
  const pomo = usePomodoro();
  const [expanded, setExpanded] = useState(true);
  const [fechaExamen, setFechaExamen] = useState<string | null>(serverExamDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateInput, setDateInput] = useState("");

  // Hydrate widget state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_WIDGET);
      if (saved === "minimized") setExpanded(false);
    } catch { /* */ }

    // Check localStorage for calendar-detected exam date
    try {
      const lsDate = localStorage.getItem(LS_FECHA);
      if (lsDate) setFechaExamen(lsDate);
    } catch { /* */ }
  }, []);

  // Persist expanded/minimized
  useEffect(() => {
    try {
      localStorage.setItem(LS_WIDGET, expanded ? "expanded" : "minimized");
    } catch { /* */ }
  }, [expanded]);

  const countdownDays = useMemo(() => getCountdownDays(fechaExamen), [fechaExamen]);

  const mins = Math.floor(pomo.segundosRestantes / 60).toString().padStart(2, "0");
  const secs = (pomo.segundosRestantes % 60).toString().padStart(2, "0");

  function handleSaveDate() {
    if (!dateInput) return;
    try {
      localStorage.setItem(LS_FECHA, dateInput);
    } catch { /* */ }
    setFechaExamen(dateInput);
    setShowDatePicker(false);
    // Also persist to server
    fetch("/api/user/exam-date", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate: new Date(dateInput).toISOString() }),
    }).catch(() => {});
  }

  // ─── Minimized pill ─────────────────────────────────────
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-gz-rule px-3 py-2 shadow-sm hover:shadow-sm transition-shadow" style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {countdownDays !== null && (
          <span className="text-xs font-semibold text-navy">⏳{countdownDays}d</span>
        )}
        <span className="text-xs font-semibold text-navy">
          🍅{mins}:{secs}
        </span>
      </button>
    );
  }

  // ─── Expanded card ──────────────────────────────────────
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[260px] rounded-[4px] border border-gz-rule shadow-sm" style={{ backgroundColor: "var(--gz-cream)" }}>
      {/* Header with minimize button */}
      <div className="flex items-center justify-end px-3 pt-2">
        <button
          onClick={() => setExpanded(false)}
          className="rounded p-0.5 text-navy/30 hover:text-navy/60 transition-colors"
          title="Minimizar"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
          </svg>
        </button>
      </div>

      {/* Countdown section */}
      <div
        className="px-4 pb-3 cursor-pointer"
        onClick={() => {
          if (!fechaExamen) {
            setShowDatePicker(true);
            setDateInput("");
          }
        }}
      >
        {countdownDays !== null ? (
          <>
            <p className="text-2xl font-bold text-navy font-cormorant">
              ⏳ {countdownDays} día{countdownDays !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-navy/50">para tu examen de grado</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-navy/60">
              ⏳ Configura tu fecha
            </p>
            <p className="text-[10px] text-navy/40">Click para configurar</p>
          </>
        )}
      </div>

      {/* Date picker */}
      {showDatePicker && (
        <div className="mx-4 mb-3 flex items-center gap-1.5">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none bg-white"
          />
          <button onClick={handleSaveDate} disabled={!dateInput}
            className="rounded bg-gold px-2 py-1 text-[10px] font-semibold text-white hover:bg-gold/90 disabled:opacity-50">
            OK
          </button>
          <button onClick={() => setShowDatePicker(false)}
            className="rounded border border-gz-rule px-2 py-1 text-[10px] text-navy/50 hover:bg-navy/5">
            ✕
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gz-rule" />

      {/* Pomodoro section */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🍅</span>
            <span className="text-xl font-bold text-navy font-cormorant">
              {mins}:{secs}
            </span>
          </div>
          <button
            onClick={pomo.running ? pomo.pausar : pomo.iniciar}
            className="rounded-[3px] bg-gold px-3 py-1.5 text-xs font-semibold text-white hover:bg-gold/90 transition-colors"
          >
            {pomo.running ? "⏸ Pausar" : "▶ Iniciar"}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <p className="text-[10px] text-navy/50">
            {FASE_LABELS[pomo.fase]} · Sesión {pomo.sesionActual} de {pomo.config.sesionesAntes}
          </p>
          <button
            onClick={pomo.reset}
            className="text-[10px] text-navy/30 hover:text-navy/60 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
