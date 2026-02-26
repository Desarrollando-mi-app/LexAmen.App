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
      <main className="min-h-screen bg-paper">
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link
              href="/dashboard/causas"
              className="text-sm text-navy/60 hover:text-navy"
            >
              &larr; Causas
            </Link>
            <h1 className="text-xl font-bold text-navy">Resultado</h1>
            <div className="w-16" />
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Resultado */}
          <div
            className={`rounded-xl border-2 p-8 text-center ${
              draw
                ? "border-gray-300 bg-gray-50"
                : won
                ? "border-green-300 bg-green-50"
                : "border-red-300 bg-red-50"
            }`}
          >
            <p className="text-5xl">
              {draw ? "🤝" : won ? "🏆" : "😔"}
            </p>
            <h2
              className={`mt-4 text-2xl font-bold ${
                draw
                  ? "text-gray-700"
                  : won
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {draw ? "Empate" : won ? "¡Victoria!" : "Derrota"}
            </h2>
            <p className="mt-2 text-navy/60">vs {opponentName}</p>
          </div>

          {/* Scores */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-white p-6 text-center">
              <p className="text-sm text-navy/50">Tu Score</p>
              <p className="mt-1 text-3xl font-bold text-navy">
                {myScore}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-white p-6 text-center">
              <p className="text-sm text-navy/50">
                Score {opponentName.split(" ")[0]}
              </p>
              <p className="mt-1 text-3xl font-bold text-navy">
                {opponentScore}
              </p>
            </div>
          </div>

          {/* Detalle preguntas */}
          <h3 className="mt-8 text-lg font-semibold text-navy">
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
                  className="rounded-lg border border-border bg-white p-4"
                >
                  <p className="text-sm font-medium text-navy">
                    {idx + 1}. {a.mcq.question}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-navy/50">Tú</p>
                      <p
                        className={
                          a.isCorrect ? "text-green-600" : "text-red-500"
                        }
                      >
                        {a.selectedOption || "Sin respuesta"}{" "}
                        {a.isCorrect ? "✓" : "✗"} (+{a.score} pts)
                      </p>
                    </div>
                    <div>
                      <p className="text-navy/50">Oponente</p>
                      <p
                        className={
                          opAns?.isCorrect
                            ? "text-green-600"
                            : "text-red-500"
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
      <main className="min-h-screen bg-paper">
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link
              href="/dashboard/causas"
              className="text-sm text-navy/60 hover:text-navy"
            >
              &larr; Causas
            </Link>
            <h1 className="text-lg font-bold text-navy">
              vs {opponentName}
            </h1>
            <span className="text-sm text-navy/50">
              {answeredCount}/{totalQuestions}
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Barra de progreso */}
          <div className="mb-4 flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => {
              const ans = myAnswers.find((a) => a.questionIdx === i);
              return (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i === currentIdx
                      ? "bg-gold"
                      : ans?.selectedOption !== null
                      ? ans?.isCorrect
                        ? "bg-green-400"
                        : "bg-red-400"
                      : "bg-border"
                  }`}
                />
              );
            })}
          </div>

          {/* Timer */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-navy/50">Tiempo</span>
              <span
                className={`font-mono font-bold ${
                  timerMs < 5000
                    ? "text-red-500"
                    : timerMs < 10000
                    ? "text-orange-500"
                    : "text-navy"
                }`}
              >
                {timerSeconds}s
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
              <div
                className={`h-full rounded-full transition-all ${
                  timerMs < 5000
                    ? "bg-red-500"
                    : timerMs < 10000
                    ? "bg-orange-500"
                    : "bg-gold"
                }`}
                style={{ width: `${timerPercent}%` }}
              />
            </div>
          </div>

          {/* Score actual */}
          <div className="mb-4 text-center">
            <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
              {myScore} pts
            </span>
          </div>

          {/* Pregunta */}
          <div className="rounded-xl border border-border bg-white p-6">
            <p className="text-xs text-navy/50 mb-2">
              Pregunta {currentIdx + 1} de {totalQuestions}
            </p>
            <p className="text-lg font-medium text-navy">
              {currentAnswer.mcq.question}
            </p>

            <div className="mt-6 space-y-3">
              {options.map((opt) => {
                let style =
                  "border-border bg-paper text-navy hover:border-gold/50";

                if (feedback) {
                  if (opt.key === feedback.correctOption) {
                    style =
                      "border-green-500 bg-green-50 text-green-700 ring-2 ring-green-200";
                  } else if (
                    opt.key === selected &&
                    !feedback.isCorrect
                  ) {
                    style =
                      "border-red-500 bg-red-50 text-red-600 ring-2 ring-red-200";
                  } else {
                    style = "border-border bg-paper/50 text-navy/40";
                  }
                } else if (selected === opt.key) {
                  style =
                    "border-gold bg-gold/10 text-navy ring-2 ring-gold/30";
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
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition-all ${style}`}
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
                className={`mt-4 rounded-lg p-3 text-sm font-medium ${
                  feedback.isCorrect
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-600"
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
                  className="rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
                >
                  {submitting ? "Enviando..." : "Confirmar"}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90"
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
      <main className="min-h-screen bg-paper">
        <header className="border-b border-border bg-white px-6 py-4">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <Link
              href="/dashboard/causas"
              className="text-sm text-navy/60 hover:text-navy"
            >
              &larr; Causas
            </Link>
            <h1 className="text-xl font-bold text-navy">Causa</h1>
            <div className="w-16" />
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-5xl">⏳</p>
          <h2 className="mt-4 text-xl font-bold text-navy">
            ¡Has completado tus respuestas!
          </h2>
          <p className="mt-2 text-navy/60">
            Tu puntaje: <span className="font-bold text-gold">{myScore}</span>{" "}
            pts
          </p>
          <p className="mt-4 text-sm text-navy/50">
            Esperando a que {opponentName} termine...
          </p>
          <button
            onClick={() => router.refresh()}
            className="mt-6 rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
          >
            Actualizar
          </button>
        </div>
      </main>
    );
  }

  // ─── Fallback (PENDING, REJECTED, EXPIRED) ──────────
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link
            href="/dashboard/causas"
            className="text-sm text-navy/60 hover:text-navy"
          >
            &larr; Causas
          </Link>
          <h1 className="text-xl font-bold text-navy">Causa</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-5xl">📋</p>
        <h2 className="mt-4 text-xl font-bold text-navy">
          Estado: {status === "PENDING" ? "Pendiente" : status}
        </h2>
        <p className="mt-2 text-navy/60">vs {opponentName}</p>
        <Link
          href="/dashboard/causas"
          className="mt-6 inline-block rounded-lg bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Volver
        </Link>
      </div>
    </main>
  );
}
