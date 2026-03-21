"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CURRICULUM, RAMA_LABELS } from "@/lib/curriculum-data";
import { playCorrect, playXpGained, playFlip, getAnimationsEnabled } from "@/lib/sounds";
import { Confetti } from "./confetti";

// ─── Types ────────────────────────────────────────────────

interface OnboardingWizardProps {
  userName: string;
  initialEtapa?: string | null;
  initialUniversidad?: string | null;
  initialSede?: string | null;
  /** A simple flashcard for step 4 */
  flashcard?: {
    id: string;
    question: string;
    answer: string;
    rama: string;
  } | null;
}

type Step = 1 | 2 | 3 | 4 | 5; // 5 = completed screen

const ETAPAS = [
  { value: "estudiante", emoji: "📖", label: "Estudiante", desc: "Cursando la carrera" },
  { value: "egresado", emoji: "🎓", label: "Egresado", desc: "Preparando el grado" },
  { value: "abogado", emoji: "⚖", label: "Abogado", desc: "Ya jurado, en ejercicio" },
];

const RAMAS = Object.keys(CURRICULUM).map((key) => ({
  key,
  label: RAMA_LABELS[key] ?? key,
  sublabel: key === "DERECHO_CIVIL"
    ? "Acto Jurídico, Obligaciones, Contratos, Bienes, Familia"
    : key === "DERECHO_PROCESAL_CIVIL"
    ? "Juicio Ordinario, Recursos, Juicio Ejecutivo"
    : "Organización de Tribunales, Competencia",
}));

// Fallback flashcard if none provided
const FALLBACK_FLASHCARD = {
  id: "__onboarding__",
  question: "¿Cómo define el art. 1 del Código Civil la ley?",
  answer:
    "\"La ley es una declaración de la voluntad soberana que, manifestada en la forma prescrita por la Constitución, manda, prohíbe o permite.\"",
  rama: "DERECHO_CIVIL",
};

const YEARS = Array.from({ length: 15 }, (_, i) => 2026 - i);

// ─── Component ────────────────────────────────────────────

