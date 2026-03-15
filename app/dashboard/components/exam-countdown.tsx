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

  // ─── Calculos ──────────────────────────────────────────────

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
      <div className="rounded-[4px] border border-gz-gold/20 bg-gz-gold/[0.06] p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{"\uD83C\uDF93"}</span>
            <div>
              <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
                Fecha de examen
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid">
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
            className="flex-1 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none bg-white"
            style={{ backgroundColor: "var(--gz-cream)" }}
          />
          <button
            onClick={handleSave}
            disabled={!dateInput || saving}
            className="rounded-[3px] bg-gz-gold px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Guardar"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Con fecha configurada ─────────────────────────────────

  return (
    <div className="rounded-[4px] border border-gz-gold/20 bg-gz-gold/[0.06] p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {countdown?.status === "today" ? "\uD83C\uDF93" : "\u23F3"}
          </span>
          <div className="flex-1">
            {countdown?.status === "past" && (
              <>
                <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
                  Tu examen ya paso
                </p>
                <p className="font-archivo text-[13px] text-gz-ink-mid">
                  Hace {countdown.totalDays} dia{countdown.totalDays !== 1 ? "s" : ""}
                </p>
              </>
            )}
            {countdown?.status === "today" && (
              <>
                <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
                  Tu examen es hoy
                </p>
                <p className="font-archivo text-[13px] text-gz-gold">
                  Confia en tu preparacion
                </p>
              </>
            )}
            {countdown?.status === "future" && (
              <>
                {displayMode === "total" ? (
                  <p className="font-cormorant text-[32px] !font-bold text-gz-ink">
                    {countdown.totalDays} dia{countdown.totalDays !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p className="font-cormorant text-[20px] !font-bold text-gz-ink">
                    {countdown.months > 0 &&
                      `${countdown.months} mes${countdown.months !== 1 ? "es" : ""}`}
                    {countdown.months > 0 && (countdown.weeks > 0 || countdown.days > 0) &&
                      ", "}
                    {countdown.weeks > 0 &&
                      `${countdown.weeks} semana${countdown.weeks !== 1 ? "s" : ""}`}
                    {countdown.weeks > 0 && countdown.days > 0 && ", "}
                    {countdown.days > 0 &&
                      `${countdown.days} dia${countdown.days !== 1 ? "s" : ""}`}
                    {countdown.months === 0 && countdown.weeks === 0 && countdown.days === 0 &&
                      "Hoy"}
                  </p>
                )}
                <p className="font-archivo text-[13px] text-gz-ink-mid">
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
          className="rounded-[3px] p-2 text-gz-ink-light hover:text-gz-ink hover:bg-gz-cream-dark/50 transition-colors"
          title="Configurar fecha"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
          </svg>
        </button>
      </div>

      {/* Toggle total / desglosado */}
      {countdown?.status === "future" && (
        <div className="mt-3 flex gap-1 rounded-[3px] bg-gz-cream-dark p-0.5">
          <button
            onClick={() => setDisplayMode("total")}
            className={`flex-1 rounded-[3px] px-3 py-1 font-ibm-mono text-[10px] font-medium transition-colors ${
              displayMode === "total"
                ? "bg-white text-gz-ink shadow-sm"
                : "text-gz-ink-light hover:text-gz-ink"
            }`}
          >
            Total
          </button>
          <button
            onClick={() => setDisplayMode("desglosado")}
            className={`flex-1 rounded-[3px] px-3 py-1 font-ibm-mono text-[10px] font-medium transition-colors ${
              displayMode === "desglosado"
                ? "bg-white text-gz-ink shadow-sm"
                : "text-gz-ink-light hover:text-gz-ink"
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
            className="flex-1 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
            style={{ backgroundColor: "var(--gz-cream)" }}
          />
          <button
            onClick={handleSave}
            disabled={!dateInput || saving}
            className="rounded-[3px] bg-gz-gold px-3 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "..." : "Guardar"}
          </button>
          <button
            onClick={handleClear}
            disabled={saving}
            className="rounded-[3px] border border-gz-burgundy/30 px-3 py-2 font-archivo text-[13px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] disabled:opacity-50 transition-colors"
          >
            Borrar
          </button>
        </div>
      )}
    </div>
  );
}
