"use client";

import { useState, useEffect, useMemo } from "react";

const LS_FECHA = "iuris_fecha_examen";

interface HeaderCountdownProps {
  serverExamDate: string | null;
}

export function HeaderCountdown({ serverExamDate }: HeaderCountdownProps) {
  const [fechaExamen, setFechaExamen] = useState<string | null>(serverExamDate);
  const [showPicker, setShowPicker] = useState(false);
  const [dateInput, setDateInput] = useState("");

  // Check localStorage for calendar-detected exam date
  useEffect(() => {
    try {
      const lsDate = localStorage.getItem(LS_FECHA);
      if (lsDate) setFechaExamen(lsDate);
    } catch { /* */ }
  }, []);

  const countdownDays = useMemo(() => {
    if (!fechaExamen) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(fechaExamen);
    exam.setHours(0, 0, 0, 0);
    const diff = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [fechaExamen]);

  function handleSave() {
    if (!dateInput) return;
    try { localStorage.setItem(LS_FECHA, dateInput); } catch { /* */ }
    setFechaExamen(dateInput);
    setShowPicker(false);
    fetch("/api/user/exam-date", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ examDate: new Date(dateInput).toISOString() }),
    }).catch(() => {});
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowPicker(!showPicker);
          setDateInput(fechaExamen ?? "");
        }}
        className="flex items-center gap-1.5 rounded-[3px] px-2 py-1 text-sm font-semibold text-navy hover:bg-navy/5 transition-colors whitespace-nowrap"
      >
        <span>⏳</span>
        {countdownDays !== null ? (
          <span>{countdownDays} día{countdownDays !== 1 ? "s" : ""} para tu examen</span>
        ) : (
          <span className="text-navy/50">Configura tu fecha</span>
        )}
      </button>

      {/* Date picker dropdown */}
      {showPicker && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-[4px] border border-gz-rule bg-white p-3 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-navy">Fecha de examen de grado</p>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="rounded border border-gz-rule px-2 py-1 text-xs text-navy focus:border-gold focus:outline-none"
            />
            <button onClick={handleSave} disabled={!dateInput}
              className="rounded bg-gold px-2.5 py-1 text-xs font-semibold text-white hover:bg-gold/90 disabled:opacity-50">
              Guardar
            </button>
            <button onClick={() => setShowPicker(false)}
              className="rounded border border-gz-rule px-2 py-1 text-xs text-navy/50 hover:bg-navy/5">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
