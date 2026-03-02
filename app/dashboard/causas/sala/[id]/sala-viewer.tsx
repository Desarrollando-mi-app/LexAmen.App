"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BADGE_MAP } from "@/lib/badge-constants";

// ─── Types ────────────────────────────────────────────────

interface Participant {
  userId: string;
  name: string;
  score: number;
  position: number | null;
}

interface MCQ {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption?: string;
  explanation?: string | null;
}

interface RoomQuestion {
  questionIndex: number;
  mcq: MCQ;
}

interface MyAnswer {
  questionIndex: number;
  selectedOption: string | null;
  isCorrect: boolean | null;
  score: number;
  timeMs: number | null;
}

interface ParticipantScore {
  userId: string;
  name: string;
  score: number;
  answeredCount: number;
}

interface SalaViewerProps {
  roomId: string;
  code: string;
  status: string;
  maxPlayers: number;
  totalQuestions: number;
  createdById: string;
  creatorName: string;
  userId: string;
  participants: Participant[];
  questions: RoomQuestion[];
  myAnswers: MyAnswer[];
}

const TIMER_LIMIT_MS = 30000;

// ─── Component ────────────────────────────────────────────

export function SalaViewer({
  roomId,
  code,
  status: initialStatus,
  maxPlayers,
  totalQuestions,
  createdById,
  creatorName,
  userId,
  participants: initialParticipants,
  questions: initialQuestions,
  myAnswers: initialMyAnswers,
}: SalaViewerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [participants, setParticipants] = useState(initialParticipants);
  const [questions, setQuestions] = useState(initialQuestions);
  const [myAnswers, setMyAnswers] = useState(initialMyAnswers);
  const [participantScores, setParticipantScores] = useState<
    ParticipantScore[]
  >([]);

  // Gameplay state
  const [currentIdx, setCurrentIdx] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    correctOption: string;
    score: number;
  } | null>(null);
  const [timerMs, setTimerMs] = useState(TIMER_LIMIT_MS);
  const [submitting, setSubmitting] = useState(false);
  const [myTotalScore, setMyTotalScore] = useState(
    initialMyAnswers.reduce((sum, a) => sum + a.score, 0)
  );

  // Lobby / start
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Badges (finished)
  const [badgesByUser, setBadgesByUser] = useState<Record<string, string[]>>(
    {}
  );

  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isCreator = userId === createdById;

  // ─── Polling ────────────────────────────────────────────

  useEffect(() => {
    if (status === "finished") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/causa-rooms/${roomId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Update participants
        if (data.participants) {
          setParticipants(data.participants);
        }

        // Status change
        if (data.status !== status) {
          setStatus(data.status);

          if (data.status === "active" && data.questions) {
            setQuestions(data.questions);
            if (data.myAnswers) {
              setMyAnswers(data.myAnswers);
              setMyTotalScore(
                data.myAnswers.reduce(
                  (sum: number, a: MyAnswer) => sum + a.score,
                  0
                )
              );
            }
          }

          if (data.status === "finished") {
            // Refresh para obtener todos los datos
            router.refresh();
            return;
          }
        }

        // Update scores during active
        if (data.status === "active" && data.participantScores) {
          setParticipantScores(data.participantScores);
        }
      } catch {
        // silently fail
      }
    };

    pollRef.current = setInterval(poll, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [roomId, status, router]);

  // ─── Determine first unanswered question ────────────────

  useEffect(() => {
    if (status !== "active") return;

    const answeredIndexes = new Set(
      myAnswers
        .filter((a) => a.selectedOption !== null)
        .map((a) => a.questionIndex)
    );

    const firstUnanswered = questions.find(
      (q) => !answeredIndexes.has(q.questionIndex)
    );

    if (firstUnanswered) {
      setCurrentIdx(firstUnanswered.questionIndex);
    } else {
      setCurrentIdx(null);
    }
  }, [status, myAnswers, questions]);

  // ─── Timer ──────────────────────────────────────────────

  useEffect(() => {
    if (currentIdx === null || status !== "active" || feedback) return;

    startTimeRef.current = Date.now();
    setTimerMs(TIMER_LIMIT_MS);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = TIMER_LIMIT_MS - elapsed;
      setTimerMs(Math.max(0, remaining));

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit(null);
      }
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, status, feedback]);

  // ─── Handlers ───────────────────────────────────────────

  const handleSubmit = useCallback(
    async (option: string | null) => {
      if (currentIdx === null || submitting) return;

      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const timeMs = Date.now() - startTimeRef.current;

      try {
        const res = await fetch(`/api/causa-rooms/${roomId}/answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionIndex: currentIdx,
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

          setMyTotalScore((prev) => prev + data.score);

          setMyAnswers((prev) => [
            ...prev,
            {
              questionIndex: currentIdx,
              selectedOption: option ?? "",
              isCorrect: data.isCorrect,
              score: data.score,
              timeMs,
            },
          ]);

          if (data.roomFinished) {
            setTimeout(() => {
              setStatus("finished");
              if (data.rankings) {
                setParticipants(
                  data.rankings.map(
                    (r: {
                      userId: string;
                      totalScore: number;
                      position: number;
                    }) => ({
                      userId: r.userId,
                      name:
                        participants.find((p) => p.userId === r.userId)?.name ??
                        "Jugador",
                      score: r.totalScore,
                      position: r.position,
                    })
                  )
                );
              }
              if (data.badgeResults) {
                setBadgesByUser(data.badgeResults);
              }
              router.refresh();
            }, 1500);
          }
        }
      } catch {
        // silently fail
      } finally {
        setSubmitting(false);
      }
    },
    [roomId, currentIdx, submitting, participants, router]
  );

  function handleNext() {
    setFeedback(null);
    setSelected(null);

    const answeredIndexes = new Set(
      myAnswers
        .filter((a) => a.selectedOption !== null)
        .map((a) => a.questionIndex)
    );

    const nextUnanswered = questions.find(
      (q) =>
        q.questionIndex > (currentIdx ?? -1) &&
        !answeredIndexes.has(q.questionIndex)
    );

    if (nextUnanswered) {
      setCurrentIdx(nextUnanswered.questionIndex);
    } else {
      setCurrentIdx(null);
    }
  }

  async function handleStart() {
    setStarting(true);
    try {
      const res = await fetch(`/api/causa-rooms/${roomId}/start`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setStarting(false);
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ─── Derived ────────────────────────────────────────────

  const answeredCount = myAnswers.filter(
    (a) => a.selectedOption !== null
  ).length;
  const timerSeconds = (timerMs / 1000).toFixed(1);
  const timerPercent = (timerMs / TIMER_LIMIT_MS) * 100;

  const currentQuestion =
    currentIdx !== null
      ? questions.find((q) => q.questionIndex === currentIdx)
      : null;

  // ─── LOBBY ──────────────────────────────────────────────

  if (status === "lobby") {
    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Code */}
          <div className="rounded-2xl border-2 border-dashed border-gold/40 bg-gold/5 p-8 text-center">
            <p className="text-sm font-medium text-navy/60">
              Comparte este codigo
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-3xl font-bold tracking-widest text-navy shadow-sm transition-shadow hover:shadow-md"
            >
              {code}
              <span className="text-sm font-normal text-navy/40">
                {copied ? "Copiado!" : "Copiar"}
              </span>
            </button>
            <p className="mt-3 text-xs text-navy/40">
              Creado por {creatorName}
            </p>
          </div>

          {/* Participants */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy">Jugadores</h2>
              <span className="text-sm text-navy/50">
                {participants.length}/{maxPlayers}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {participants.map((p, idx) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-3 rounded-xl border border-border bg-white px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy/10 text-sm font-bold text-navy">
                    {idx + 1}
                  </span>
                  <span className="flex-1 font-medium text-navy">
                    {p.name}
                    {p.userId === createdById && (
                      <span className="ml-2 text-xs text-gold">(Host)</span>
                    )}
                    {p.userId === userId && (
                      <span className="ml-1 text-xs text-navy/40">(Tu)</span>
                    )}
                  </span>
                </div>
              ))}

              {/* Slots vacios */}
              {Array.from({
                length: maxPlayers - participants.length,
              }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center gap-3 rounded-xl border border-dashed border-border/50 px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-border/20 text-sm text-navy/30">
                    {participants.length + i + 1}
                  </span>
                  <span className="text-sm text-navy/30">
                    Esperando jugador...
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Button */}
          {isCreator && (
            <div className="mt-8 text-center">
              <button
                onClick={handleStart}
                disabled={starting || participants.length < 2}
                className="rounded-xl bg-navy px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
              >
                {starting
                  ? "Iniciando..."
                  : participants.length < 2
                  ? "Necesitas al menos 2 jugadores"
                  : "Iniciar Causa"}
              </button>
            </div>
          )}

          {!isCreator && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-xl bg-paper px-6 py-3 text-sm text-navy/60">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
                Esperando a que el host inicie...
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─── ACTIVE (jugando) ───────────────────────────────────

  if (status === "active" && currentQuestion && currentIdx !== null) {
    const options = [
      { key: "A", text: currentQuestion.mcq.optionA },
      { key: "B", text: currentQuestion.mcq.optionB },
      { key: "C", text: currentQuestion.mcq.optionC },
      { key: "D", text: currentQuestion.mcq.optionD },
    ];

    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto flex max-w-4xl gap-6 px-6 py-8">
          {/* Main game area */}
          <div className="min-w-0 flex-1">
            {/* Progress bar */}
            <div className="mb-4 flex gap-1">
              {Array.from({ length: totalQuestions }).map((_, i) => {
                const ans = myAnswers.find((a) => a.questionIndex === i);
                const isAnswered = ans && ans.selectedOption !== null;
                return (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-full ${
                      i === currentIdx
                        ? "bg-gold"
                        : isAnswered
                        ? ans.isCorrect
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

            {/* Score */}
            <div className="mb-4 text-center">
              <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-gold">
                {myTotalScore} pts
              </span>
            </div>

            {/* Question */}
            <div className="rounded-xl border border-border bg-white p-6">
              <p className="text-xs text-navy/50 mb-2">
                Pregunta {currentIdx + 1} de {totalQuestions}
              </p>
              <p className="text-lg font-medium text-navy">
                {currentQuestion.mcq.question}
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
                  {feedback.isCorrect ? "Correcto!" : "Incorrecto"} — +
                  {feedback.score} puntos
                </div>
              )}

              {/* Buttons */}
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

          {/* Leaderboard sidebar */}
          <aside className="hidden w-[240px] shrink-0 lg:block">
            <div className="sticky top-4 rounded-xl border border-border bg-white p-4">
              <h3 className="text-sm font-bold text-navy">Tabla en Vivo</h3>
              <div className="mt-3 space-y-2">
                {(participantScores.length > 0
                  ? [...participantScores].sort(
                      (a, b) => b.score - a.score
                    )
                  : participants
                      .map((p) => ({
                        userId: p.userId,
                        name: p.name,
                        score: p.userId === userId ? myTotalScore : p.score,
                        answeredCount:
                          p.userId === userId ? answeredCount : 0,
                      }))
                ).map((p, idx) => (
                  <div
                    key={p.userId}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${
                      p.userId === userId
                        ? "bg-gold/10 font-semibold"
                        : "bg-paper"
                    }`}
                  >
                    <span className="w-5 text-center font-bold text-navy/50">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate text-navy">
                      {p.name}
                      {p.userId === userId && " (Tu)"}
                    </span>
                    <span className="font-mono font-semibold text-gold">
                      {p.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    );
  }

  // ─── ACTIVE pero todas respondidas (esperando) ──────────

  if (status === "active" && currentIdx === null) {
    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-5xl">&#x231B;</p>
          <h2 className="mt-4 text-xl font-bold text-navy">
            Has completado tus respuestas!
          </h2>
          <p className="mt-2 text-navy/60">
            Tu puntaje:{" "}
            <span className="font-bold text-gold">{myTotalScore}</span> pts
          </p>

          {/* Progress otros */}
          {participantScores.length > 0 && (
            <div className="mx-auto mt-8 max-w-sm space-y-2">
              <p className="text-sm font-medium text-navy/60">
                Progreso de los demas
              </p>
              {participantScores
                .filter((p) => p.userId !== userId)
                .map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-2"
                  >
                    <span className="flex-1 text-sm text-navy">{p.name}</span>
                    <span className="text-xs text-navy/50">
                      {p.answeredCount}/{totalQuestions}
                    </span>
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full bg-gold transition-all"
                        style={{
                          width: `${
                            (p.answeredCount / totalQuestions) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}

          <p className="mt-8 text-sm text-navy/40">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />{" "}
            Esperando a que los demas terminen...
          </p>
        </div>
      </main>
    );
  }

  // ─── FINISHED ───────────────────────────────────────────

  if (status === "finished") {
    const sortedParticipants = [...participants].sort(
      (a, b) => (a.position ?? 99) - (b.position ?? 99)
    );

    const myParticipant = sortedParticipants.find(
      (p) => p.userId === userId
    );
    const myPosition = myParticipant?.position ?? 0;

    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Podium */}
          <div
            className={`rounded-2xl border-2 p-8 text-center ${
              myPosition === 1
                ? "border-green-300 bg-green-50"
                : myPosition <= 3
                ? "border-yellow-300 bg-yellow-50"
                : "border-border bg-white"
            }`}
          >
            <p className="text-5xl">
              {myPosition === 1
                ? "🏆"
                : myPosition === 2
                ? "🥈"
                : myPosition === 3
                ? "🥉"
                : "🎯"}
            </p>
            <h2
              className={`mt-4 text-2xl font-bold ${
                myPosition === 1
                  ? "text-green-700"
                  : myPosition <= 3
                  ? "text-yellow-700"
                  : "text-navy"
              }`}
            >
              {myPosition === 1
                ? "Victoria!"
                : `${myPosition}° Lugar`}
            </h2>
            <p className="mt-1 text-navy/60">
              {myTotalScore} puntos
            </p>
          </div>

          {/* Rankings */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-navy">
              Clasificacion Final
            </h3>
            <div className="mt-4 space-y-2">
              {sortedParticipants.map((p) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                    p.userId === userId
                      ? "border-gold/30 bg-gold/5"
                      : "border-border bg-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      p.position === 1
                        ? "bg-green-100 text-green-700"
                        : p.position === 2
                        ? "bg-blue-100 text-blue-700"
                        : p.position === 3
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-border/30 text-navy/50"
                    }`}
                  >
                    {p.position === 1
                      ? "🥇"
                      : p.position === 2
                      ? "🥈"
                      : p.position === 3
                      ? "🥉"
                      : `${p.position}`}
                  </span>
                  <span className="flex-1 font-medium text-navy">
                    {p.name}
                    {p.userId === userId && (
                      <span className="ml-1 text-xs text-navy/40">(Tu)</span>
                    )}
                  </span>
                  <span className="font-mono font-bold text-gold">
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          {Object.keys(badgesByUser).length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-navy">
                Insignias Obtenidas
              </h3>
              <div className="mt-4 space-y-2">
                {Object.entries(badgesByUser).map(([uid, badges]) => {
                  const pName =
                    participants.find((p) => p.userId === uid)?.name ??
                    "Jugador";
                  return (
                    <div
                      key={uid}
                      className="rounded-xl border border-border bg-white p-4"
                    >
                      <p className="text-sm font-medium text-navy">
                        {pName}
                        {uid === userId && " (Tu)"}
                      </p>
                      <div className="mt-2 flex gap-3">
                        {badges.map((slug) => {
                          const badge = BADGE_MAP[slug as keyof typeof BADGE_MAP];
                          if (!badge) return null;
                          return (
                            <div
                              key={slug}
                              className="text-center"
                              title={badge.description}
                            >
                              <span className="text-2xl">{badge.emoji}</span>
                              <p className="text-[10px] font-medium text-navy">
                                {badge.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detalle preguntas */}
          {questions.length > 0 && questions[0].mcq.correctOption && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-navy">
                Detalle de Respuestas
              </h3>
              <div className="mt-4 space-y-3">
                {questions.map((q) => {
                  const myAns = myAnswers.find(
                    (a) => a.questionIndex === q.questionIndex
                  );
                  return (
                    <div
                      key={q.questionIndex}
                      className="rounded-lg border border-border bg-white p-4"
                    >
                      <p className="text-sm font-medium text-navy">
                        {q.questionIndex + 1}. {q.mcq.question}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-xs">
                        <span
                          className={
                            myAns?.isCorrect
                              ? "text-green-600"
                              : "text-red-500"
                          }
                        >
                          Tu: {myAns?.selectedOption || "Sin respuesta"}{" "}
                          {myAns?.isCorrect ? "✓" : "✗"} (+{myAns?.score ?? 0}{" "}
                          pts)
                        </span>
                        <span className="text-navy/40">
                          Correcta: {q.mcq.correctOption}
                        </span>
                      </div>
                      {q.mcq.explanation && (
                        <p className="mt-2 text-xs text-navy/50 italic">
                          {q.mcq.explanation}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Volver */}
          <div className="mt-8 text-center">
            <Link
              href="/dashboard/causas"
              className="inline-block rounded-xl bg-navy px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy/90"
            >
              Volver a Causas
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ─── Fallback ───────────────────────────────────────────

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-5xl">📋</p>
        <h2 className="mt-4 text-xl font-bold text-navy">
          Estado: {status}
        </h2>
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