export function OnboardingWizard({
  userName,
  initialEtapa,
  initialUniversidad,
  initialSede,
  flashcard,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [etapa, setEtapa] = useState<string>(initialEtapa ?? "");

  // Step 2
  const [universidad, setUniversidad] = useState(initialUniversidad ?? "");
  const [sede, setSede] = useState(initialSede ?? "");
  const [anioIngreso, setAnioIngreso] = useState<number | "">(2022);
  const [anioEgreso, setAnioEgreso] = useState<number | "">("");
  const [anioJura, setAnioJura] = useState<number | "">("");

  // Step 3
  const [ramasSeleccionadas, setRamasSeleccionadas] = useState<string[]>([
    "DERECHO_CIVIL",
    "DERECHO_PROCESAL_CIVIL",
  ]);

  // Step 4
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashcardDone, setFlashcardDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Completion
  const [completionXp, setCompletionXp] = useState(0);

  const fc = flashcard ?? FALLBACK_FLASHCARD;

  // ─── Save step data ────────────────────────────────────

  const saveStep = useCallback(
    async (stepNum: number, data: Record<string, unknown>) => {
      setSaving(true);
      try {
        await fetch("/api/onboarding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: stepNum, data }),
        });
      } catch {
        // continue anyway
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // ─── Handlers ──────────────────────────────────────────

  async function handleStep1Next() {
    if (!etapa) return;
    await saveStep(1, { etapaActual: etapa });
    setStep(2);
  }

  async function handleStep2Next() {
    await saveStep(2, {
      universidad: universidad || undefined,
      sede: sede || undefined,
      anioIngreso: anioIngreso || undefined,
      anioEgreso: anioEgreso || undefined,
      anioJura: anioJura || undefined,
    });
    setStep(3);
  }

  async function handleStep3Next() {
    if (ramasSeleccionadas.length === 0) return;
    await saveStep(3, { ramasInteres: ramasSeleccionadas });
    setStep(4);
  }

  function handleShowAnswer() {
    playFlip();
    setShowAnswer(true);
  }

  async function handleFlashcardQuality(quality: number) {
    if (flashcardDone) return;
    setFlashcardDone(true);

    // Play sounds
    playCorrect();
    setTimeout(() => playXpGained(), 300);

    // Try to submit real flashcard review
    if (fc.id !== "__onboarding__") {
      try {
        const res = await fetch("/api/flashcards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flashcardId: fc.id, quality }),
        });
        const data = await res.json();
        if (data.xpGained) setXpEarned(data.xpGained);
      } catch {
        setXpEarned(2);
      }
    } else {
      setXpEarned(2);
    }

    // Show confetti
    if (getAnimationsEnabled()) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    await saveStep(4, {});
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/complete", { method: "POST" });
      const data = await res.json();
      setCompletionXp(data.xp ?? 10);
    } catch {
      setCompletionXp(10);
    }
    setSaving(false);
    setStep(5);
  }

  function toggleRama(key: string) {
    setRamasSeleccionadas((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  }

  // ─── Progress dots ─────────────────────────────────────

  function ProgressDots({ current }: { current: number }) {
    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all ${
              i === current
                ? "w-6 bg-gz-gold"
                : i < current
                ? "w-2 bg-gz-gold/50"
                : "w-2 bg-gz-cream-dark"
            }`}
          />
        ))}
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────

  const containerClass =
    "min-h-screen gz-page flex items-center justify-center px-4 py-12";
  const cardClass =
    "w-full max-w-lg rounded-[4px] border border-gz-rule bg-white p-8 sm:p-10 shadow-sm";

  // ─── STEP 1: ¿Quién eres? ─────────────────────────────
  if (step === 1) {
    return (
      <main className={containerClass} style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className={cardClass}>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Bienvenido a Studio Iuris
          </p>
          <h2 className="mt-3 font-cormorant text-[28px] font-bold text-gz-ink leading-tight">
            Hola, {userName}
          </h2>
          <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid leading-relaxed">
            Antes de empezar, cuéntanos un poco sobre ti para personalizar tu experiencia.
          </p>

          <p className="mt-6 font-archivo text-[13px] font-semibold text-gz-ink">
            ¿En qué etapa estás?
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {ETAPAS.map((e) => (
              <button
                key={e.value}
                onClick={() => setEtapa(e.value)}
                className={`rounded-[4px] border p-4 text-center transition-all ${
                  etapa === e.value
                    ? "border-2 border-gz-gold bg-gz-gold/[0.05]"
                    : "border-gz-rule hover:border-gz-gold/40"
                }`}
              >
                <span className="text-2xl">{e.emoji}</span>
                <p className="mt-2 font-archivo text-[13px] font-semibold text-gz-ink">
                  {e.label}
                </p>
                <p className="mt-1 font-archivo text-[11px] text-gz-ink-light">
                  {e.desc}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleStep1Next}
              disabled={!etapa || saving}
              className="rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>

          <ProgressDots current={1} />
        </div>
      </main>
    );
  }

  // ─── STEP 2: ¿De dónde vienes? ────────────────────────
  if (step === 2) {
    return (
      <main className={containerClass} style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className={cardClass}>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Paso 2 de 4
          </p>
          <h2 className="mt-3 font-cormorant text-[24px] font-bold text-gz-ink">
            ¿En qué facultad estudias{etapa === "estudiante" ? "" : " o estudiaste"}?
          </h2>

          <div className="mt-6 space-y-4">
            <div>
              <label className="font-archivo text-[12px] font-medium text-gz-ink-mid">
                Universidad
              </label>
              <input
                type="text"
                value={universidad}
                onChange={(e) => setUniversidad(e.target.value)}
                placeholder="Ej: Pontificia Universidad Católica"
                className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
              />
            </div>

            <div>
              <label className="font-archivo text-[12px] font-medium text-gz-ink-mid">
                Sede
              </label>
              <input
                type="text"
                value={sede}
                onChange={(e) => setSede(e.target.value)}
                placeholder="Ej: Santiago"
                className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
              />
            </div>

            <div>
              <label className="font-archivo text-[12px] font-medium text-gz-ink-mid">
                Año de ingreso
              </label>
              <select
                value={anioIngreso}
                onChange={(e) => setAnioIngreso(e.target.value ? parseInt(e.target.value) : "")}
                className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
              >
                <option value="">Seleccionar</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {(etapa === "egresado" || etapa === "abogado") && (
              <div>
                <label className="font-archivo text-[12px] font-medium text-gz-ink-mid">
                  Año de egreso
                </label>
                <select
                  value={anioEgreso}
                  onChange={(e) => setAnioEgreso(e.target.value ? parseInt(e.target.value) : "")}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
                >
                  <option value="">Seleccionar</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {etapa === "abogado" && (
              <div>
                <label className="font-archivo text-[12px] font-medium text-gz-ink-mid">
                  Año de jura
                </label>
                <select
                  value={anioJura}
                  onChange={(e) => setAnioJura(e.target.value ? parseInt(e.target.value) : "")}
                  className="mt-1 w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/20"
                >
                  <option value="">Seleccionar</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
            >
              ← Atrás
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { saveStep(2, {}); setStep(3); }}
                className="font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink transition-colors"
              >
                Omitir
              </button>
              <button
                onClick={handleStep2Next}
                disabled={saving}
                className="rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
              >
                Siguiente →
              </button>
            </div>
          </div>

          <ProgressDots current={2} />
        </div>
      </main>
    );
  }

  // ─── STEP 3: ¿Qué quieres estudiar? ───────────────────
  if (step === 3) {
    return (
      <main className={containerClass} style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className={cardClass}>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Paso 3 de 4
          </p>
          <h2 className="mt-3 font-cormorant text-[24px] font-bold text-gz-ink">
            ¿Qué materias te interesan más?
          </h2>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">
            Selecciona las que quieras repasar primero.
          </p>

          <div className="mt-6 space-y-3">
            {RAMAS.map((r) => {
              const selected = ramasSeleccionadas.includes(r.key);
              return (
                <button
                  key={r.key}
                  onClick={() => toggleRama(r.key)}
                  className={`w-full rounded-[4px] border p-4 text-left transition-all ${
                    selected
                      ? "border-2 border-gz-gold bg-gz-gold/[0.05]"
                      : "border-gz-rule hover:border-gz-gold/40"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
                        selected
                          ? "border-gz-gold bg-gz-gold text-white"
                          : "border-gz-rule bg-white text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="font-archivo text-[14px] font-semibold text-gz-ink">
                      {r.label}
                    </span>
                  </div>
                  <p className="mt-1 ml-8 font-archivo text-[12px] text-gz-ink-light">
                    {r.sublabel}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={handleStep3Next}
              disabled={ramasSeleccionadas.length === 0 || saving}
              className="rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>

          <ProgressDots current={3} />
        </div>
      </main>
    );
  }

  // ─── STEP 4: Tu primera flashcard ─────────────────────
  if (step === 4) {
    return (
      <main className={containerClass} style={{ backgroundColor: "var(--gz-cream)" }}>
        <Confetti active={showConfetti} color="gold" />

        <div className={cardClass}>
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Paso 4 de 4
          </p>
          <h2 className="mt-3 font-cormorant text-[24px] font-bold text-gz-ink">
            ¡Probemos! Tu primera flashcard
          </h2>

          <div className="mt-6 rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
              Flashcard
            </p>
            <p className="mt-3 font-cormorant text-[18px] font-semibold text-gz-ink leading-relaxed">
              {fc.question}
            </p>

            {!showAnswer ? (
              <button
                onClick={handleShowAnswer}
                className="mt-6 w-full rounded-[3px] border border-gz-gold bg-gz-gold/[0.05] px-4 py-3 font-archivo text-[13px] font-semibold text-gz-gold transition-colors hover:bg-gz-gold/[0.1]"
              >
                Mostrar respuesta
              </button>
            ) : (
              <>
                <div className="mt-4 border-t border-gz-rule pt-4">
                  <p className="font-cormorant text-[16px] italic text-gz-ink-mid leading-relaxed">
                    {fc.answer}
                  </p>
                </div>

                {!flashcardDone ? (
                  <div className="mt-6">
                    <p className="font-archivo text-[12px] font-medium text-gz-ink-mid mb-3">
                      ¿Qué tan bien lo sabías?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleFlashcardQuality(0)}
                        className="rounded-[3px] border border-gz-burgundy/30 bg-gz-burgundy/[0.05] px-3 py-2.5 font-archivo text-[12px] font-medium text-gz-burgundy transition-colors hover:bg-gz-burgundy/[0.1]"
                      >
                        No sabía 😕
                      </button>
                      <button
                        onClick={() => handleFlashcardQuality(3)}
                        className="rounded-[3px] border border-gz-gold/30 bg-gz-gold/[0.05] px-3 py-2.5 font-archivo text-[12px] font-medium text-gz-gold transition-colors hover:bg-gz-gold/[0.1]"
                      >
                        Con dificultad 🤔
                      </button>
                      <button
                        onClick={() => handleFlashcardQuality(5)}
                        className="rounded-[3px] border border-gz-sage/30 bg-gz-sage/[0.05] px-3 py-2.5 font-archivo text-[12px] font-medium text-gz-sage transition-colors hover:bg-gz-sage/[0.1]"
                      >
                        ¡Lo sabía! 😄
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-[3px] bg-gz-sage/[0.08] p-3">
                    <span className="font-archivo text-[13px] font-semibold text-gz-sage">
                      ✓ +{xpEarned} XP
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="font-archivo text-[13px] font-medium text-gz-ink-mid hover:text-gz-ink transition-colors"
            >
              ← Atrás
            </button>
            <button
              onClick={handleComplete}
              disabled={!flashcardDone || saving}
              className="rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Completar →"}
            </button>
          </div>

          <ProgressDots current={4} />
        </div>
      </main>
    );
  }

  // ─── STEP 5: ¡Listo! ──────────────────────────────────
  return (
    <main className={containerClass} style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className={cardClass}>
        <div className="text-center">
          <p className="text-4xl">🎉</p>
          <h2 className="mt-4 font-cormorant text-[28px] font-bold text-gz-ink">
            ¡Bienvenido a Studio Iuris!
          </h2>
          <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid">
            Tu cuenta está configurada. Ganaste{" "}
            <span className="font-bold text-gz-gold">+{completionXp + xpEarned} XP</span> de
            bienvenida.
          </p>
        </div>

        <div className="mt-6 rounded-[4px] border border-gz-rule p-5" style={{ backgroundColor: "var(--gz-cream)" }}>
          <div className="space-y-2">
            <div className="flex justify-between font-archivo text-[13px]">
              <span className="text-gz-ink-light">Etapa</span>
              <span className="font-medium text-gz-ink capitalize">{etapa || "—"}</span>
            </div>
            {universidad && (
              <div className="flex justify-between font-archivo text-[13px]">
                <span className="text-gz-ink-light">Facultad</span>
                <span className="font-medium text-gz-ink">{universidad}</span>
              </div>
            )}
            <div className="flex justify-between font-archivo text-[13px]">
              <span className="text-gz-ink-light">Materias</span>
              <span className="font-medium text-gz-ink">
                {ramasSeleccionadas.map((r) => RAMA_LABELS[r] ?? r).join(", ")}
              </span>
            </div>
            <div className="flex justify-between font-archivo text-[13px]">
              <span className="text-gz-ink-light">Grado</span>
              <span className="font-medium text-gz-ink">1 — Oyente</span>
            </div>
            <div className="flex justify-between font-archivo text-[13px]">
              <span className="text-gz-ink-light">XP</span>
              <span className="font-bold text-gz-gold">{completionXp + xpEarned}</span>
            </div>
          </div>
        </div>

        <p className="mt-6 font-archivo text-[13px] font-medium text-gz-ink text-center">
          ¿Qué quieres hacer ahora?
        </p>

        <div className="mt-4 space-y-2">
          <Link
            href="/dashboard/flashcards"
            className="flex w-full items-center justify-center gap-2 rounded-[3px] bg-gz-navy px-5 py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            📚 Seguir estudiando
          </Link>
          <Link
            href="/dashboard"
            onClick={() => router.refresh()}
            className="flex w-full items-center justify-center gap-2 rounded-[3px] border border-gz-rule px-5 py-3 font-archivo text-[13px] font-medium text-gz-ink transition-colors hover:border-gz-gold hover:bg-gz-gold/[0.05]"
          >
            🏠 Ir al dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
