"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { playCorrect, playIncorrect, playXpGained, getAnimationsEnabled } from "@/lib/sounds";
import { TITULO_LABELS } from "@/lib/curriculum-data";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";
import { ReportButton } from "@/app/components/report-button";

/* ─── Types ─── */

interface DictadoItem {
  id: string;
  titulo: string;
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  materia: string | null;
  dificultad: number;
}

interface WordResult {
  original: string;
  usuario: string;
  correcto: boolean;
}

interface EvalResult {
  resultados: WordResult[];
  precision: number;
  palabrasCorrectas: number;
  palabrasTotales: number;
  xpGained: number;
  attemptsToday: number;
  newBadges: { slug: string; label: string; emoji: string; description: string; tier: string }[];
}

interface Props {
  items: DictadoItem[];
  attemptsToday: number;
  dailyLimit: number;
}

const RAMAS = ["DERECHO_CIVIL", "DERECHO_PROCESAL_CIVIL", "DERECHO_ORGANICO"];
const SPEEDS = [0.75, 1.0, 1.25] as const;

/* ─── Component ─── */

export function DictadoViewer({
  items,
  attemptsToday: initialAttempts,
  dailyLimit,
}: Props) {
  const [selectedRama, setSelectedRama] = useState<string>("ALL");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [attempts, setAttempts] = useState(initialAttempts);

  // Audio state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState<number>(1.0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Input state
  const [textoUsuario, setTextoUsuario] = useState("");
  const [evaluating, setEvaluating] = useState(false);

  // Result state
  const [result, setResult] = useState<EvalResult | null>(null);

  // Session stats
  const [sessionStats, setSessionStats] = useState({ completed: 0, totalXp: 0 });

  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

  // Filter items by rama
  const filteredItems = useMemo(() => {
    if (selectedRama === "ALL") return items;
    return items.filter((d) => d.rama === selectedRama);
  }, [items, selectedRama]);

  // Shuffle for variety
  const shuffledIndices = useMemo(() => {
    const indices = filteredItems.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [filteredItems]);

  const current = filteredItems[shuffledIndices[currentIndex]];
  const isLimitReached = attempts >= dailyLimit;
  const hasMore = currentIndex < shuffledIndices.length - 1;

  /* ─── Audio handlers ─── */

  const handleListenDictado = useCallback(
    async (selectedSpeed?: number) => {
      if (!current || loadingAudio) return;
      setLoadingAudio(true);

      try {
        const res = await fetch("/api/dictado/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dictadoId: current.id,
            speed: selectedSpeed ?? speed,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Error generando audio");
        }

        const data = await res.json();
        setAudioUrl(data.audioUrl);

        // Play automatically
        if (audioRef.current) {
          audioRef.current.src = data.audioUrl;
          audioRef.current.play().catch(() => {});
        }
      } catch (err) {
        console.error("Error generating TTS:", err);
      } finally {
        setLoadingAudio(false);
      }
    },
    [current, loadingAudio, speed],
  );

  function handleRepeat() {
    if (audioRef.current && audioUrl) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }

  function handleSpeedChange(newSpeed: number) {
    setSpeed(newSpeed);
    // Re-generate with new speed if audio already loaded
    if (audioUrl) {
      handleListenDictado(newSpeed);
    }
  }

  /* ─── Evaluate handler ─── */

  async function handleEvaluate() {
    if (!current || evaluating || !textoUsuario.trim()) return;
    setEvaluating(true);

    try {
      const res = await fetch("/api/dictado/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dictadoId: current.id,
          textoUsuario: textoUsuario.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.limit) {
          setAttempts(data.attemptsToday);
        }
        return;
      }

      setResult(data);
      setAttempts(data.attemptsToday);
      setSessionStats((s) => ({
        completed: s.completed + 1,
        totalXp: s.totalXp + data.xpGained,
      }));

      // Sounds + XP float
      const animsOn = getAnimationsEnabled();
      if (data.precision >= 60) {
        playCorrect();
      } else {
        playIncorrect();
      }

      if (data.xpGained > 0 && animsOn) {
        playXpGained();
        showXpFloat(data.xpGained);
      }

      // Badge modal
      if (data.newBadges?.length > 0) {
        for (const badge of data.newBadges) {
          showBadgeModal(badge);
        }
      }
    } catch (err) {
      console.error("Error evaluating dictado:", err);
    } finally {
      setEvaluating(false);
    }
  }

  /* ─── Next exercise ─── */

  function handleNext() {
    if (!hasMore) return;
    setCurrentIndex((i) => i + 1);
    setTextoUsuario("");
    setResult(null);
    setAudioUrl(null);
  }

  function handleRestart() {
    setCurrentIndex(0);
    setTextoUsuario("");
    setResult(null);
    setAudioUrl(null);
    setSessionStats({ completed: 0, totalXp: 0 });
  }

  /* ─── Precision color ─── */

  function precisionColor(p: number): string {
    if (p >= 95) return "text-green-700";
    if (p >= 80) return "text-green-600";
    if (p >= 60) return "text-yellow-600";
    if (p >= 40) return "text-orange-600";
    return "text-red-600";
  }

  function precisionBg(p: number): string {
    if (p >= 95) return "bg-green-50 border-green-200";
    if (p >= 80) return "bg-green-50/50 border-green-200";
    if (p >= 60) return "bg-yellow-50 border-yellow-200";
    if (p >= 40) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  }

  /* ─── Render ─── */

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <div className="rounded-[4px] border border-gz-rule p-8 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
        <p className="font-cormorant text-[20px] font-bold text-gz-ink mb-2">
          No hay dictados disponibles
        </p>
        <p className="font-archivo text-[13px] text-gz-ink-light">
          {selectedRama !== "ALL"
            ? "No hay dictados para esta rama. Prueba otra."
            : "Pronto se agregaran nuevos dictados."}
        </p>
        {selectedRama !== "ALL" && (
          <button
            onClick={() => setSelectedRama("ALL")}
            className="mt-4 font-archivo text-[12px] uppercase tracking-[1px] text-gz-gold hover:underline"
          >
            Ver todas las ramas
          </button>
        )}
      </div>
    );
  }

  // Limit reached screen
  if (isLimitReached && !result) {
    return (
      <div className="rounded-[4px] border border-gz-rule p-8 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gz-gold/10">
          <span className="text-2xl">&#x23F0;</span>
        </div>
        <p className="font-cormorant text-[22px] font-bold text-gz-ink mb-2">
          L&iacute;mite diario alcanzado
        </p>
        <p className="font-archivo text-[13px] text-gz-ink-light mb-1">
          Has completado {dailyLimit} dictados hoy.
        </p>
        <p className="font-archivo text-[13px] text-gz-ink-light mb-4">
          Vuelve ma&ntilde;ana para seguir practicando.
        </p>
        {sessionStats.completed > 0 && (
          <div className="mb-4 inline-flex items-center gap-4 rounded-[3px] border border-gz-rule px-4 py-2">
            <span className="font-ibm-mono text-[11px] text-gz-ink-light">
              Sesi&oacute;n: {sessionStats.completed} dictados
            </span>
            <span className="font-ibm-mono text-[11px] text-gz-gold font-semibold">
              +{sessionStats.totalXp} XP
            </span>
          </div>
        )}
        <br />
        <Link
          href="/dashboard"
          className="mt-4 inline-block rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Volver al Dashboard
        </Link>
      </div>
    );
  }

  // Completion screen (all done)
  if (!current && sessionStats.completed > 0) {
    return (
      <div className="rounded-[4px] border border-gz-rule p-8 text-center" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gz-gold/10">
          <span className="text-2xl">&#x2705;</span>
        </div>
        <p className="font-cormorant text-[22px] font-bold text-gz-ink mb-2">
          &iexcl;Sesi&oacute;n completada!
        </p>
        <div className="mb-4 inline-flex items-center gap-4 rounded-[3px] border border-gz-rule px-4 py-2">
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            {sessionStats.completed} dictados completados
          </span>
          <span className="font-ibm-mono text-[11px] text-gz-gold font-semibold">
            +{sessionStats.totalXp} XP
          </span>
        </div>
        <br />
        <button
          onClick={handleRestart}
          className="mt-4 rounded-[3px] bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Reiniciar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Hidden audio element */}
      <audio ref={audioRef} />

      {/* ─── Rama filter ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mr-1">
          Rama:
        </span>
        <button
          onClick={() => { setSelectedRama("ALL"); setCurrentIndex(0); setResult(null); setAudioUrl(null); setTextoUsuario(""); }}
          className={`rounded-[3px] px-3 py-1 font-archivo text-[11px] uppercase tracking-[1px] transition-colors ${
            selectedRama === "ALL"
              ? "bg-gz-navy text-white"
              : "border border-gz-rule text-gz-ink-light hover:border-gz-gold hover:text-gz-gold"
          }`}
        >
          Todas
        </button>
        {RAMAS.map((r) => (
          <button
            key={r}
            onClick={() => { setSelectedRama(r); setCurrentIndex(0); setResult(null); setAudioUrl(null); setTextoUsuario(""); }}
            className={`rounded-[3px] px-3 py-1 font-archivo text-[11px] uppercase tracking-[1px] transition-colors ${
              selectedRama === r
                ? "bg-gz-navy text-white"
                : "border border-gz-rule text-gz-ink-light hover:border-gz-gold hover:text-gz-gold"
            }`}
          >
            {r.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* ─── Progress bar ─── */}
      <div className="flex items-center justify-between">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          {currentIndex + 1} / {shuffledIndices.length}
        </span>
        <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          Hoy: {attempts} / {dailyLimit}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-gz-rule">
        <div
          className="h-1 rounded-full bg-gz-gold transition-all"
          style={{ width: `${((currentIndex + 1) / shuffledIndices.length) * 100}%` }}
        />
      </div>

      {current && (
        <>
          {/* ─── Exercise card ─── */}
          <div className="rounded-[4px] border border-gz-rule p-5" style={{ backgroundColor: "var(--gz-cream)" }}>
            {/* Title + metadata */}
            <div className="mb-4">
              <h2 className="font-cormorant text-[22px] font-bold text-gz-ink mb-1">
                {TITULO_LABELS[current.titulo] ?? current.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                  {current.rama.replace(/_/g, " ")}
                </span>
                {current.libro && (
                  <>
                    <span className="text-gz-rule">&middot;</span>
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                      {current.libro}
                    </span>
                  </>
                )}
                <span className="text-gz-rule">&middot;</span>
                <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                  Dif. {current.dificultad}
                </span>
              </div>
            </div>

            {/* ─── Audio controls ─── */}
            <div className="mb-5 rounded-[3px] border border-gz-rule p-4 bg-white/50">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <button
                  onClick={() => handleListenDictado()}
                  disabled={loadingAudio}
                  className="flex items-center gap-2 rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                >
                  {loadingAudio ? (
                    <>
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Generando...
                    </>
                  ) : (
                    <>
                      &#x1F50A; Escuchar dictado
                    </>
                  )}
                </button>

                {audioUrl && (
                  <button
                    onClick={handleRepeat}
                    className="rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink-light transition-colors hover:border-gz-gold hover:text-gz-gold"
                  >
                    &#x1F501; Repetir
                  </button>
                )}
              </div>

              {/* Speed selector */}
              <div className="flex items-center gap-2">
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                  Velocidad:
                </span>
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSpeedChange(s)}
                    className={`rounded-[3px] px-2.5 py-1 font-ibm-mono text-[11px] transition-colors ${
                      speed === s
                        ? "bg-gz-gold text-white"
                        : "border border-gz-rule text-gz-ink-light hover:border-gz-gold hover:text-gz-gold"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Result view ─── */}
            {result ? (
              <div className="space-y-4">
                {/* Precision */}
                <div className={`rounded-[3px] border p-4 text-center ${precisionBg(result.precision)}`}>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                    Precisi&oacute;n
                  </p>
                  <p className={`font-cormorant text-[42px] font-bold ${precisionColor(result.precision)}`}>
                    {result.precision}%
                  </p>
                  <p className="font-archivo text-[13px] text-gz-ink-light">
                    {result.palabrasCorrectas} / {result.palabrasTotales} palabras correctas
                  </p>
                  {result.xpGained > 0 && (
                    <p className="font-ibm-mono text-[12px] font-semibold text-gz-gold mt-1">
                      +{result.xpGained} XP
                    </p>
                  )}
                </div>

                {/* Word-by-word comparison */}
                <div>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
                    Comparaci&oacute;n palabra por palabra
                  </p>
                  <div className="rounded-[3px] border border-gz-rule p-4 bg-white/50">
                    <div className="flex flex-wrap gap-1">
                      {result.resultados.map((w, i) => (
                        <span
                          key={i}
                          className={`inline-block rounded px-1.5 py-0.5 font-ibm-mono text-[12px] ${
                            w.correcto
                              ? "bg-green-100 text-green-800"
                              : w.original === ""
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                          }`}
                          title={
                            w.correcto
                              ? "Correcto"
                              : w.original === ""
                                ? `Extra: "${w.usuario}"`
                                : `Esperado: "${w.original}" — Escribiste: "${w.usuario || "(vacio)"}"`
                          }
                        >
                          {w.correcto ? w.original : w.original === "" ? w.usuario : (
                            <>
                              <span className="line-through opacity-60">{w.usuario || "\u00A0"}</span>
                              {" "}
                              <span className="font-semibold">{w.original}</span>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  {hasMore && !isLimitReached ? (
                    <button
                      onClick={handleNext}
                      className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
                    >
                      Siguiente dictado &#x2192;
                    </button>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
                    >
                      Volver al Dashboard
                    </Link>
                  )}

                  <ReportButton contentType="DictadoJuridico" contentId={current.id} />
                </div>

                {/* Session stats */}
                {sessionStats.completed > 0 && (
                  <div className="flex items-center gap-4 pt-2 border-t border-gz-rule">
                    <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                      Sesi&oacute;n: {sessionStats.completed} dictados
                    </span>
                    <span className="font-ibm-mono text-[10px] font-semibold text-gz-gold">
                      +{sessionStats.totalXp} XP total
                    </span>
                  </div>
                )}
              </div>
            ) : (
              /* ─── Input view ─── */
              <div className="space-y-4">
                <div>
                  <label className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light block mb-2">
                    Escribe lo que escuchas
                  </label>
                  <textarea
                    value={textoUsuario}
                    onChange={(e) => setTextoUsuario(e.target.value)}
                    placeholder="Escucha el audio y escribe el texto juridico aqui..."
                    rows={8}
                    className="w-full resize-none rounded-[3px] border border-gz-rule px-4 py-3 font-ibm-mono text-[14px] text-gz-ink leading-relaxed placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                    disabled={!audioUrl}
                  />
                  {!audioUrl && (
                    <p className="font-archivo text-[11px] text-gz-ink-light/70 mt-1">
                      Primero escucha el dictado para poder escribir.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating || !textoUsuario.trim() || !audioUrl}
                    className="rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                  >
                    {evaluating ? "Evaluando..." : "Evaluar dictado"}
                  </button>

                  {textoUsuario && (
                    <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                      {textoUsuario.trim().split(/\s+/).length} palabras
                    </span>
                  )}
                </div>

                <ReportButton contentType="DictadoJuridico" contentId={current.id} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
