"use client";

import { useState, useMemo } from "react";

interface ExamCountdownProps {
  initialExamDate: string | null;
}

type DisplayMode = "total" | "desglosado";

export function ExamCountdown({ initialExamDate }: ExamCountdownProps) {
  const [examDate, setExamDate] = useState<string | null>(initialExamDate);
  const [showConfig, setShowConfig] = useState(false);
  const [dateInput, setDateInput] = useState(
    initialExamDate ? initialExamDate.slice(0, 10) : ""
  );
  const [displayMode, setDisplayMode] = useState<DisplayMode>("total");
  const [saving, setSaving] = useState(false);

  // ─── Cálculos ──────────────────────────────────────────────

  const countdown = useMemo(() => {
    if (!examDate) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);

    const diffMs = exam.getTime() - today.getTime();
    const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (totalDays < 0) return { status: "past" as const, totalDays: Math.abs(totalDays) };
    if (totalDays === 0) return { status: "today" as const, totalDays: 0 };

    // Desglosado
    const months = Math.floor(totalDays / 30);
    const remainingAfterMonths = totalDays % 30;
    const weeks = Math.floor(remainingAfterMonths / 7);
    const days = remainingAfterMonths % 7;

    return {
      status: "future" as const,
      totalDays,
      months,
      weeks,
      days,
    };
  }, [examDate]);

  // ─── Guardar fecha ─────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/exam-date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate: dateInput ? new Date(dateInput).toISOString() : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExamDate(data.examDate);
        setShowConfig(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const res = await fetch("/api/user/exam-date", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examDate: null }),
      });
      if (res.ok) {
        setExamDate(null);
        setDateInput("");
        setShowConfig(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Sin fecha configurada ─────────────────────────────────

  if (!examDate) {
    return (
      <div className="rounded-xl border border-gold/20 bg-gold/5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <p className="font-semibold text-navy font-display">
                Fecha de examen
              </p>
              <p className="text-sm text-navy/60">
                Configura tu fecha de examen de grado
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none bg-white"
          />
          <button
            onClick={handleSave}
            disabled={!dateInput || saving}
            className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Con fecha configurada ─────────────────────────────────

  return (
    <div className="rounded-xl border border-gold/20 bg-gold/5 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {countdown?.status === "today" ? "🎓" : "⏳"}
          </span>
          <div className="flex-1">
            {countdown?.status === "past" && (
              <>
                <p className="font-semibold text-navy font-display">
                  Tu examen ya pasó
                </p>
                <p className="text-sm text-navy/60">
                  Hace {countdown.totalDays} día{countdown.totalDays !== 1 ? "s" : ""}
                </p>
              </>
            )}
            {countdown?.status === "today" && (
              <>
                <p className="font-semibold text-navy font-display">
                  Tu examen es hoy
                </p>
                <p className="text-sm text-gold">
                  Confía en tu preparación
                </p>
              </>
            )}
            {countdown?.status === "future" && (
              <>
                {displayMode === "total" ? (
                  <p className="text-2xl font-bold text-navy font-display">
                    {countdown.totalDays} día{countdown.totalDays !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-navy font-display">
                    {countdown.months > 0 &&
                      `${countdown.months} mes${countdown.months !== 1 ? "es" : ""}`}
                    {countdown.months > 0 && (countdown.weeks > 0 || countdown.days > 0) &&
                      ", "}
                    {countdown.weeks > 0 &&
                      `${countdown.weeks} semana${countdown.weeks !== 1 ? "s" : ""}`}
                    {countdown.weeks > 0 && countdown.days > 0 && ", "}
                    {countdown.days > 0 &&
                      `${countdown.days} día${countdown.days !== 1 ? "s" : ""}`}
                    {countdown.months === 0 && countdown.weeks === 0 && countdown.days === 0 &&
                      "Hoy"}
                  </p>
                )}
                <p className="text-sm text-navy/60">
                  para tu examen de grado
                </p>
              </>
            )}
          </div>
        </div>

        {/* Config button */}
        <button
          onClick={() => {
            setShowConfig(!showConfig);
            setDateInput(examDate ? examDate.slice(0, 10) : "");
          }}
          className="rounded-lg p-2 text-navy/40 hover:text-navy hover:bg-navy/5 transition-colors"
          title="Configurar fecha"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>

      {/* Toggle total / desglosado */}
      {countdown?.status === "future" && (
        <div className="mt-3 flex gap-1 rounded-lg bg-navy/5 p-0.5">
          <button
            onClick={() => setDisplayMode("total")}
            className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              displayMode === "total"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setDisplayMode("desglosado")}
            className={`flex-1 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              displayMode === "desglosado"
                ? "bg-white text-navy shadow-sm"
                : "text-navy/50 hover:text-navy"
            }`}
          >
            Desglosado
          </button>
        </div>
      )}

      {/* Config panel */}
      {showConfig && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold focus:outline-none bg-white"
          />
          <button
            onClick={handleSave}
            disabled={!dateInput || saving}
            className="rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-white hover:bg-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Guardar"}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Borrar
          </button>
        </div>
      )}
    </div>
  );
}
