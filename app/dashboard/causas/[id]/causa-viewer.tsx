"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CAUSA_TIME_LIMIT_MS } from "@/lib/causa";

interface MCQ {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
}

interface MyAnswer {
  questionIdx: number;
  mcq: MCQ;
  selectedOption: string | null;
  isCorrect: boolean | null;
  timeMs: number | null;
  score: number;
}

interface OpponentAnswer {
  questionIdx: number;
  selectedOption: string | null;
  isCorrect: boolean | null;
  score: number;
}

interface CausaViewerProps {
  causaId: string;
  status: string;
  opponentName: string;
  totalQuestions: number;
  myAnswers: MyAnswer[];
  opponentAnswers: OpponentAnswer[];
  myScore: number;
  opponentScore: number;
  winnerId: string | null;
  userId: string;
}

export function CausaViewer({
  causaId,
  status: initialStatus,
  opponentName,
  totalQuestions,
  myAnswers: initialMyAnswers,
  opponentAnswers,
  myScore: initialMyScore,
  opponentScore,
  winnerId,
  userId,
}: CausaViewerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [myAnswers, setMyAnswers] = useState(initialMyAnswers);
  const [myScore, setMyScore] = useState(initialMyScore);
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctOption: string;
    score: number;
  } | null>(null);
  const [timerMs, setTimerMs] = useState(CAUSA_TIME_LIMIT_MS);
  const [submitting, setSubmitting] = useState(false);

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Determinar la primera pregunta sin responder
  useEffect(() => {
    if (status !== "ACTIVE") return;
    const firstUnanswered = myAnswers.find((a) => a.selectedOption === null);
    if (firstUnanswered) {
      setCurrentIdx(firstUnanswered.questionIdx);
    }
  }, [status, myAnswers]);

  // Timer
  useEffect(() => {
    if (currentIdx === null || status !== "ACTIVE" || feedback) return;

    startTimeRef.current = Date.now();
    setTimerMs(CAUSA_TIME_LIMIT_MS);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = CAUSA_TIME_LIMIT_MS - elapsed;
      setTimerMs(Math.max(0, remaining));

      if (remaining <= 0) {
        // Tiempo agotado, enviar sin respuesta
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit(null);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, status, feedback]);

  const handleSubmit = useCallback(
    async (option: string | null) => {
      if (currentIdx === null || submitting) return;

      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const timeMs = Date.now() - startTimeRef.current;

      try {
        const res = await fetch(`/api/causas/${causaId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIdx: currentIdx,
            selectedOption: option ?? "",
            timeMs,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          setFeedback({
            isCorrect: data.isCorrect,
            correctOption: data.correctOption,
            score: data.score,
          });

          // Actualizar mi score
          setMyScore((prev) => prev + data.score);

          // Actualizar myAnswers
          setMyAnswers((prev) =>
            prev.map((a) =>
              a.questionIdx === currentIdx
                ? {
                    ...a,
                    selectedOption: option ?? "",
                    isCorrect: data.isCorrect,
                    timeMs,
                    score: data.score,
                  }
                : a
            )
          );

          if (data.causaComplete) {
            setStatus("COMPLETED");
            // Refresh para obtener resultados completos
            setTimeout(() => router.refresh(), 1500);
          }
        }
      } catch {
        // silently fail
      } finally {
        setSubmitting(false);
      }
    },
    [causaId, currentIdx, submitting, router]
  );

  function handleNext() {
    setFeedback(null);
    setSelected(null);

    // Siguiente sin responder
    const nextUnanswered = myAnswers.find(
      (a) =>
        a.questionIdx > (currentIdx ?? -1) && a.selectedOption === null
    );

    if (nextUnanswered) {
      setCurrentIdx(nextUnanswered.questionIdx);
    } else {
      setCurrentIdx(null);
    }
  }

  const currentAnswer = currentIdx !== null
    ? myAnswers.find((a) => a.questionIdx === currentIdx)
    : null;

  const answeredCount = myAnswers.filter(
    (a) => a.selectedOption !== null
  ).length;

  const timerSeconds = (timerMs / 1000).toFixed(1);
  const timerPercent = (timerMs / CAUSA_TIME_LIMIT_MS) * 100;

  // ─── COMPLETED ───────────────────────────────────────
  if (status === "COMPLETED") {
    const won = winnerId === userId;
    const draw = winnerId === null;

    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Resultado */}
          <div
            className={`rounded-[4px] border-2 p-8 text-center ${
              draw
                ? "border-gz-rule bg-gz-cream-dark"
                : won
                ? "border-gz-sage bg-gz-sage/[0.06]"
                : "border-gz-burgundy bg-gz-burgundy/[0.06]"
            }`}
          >
            <p className="text-5xl">
              {draw ? "🤝" : won ? "🏆" : "😔"}
            </p>
            <h2
              className={`mt-4 font-cormorant text-[28px] !font-bold ${
                draw
                  ? "text-gz-ink-mid"
                  : won
                  ? "text-gz-sage"
                  : "text-gz-burgundy"
              }`}
            >
              {draw ? "Empate" : won ? "¡Victoria!" : "Derrota"}
            </h2>
            <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">vs {opponentName}</p>
          </div>

          {/* Scores */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-[4px] border border-gz-rule p-6 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
              <p className="font-ibm-mono text-[11px] text-gz-ink-light">Tu Score</p>
              <p className="mt-1 font-cormorant text-[32px] !font-bold text-gz-ink">
                {myScore}
              </p>
            </div>
            <div className="rounded-[4px] border border-gz-rule p-6 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
              <p className="font-ibm-mono text-[11px] text-gz-ink-light">
                Score {opponentName.split(" ")[0]}
              </p>
              <p className="mt-1 font-cormorant text-[32px] !font-bold text-gz-ink">
                {opponentScore}
              </p>
            </div>
          </div>

          {/* Detalle preguntas */}
          <h3 className="mt-8 font-cormorant text-[20px] !font-bold text-gz-ink">
            Detalle de respuestas
          </h3>
          <div className="mt-4 space-y-3">
            {myAnswers.map((a, idx) => {
              const opAns = opponentAnswers.find(
                (o) => o.questionIdx === a.questionIdx
              );
              return (
                <div
                  key={idx}
                  className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  <p className="font-archivo text-[13px] font-medium text-gz-ink">
                    {idx + 1}. {a.mcq.question}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="font-ibm-mono text-[11px] text-gz-ink-light">Tú</p>
                      <p
                        className={
                          a.isCorrect ? "text-gz-sage" : "text-gz-burgundy"
                        }
                      >
                        {a.selectedOption || "Sin respuesta"}{" "}
                        {a.isCorrect ? "✓" : "✗"} (+{a.score} pts)
                      </p>
                    </div>
                    <div>
                      <p className="font-ibm-mono text-[11px] text-gz-ink-light">Oponente</p>
                      <p
                        className={
                          opAns?.isCorrect
                            ? "text-gz-sage"
                            : "text-gz-burgundy"
                        }
                      >
                        {opAns?.selectedOption || "Sin respuesta"}{" "}
                        {opAns?.isCorrect ? "✓" : "✗"} (+
                        {opAns?.score ?? 0} pts)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    );
  }

  // ─── ACTIVE (jugando) ────────────────────────────────
  if (status === "ACTIVE" && currentAnswer && currentIdx !== null) {
    const options = [
      { key: "A", text: currentAnswer.mcq.optionA },
      { key: "B", text: currentAnswer.mcq.optionB },
      { key: "C", text: currentAnswer.mcq.optionC },
      { key: "D", text: currentAnswer.mcq.optionD },
    ];

    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Sub-header inline */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">vs {opponentName}</h2>
            <span className="font-ibm-mono text-[12px] text-gz-ink-light">{answeredCount}/{totalQuestions}</span>
          </div>
          {/* Barra de progreso */}
          <div className="mb-4 flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const ans = myAnswers.find((a) => a.questionIdx === i);
              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-sm ${
                    i === currentIdx
                      ? "bg-gz-gold"
                      : ans?.selectedOption !== null
                      ? ans?.isCorrect
                        ? "bg-gz-sage"
                        : "bg-gz-burgundy"
                      : "bg-gz-cream-dark"
                  }`}
                />
              );
            })}
          </div>

          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <span className="font-ibm-mono text-[12px] text-gz-ink-light">Tiempo</span>
              <span
                className={`font-ibm-mono font-bold ${
                  timerMs < 5000
                    ? "text-gz-burgundy"
                    : timerMs < 10000
                    ? "text-gz-gold"
                    : "text-gz-ink"
                }`}
              >
                {timerSeconds}s
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-sm bg-gz-cream-dark">
              <div
                className={`h-full rounded-sm transition-all ${
                  timerMs < 5000
                    ? "bg-gz-burgundy"
                    : timerMs < 10000
                    ? "bg-gz-gold"
                    : "bg-gz-gold"
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Score actual */}
          <div className="mb-4 text-center">
            <span className="rounded-[3px] bg-gz-gold/15 px-3 py-1 font-ibm-mono text-[12px] font-semibold text-gz-gold">
              {myScore} pts
            </span>
          </div>

          {/* Pregunta */}
          <div className="rounded-[4px] border border-gz-rule p-6" style={{ backgroundColor: "var(--gz-cream)" }}>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light uppercase mb-2">
              Pregunta {currentIdx + 1} de {totalQuestions}
            </p>
            <p className="font-cormorant text-[20px] font-semibold text-gz-ink">
              {currentAnswer.mcq.question}
            </p>

            <div className="mt-6 space-y-3">
              {options.map((opt) => {
                let style =
                  "border-gz-rule text-gz-ink hover:border-gz-gold";

                if (feedback) {
                  if (opt.key === feedback.correctOption) {
                    style =
                      "border-gz-sage bg-gz-sage/[0.06] text-gz-sage ring-1 ring-gz-sage/30";
                  } else if (
                    opt.key === selected &&
                    !feedback.isCorrect
                  ) {
                    style =
                      "border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy ring-1 ring-gz-burgundy/30";
                  } else {
                    style = "border-gz-rule bg-gz-cream-dark text-gz-ink-light";
                  }
                } else if (selected === opt.key) {
                  style =
                    "border-gz-gold bg-gz-gold/[0.06] text-gz-ink ring-1 ring-gz-gold/20";
                }

                return (
                  <button
                    key={opt.key}
                    onClick={() => {
                      if (!feedback && !submitting) {
                        setSelected(opt.key);
                      }
                    }}
                    disabled={!!feedback || submitting}
                    className={`w-full rounded-[3px] border px-4 py-3 text-left font-archivo text-[14px] transition-all ${style}`}
                  >
                    <span className="font-semibold">{opt.key}.</span>{" "}
                    {opt.text}
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {feedback && (
              <div
                className={`mt-4 rounded-[3px] p-3 font-archivo text-[13px] font-medium ${
                  feedback.isCorrect
                    ? "border-l-[3px] border-gz-sage bg-gz-sage/[0.06] text-gz-sage"
                    : "border-l-[3px] border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy"
                }`}
              >
                {feedback.isCorrect ? "¡Correcto!" : "Incorrecto"} — +
                {feedback.score} puntos
              </div>
            )}

            {/* Botones */}
            <div className="mt-6 flex justify-end">
              {!feedback ? (
                <button
                  onClick={() => handleSubmit(selected)}
                  disabled={!selected || submitting}
                  className="rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Confirmar"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="rounded-[3px] bg-gz-gold px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90"
                >
                  {answeredCount >= totalQuestions
                    ? "Ver resultado"
                    : "Siguiente"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ─── ACTIVE pero todas respondidas (esperando al oponente) ───
  if (status === "ACTIVE" && currentIdx === null) {
    return (
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-5xl">⏳</p>
          <h2 className="mt-4 font-cormorant text-[22px] !font-bold text-gz-ink">
            ¡Has completado tus respuestas!
          </h2>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">
            Tu puntaje: <span className="font-bold text-gz-gold">{myScore}</span>{" "}
            pts
          </p>
          <p className="mt-4 font-ibm-mono text-[12px] text-gz-ink-light">
            Esperando a que {opponentName} termine...
          </p>
          <button
            onClick={() => router.refresh()}
            className="mt-6 rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            Actualizar
          </button>
        </div>
      </main>
    );
  }

  // ─── Fallback (PENDING, REJECTED, EXPIRED) ──────────
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-5xl">📋</p>
        <h2 className="mt-4 font-cormorant text-[22px] !font-bold text-gz-ink">
          Estado: {status === "PENDING" ? "Pendiente" : status}
        </h2>
        <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">vs {opponentName}</p>
        <Link
          href="/dashboard/causas"
          className="mt-6 inline-block rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver
        </Link>
      </div>
    </main>
  );
}
