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
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Code */}
          <div className="rounded-[4px] border-2 border-dashed border-gz-gold/40 bg-gz-gold/[0.06] p-8 text-center">
            <p className="font-archivo text-[13px] text-gz-ink-mid">
              Comparte este codigo
            </p>
            <button
              onClick={handleCopyCode}
              className="mt-2 inline-flex items-center gap-2 rounded-[4px] bg-white px-6 py-3 font-ibm-mono text-[28px] font-bold tracking-widest text-gz-ink shadow-sm transition-shadow hover:shadow-sm"
            >
              {code}
              <span className="font-archivo text-[13px] font-normal text-gz-ink-light">
                {copied ? "Copiado!" : "Copiar"}
              </span>
            </button>
            <p className="mt-3 font-ibm-mono text-[11px] text-gz-ink-light">
              Creado por {creatorName}
            </p>
          </div>

          {/* Participants */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">Jugadores</h2>
              <span className="font-ibm-mono text-[12px] text-gz-ink-light">
                {participants.length}/{maxPlayers}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {participants.map((p, idx) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-3 rounded-[4px] border border-gz-rule bg-white px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[12px] font-bold text-gz-ink">
                    {idx + 1}
                  </span>
                  <span className="font-archivo text-[14px] font-medium text-gz-ink">
                    {p.name}
                    {p.userId === createdById && (
                      <span className="ml-2 font-ibm-mono text-[8px] uppercase tracking-[1px] bg-gz-gold/[0.12] text-gz-gold px-2 py-0.5 rounded-sm">(Host)</span>
                    )}
                    {p.userId === userId && (
                      <span className="ml-1 font-ibm-mono text-[10px] text-gz-ink-light">(Tu)</span>
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
                  className="flex items-center gap-3 rounded-[4px] border border-dashed border-gz-rule px-4 py-3"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-gz-cream-dark font-ibm-mono text-[12px] text-gz-ink-light">
                    {participants.length + i + 1}
                  </span>
                  <span className="font-archivo text-[13px] text-gz-ink-light">
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
                className="rounded-[4px] bg-gz-navy px-8 py-3 font-archivo text-[14px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
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
              <div className="inline-flex items-center gap-2 rounded-[4px] px-6 py-3 font-archivo text-[13px] text-gz-ink-mid" style={{ backgroundColor: "var(--gz-cream)" }}>
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gz-gold" />
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
      <main className="min-h-screen">
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
                    className={`h-2 flex-1 rounded-sm ${
                      i === currentIdx
                        ? "bg-gz-gold"
                        : isAnswered
                        ? ans.isCorrect
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
              <div className="flex items-center justify-between text-sm">
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

            {/* Score */}
            <div className="mb-4 text-center">
              <span className="rounded-sm bg-gz-gold/15 px-3 py-1 font-ibm-mono text-[12px] font-semibold text-gz-gold">
                {myTotalScore} pts
              </span>
            </div>

            {/* Question */}
            <div className="rounded-[4px] border border-gz-rule bg-white p-6">
              <p className="font-ibm-mono text-[10px] text-gz-ink-light uppercase mb-2">
                Pregunta {currentIdx + 1} de {totalQuestions}
              </p>
              <p className="font-cormorant text-[20px] font-semibold text-gz-ink">
                {currentQuestion.mcq.question}
              </p>

              <div className="mt-6 space-y-3">
                {options.map((opt) => {
                  let style =
                    "border-gz-rule text-gz-ink hover:border-gz-gold font-archivo text-[14px]";

                  if (feedback) {
                    if (opt.key === feedback.correctOption) {
                      style =
                        "border-gz-sage bg-gz-sage/[0.06] text-gz-sage ring-1 ring-gz-sage/30 font-archivo text-[14px]";
                    } else if (
                      opt.key === selected &&
                      !feedback.isCorrect
                    ) {
                      style =
                        "border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy ring-1 ring-gz-burgundy/30 font-archivo text-[14px]";
                    } else {
                      style = "border-gz-rule text-gz-ink-light font-archivo text-[14px]";
                    }
                  } else if (selected === opt.key) {
                    style =
                      "border-gz-gold bg-gz-gold/[0.06] text-gz-ink ring-1 ring-gz-gold/20 font-archivo text-[14px]";
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
                      className={`w-full rounded-[3px] border px-4 py-3 text-left transition-all ${style}`}
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
                  className={`mt-4 rounded-[3px] border-l-[3px] p-3 font-archivo text-[13px] font-medium ${
                    feedback.isCorrect
                      ? "border-gz-sage bg-gz-sage/[0.06] text-gz-sage"
                      : "border-gz-burgundy bg-gz-burgundy/[0.06] text-gz-burgundy"
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
                    className="rounded-[4px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                  >
                    {submitting ? "Enviando..." : "Confirmar"}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="rounded-[4px] bg-gz-gold px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90"
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
            <div className="sticky top-4 rounded-[4px] border border-gz-rule bg-white p-4">
              <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-ink-light">Tabla en Vivo</h3>
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
                    className={`flex items-center gap-2 px-2.5 py-2 ${
                      p.userId === userId
                        ? "bg-gz-gold/10 font-semibold rounded-[3px]"
                        : ""
                    }`}
                  >
                    <span className="font-ibm-mono text-[12px] font-bold text-gz-ink-light w-5 text-center">
                      {idx + 1}
                    </span>
                    <span className="flex-1 truncate font-archivo text-[12px] text-gz-ink">
                      {p.name}
                      {p.userId === userId && " (Tu)"}
                    </span>
                    <span className="font-ibm-mono text-[12px] font-bold text-gz-gold">
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
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <p className="text-5xl">&#x231B;</p>
          <h2 className="mt-4 font-cormorant text-[22px] !font-bold text-gz-ink">
            Has completado tus respuestas!
          </h2>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">
            Tu puntaje:{" "}
            <span className="font-cormorant text-[20px] !font-bold text-gz-gold">{myTotalScore}</span> pts
          </p>

          {/* Progress otros */}
          {participantScores.length > 0 && (
            <div className="mx-auto mt-8 max-w-sm space-y-2">
              <p className="font-archivo text-[13px] font-medium text-gz-ink-mid">
                Progreso de los demas
              </p>
              {participantScores
                .filter((p) => p.userId !== userId)
                .map((p) => (
                  <div
                    key={p.userId}
                    className="flex items-center gap-3 rounded-[3px] border border-gz-rule bg-white px-4 py-2"
                  >
                    <span className="flex-1 font-archivo text-[13px] text-gz-ink">{p.name}</span>
                    <span className="font-ibm-mono text-[12px] text-gz-ink-light">
                      {p.answeredCount}/{totalQuestions}
                    </span>
                    <div className="h-2 w-20 overflow-hidden rounded-sm bg-gz-cream-dark">
                      <div
                        className="h-full rounded-sm bg-gz-gold transition-all"
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

          <p className="mt-8 font-archivo text-[13px] text-gz-ink-light">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gz-gold" />{" "}
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
      <main className="min-h-screen">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {/* Podium */}
          <div
            className={`rounded-[4px] border-2 p-8 text-center ${
              myPosition === 1
                ? "border-gz-sage bg-gz-sage/[0.06]"
                : myPosition <= 3
                ? "border-gz-gold bg-gz-gold/[0.06]"
                : "border-gz-rule bg-white"
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
              className={`mt-4 font-cormorant text-[28px] !font-bold ${
                myPosition === 1
                  ? "text-gz-sage"
                  : myPosition <= 3
                  ? "text-gz-gold"
                  : "text-gz-ink"
              }`}
            >
              {myPosition === 1
                ? "Victoria!"
                : `${myPosition}° Lugar`}
            </h2>
            <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
              {myTotalScore} puntos
            </p>
          </div>

          {/* Rankings */}
          <div className="mt-8">
            <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
              Clasificacion Final
            </h3>
            <div className="mt-4 space-y-2">
              {sortedParticipants.map((p) => (
                <div
                  key={p.userId}
                  className={`flex items-center gap-3 rounded-[4px] border px-4 py-3 ${
                    p.userId === userId
                      ? "border-gz-gold/30 bg-gz-gold/[0.06]"
                      : "border-gz-rule bg-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-ibm-mono text-[12px] font-bold ${
                      p.position === 1
                        ? "bg-gz-sage/[0.15] text-gz-sage"
                        : p.position === 2
                        ? "bg-gz-navy/[0.15] text-gz-navy"
                        : p.position === 3
                        ? "bg-gz-gold/[0.15] text-gz-gold"
                        : "bg-gz-cream-dark text-gz-ink-light"
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
                  <span className="flex-1 font-archivo text-[14px] font-medium text-gz-ink">
                    {p.name}
                    {p.userId === userId && (
                      <span className="ml-1 font-ibm-mono text-[10px] text-gz-ink-light">(Tu)</span>
                    )}
                  </span>
                  <span className="font-ibm-mono text-[13px] font-bold text-gz-gold">
                    {p.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          {Object.keys(badgesByUser).length > 0 && (
            <div className="mt-8">
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
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
                      className="rounded-[4px] border border-gz-rule bg-white p-4"
                    >
                      <p className="font-archivo text-[13px] font-medium text-gz-ink">
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
                              <p className="text-[10px] font-medium text-gz-ink">
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
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
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
                      className="rounded-[4px] border border-gz-rule bg-white p-4"
                    >
                      <p className="font-archivo text-[13px] font-medium text-gz-ink">
                        {q.questionIndex + 1}. {q.mcq.question}
                      </p>
                      <div className="mt-2 flex items-center gap-4 font-ibm-mono text-[12px]">
                        <span
                          className={
                            myAns?.isCorrect
                              ? "text-gz-sage"
                              : "text-gz-burgundy"
                          }
                        >
                          Tu: {myAns?.selectedOption || "Sin respuesta"}{" "}
                          {myAns?.isCorrect ? "✓" : "✗"} (+{myAns?.score ?? 0}{" "}
                          pts)
                        </span>
                        <span className="text-gz-ink-light">
                          Correcta: {q.mcq.correctOption}
                        </span>
                      </div>
                      {q.mcq.explanation && (
                        <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid">
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
              className="inline-block rounded-[4px] bg-gz-navy px-6 py-3 font-archivo text-[14px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
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
    <main className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-5xl">📋</p>
        <h2 className="mt-4 font-cormorant text-[22px] !font-bold text-gz-ink">
          Estado: {status}
        </h2>
        <Link
          href="/dashboard/causas"
          className="mt-6 inline-block rounded-[4px] bg-gz-navy px-5 py-2.5 font-archivo text-[14px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver
        </Link>
      </div>
    </main>
  );
}
