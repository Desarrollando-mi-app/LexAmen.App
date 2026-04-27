"use client";

import { useState, useEffect, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MATERIAS } from "@/app/dashboard/diario/types/obiter";
import { TRIBUNALES, ANALISIS_LIMITS, XP_FALLO_SEMANA_PARTICIPAR, type AnalisisFormato } from "@/lib/diario-config";
import { TagsInput } from "@/app/dashboard/diario/components/tags-input";

// ─── Helpers ────────────────────────────────────────────────

function charCountColor(current: number, max: number): string {
  if (max === 0) return "text-gz-ink-light"; // unlimited
  const ratio = current / max;
  if (ratio > 0.9) return "text-red-600";
  if (ratio > 0.7) return "text-orange-500";
  return "text-green-600";
}

function progressWidth(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, (current / max) * 100);
}

function progressColor(current: number, max: number): string {
  if (max === 0) return "bg-gz-ink-light/20";
  const ratio = current / max;
  if (ratio > 0.9) return "bg-red-500";
  if (ratio > 0.7) return "bg-orange-400";
  return "bg-green-500";
}

// ─── Component ──────────────────────────────────────────────

export default function NuevoAnalisisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const falloParam = searchParams.get("fallo");

  // Format selection state
  const [formato, setFormato] = useState<AnalisisFormato | null>(
    falloParam ? "mini" : null
  );

  // Form state
  const [titulo, setTitulo] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [rol, setRol] = useState("");
  const [fechaFallo, setFechaFallo] = useState("");
  const [partes, setPartes] = useState("");
  const [materia, setMateria] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [falloUrl, setFalloUrl] = useState("");
  const [hechos, setHechos] = useState("");
  const [ratio, setRatio] = useState("");
  const [opinion, setOpinion] = useState("");
  const [resumen, setResumen] = useState("");
  const [showInFeed, setShowInFeed] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  // Collaboration state
  const [colaborativo, setColaborativo] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [colegas, setColegas] = useState<any[]>([]);
  const [colegasLoading, setColegasLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [invitados, setInvitados] = useState<any[]>([]);
  const [invitandoId, setInvitandoId] = useState<string | null>(null);

  // Peer review state
  const [peerReviewMode, setPeerReviewMode] = useState(false);
  const [peerReviewAutoAssign, setPeerReviewAutoAssign] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [peerReviewColegas, setPeerReviewColegas] = useState<any[]>([]);
  const [peerReviewColegasLoading, setPeerReviewColegasLoading] = useState(false);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [peerReviewLoading, setPeerReviewLoading] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [falloLoading, setFalloLoading] = useState(false);
  const [falloDeLaSemanaId, setFalloDeLaSemanaId] = useState<string | null>(
    falloParam || null
  );

  // Fetch fallo data if URL has ?fallo= param
  useEffect(() => {
    if (!falloParam) return;
    let cancelled = false;
    setFalloLoading(true);

    async function loadFallo() {
      try {
        const res = await fetch(`/api/diario/fallo-semana?id=${falloParam}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled && data.fallo) {
          const f = data.fallo;
          if (f.tribunal) setTribunal(f.tribunal);
          if (f.rol) setRol(f.rol);
          if (f.titulo) setTitulo(`Analisis: ${f.titulo}`);
          setFalloDeLaSemanaId(f.id);
        }
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setFalloLoading(false);
      }
    }

    loadFallo();
    return () => {
      cancelled = true;
    };
  }, [falloParam]);

  // Get limits for selected formato
  const limits = formato ? ANALISIS_LIMITS[formato] : null;

  // ─── Validation ─────────────────────────────────────────

  function validate(): string[] {
    if (!formato || !limits) return ["Selecciona un formato."];
    const errs: string[] = [];
    if (!titulo.trim()) errs.push("El titulo es requerido.");
    if (!tribunal) errs.push("Selecciona un tribunal.");
    if (!rol.trim()) errs.push("El numero de rol es requerido.");
    if (!fechaFallo) errs.push("La fecha del fallo es requerida.");
    if (!partes.trim()) errs.push("Las partes son requeridas.");
    if (!materia) errs.push("Selecciona una materia.");
    if (!hechos.trim()) errs.push("La seccion de hechos es requerida.");
    if (limits.maxHechos > 0 && hechos.length > limits.maxHechos)
      errs.push(`Los hechos superan el limite de ${limits.maxHechos} caracteres.`);
    if (!ratio.trim()) errs.push("La ratio decidendi es requerida.");
    if (limits.maxRatio > 0 && ratio.length > limits.maxRatio)
      errs.push(`La ratio decidendi supera el limite de ${limits.maxRatio} caracteres.`);
    if (!opinion.trim()) errs.push("La opinion es requerida.");
    if (limits.maxOpinion > 0 && opinion.length > limits.maxOpinion)
      errs.push(`La opinion supera el limite de ${limits.maxOpinion} caracteres.`);
    if (!resumen.trim()) errs.push("El resumen es requerido.");
    if (limits.maxResumen > 0 && resumen.length > limits.maxResumen)
      errs.push(`El resumen supera el limite de ${limits.maxResumen} caracteres.`);
    return errs;
  }

  // ─── Submit ─────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setLoading(true);

    try {
      const body = {
        titulo: titulo.trim(),
        tribunal,
        numeroRol: rol.trim(),
        fechaFallo,
        partes: partes.trim(),
        materia,
        tags: selectedTags.join(","),
        falloUrl: falloUrl.trim() || undefined,
        hechos: hechos.trim(),
        ratioDecidendi: ratio.trim(),
        opinion: opinion.trim(),
        resumen: resumen.trim(),
        showInFeed,
        formato,
        falloDeLaSemanaId: falloDeLaSemanaId || undefined,
      };

      const res = await fetch("/api/diario/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `Error ${res.status}: No se pudo publicar.`
        );
      }

      router.push("/dashboard/diario?tab=analisis");
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "Error al publicar el analisis.",
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Submit with Peer Review ────────────────────────────

  async function handleSubmitWithPeerReview(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErrors([]);
    setLoading(true);

    try {
      // 1. First publish the analysis
      const body = {
        titulo: titulo.trim(),
        tribunal,
        numeroRol: rol.trim(),
        fechaFallo,
        partes: partes.trim(),
        materia,
        tags: selectedTags.join(","),
        falloUrl: falloUrl.trim() || undefined,
        hechos: hechos.trim(),
        ratioDecidendi: ratio.trim(),
        opinion: opinion.trim(),
        resumen: resumen.trim(),
        showInFeed,
        formato,
        falloDeLaSemanaId: falloDeLaSemanaId || undefined,
      };

      const res = await fetch("/api/diario/analisis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Error ${res.status}: No se pudo publicar.`);
      }

      const { analisis: published } = await res.json();

      // 2. Then request peer review
      setPeerReviewLoading(true);
      const prBody: { publicacionId: string; publicacionTipo: string; reviewerIds?: string[] } = {
        publicacionId: published.id,
        publicacionTipo: "analisis",
      };

      if (!peerReviewAutoAssign && selectedReviewers.length > 0) {
        prBody.reviewerIds = selectedReviewers;
      }

      const prRes = await fetch("/api/diario/peer-review/solicitar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(prBody),
      });

      if (!prRes.ok) {
        // Publication was created, but peer review failed — still redirect
        console.error("Peer review request failed");
      }

      router.push("/dashboard/diario?tab=analisis");
    } catch (err) {
      setErrors([err instanceof Error ? err.message : "Error al publicar."]);
    } finally {
      setLoading(false);
      setPeerReviewLoading(false);
    }
  }

  // ─── Load colegas for peer review ──────────────────────────

  function loadPeerReviewColegas() {
    if (peerReviewColegas.length > 0) return;
    setPeerReviewColegasLoading(true);
    fetch("/api/colegas", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setPeerReviewColegas(d.colegas ?? []))
      .catch(() => {})
      .finally(() => setPeerReviewColegasLoading(false));
  }

  // ─── Render helpers ─────────────────────────────────────

  function renderLabel(text: string) {
    return (
      <label className="block font-ibm-mono uppercase tracking-wider text-[11px] text-gz-ink-light mb-1.5">
        {text}
      </label>
    );
  }

  function renderCharCounter(current: number, max: number) {
    if (max === 0) {
      return (
        <span className="font-ibm-mono text-[11px] text-gz-ink-light">
          {current} caracteres
        </span>
      );
    }
    return (
      <span className={`font-ibm-mono text-[11px] ${charCountColor(current, max)}`}>
        {current}/{max} caracteres
      </span>
    );
  }

  function renderProgressBar(current: number, max: number) {
    if (max === 0) return null;
    return (
      <div className="mt-1.5 h-[3px] w-full rounded-full bg-gz-cream-dark">
        <div
          className={`h-full rounded-full transition-all ${progressColor(current, max)}`}
          style={{ width: `${progressWidth(current, max)}%` }}
        />
      </div>
    );
  }

  function renderHint(text: string) {
    return (
      <p className="text-gz-ink-light font-archivo text-[13px] italic mt-1.5">
        {text}
      </p>
    );
  }

  // ─── STEP 1: Format selector — premium editorial ─────────

  if (!formato) {
    return (
      <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-10 pt-7 pb-16">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <Link
              href="/dashboard/diario?tab=analisis"
              className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
            >
              <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
              Volver a los análisis
            </Link>
          </div>

          {/* ═══ Masthead editorial ═══════════════════════════════ */}
          <div className="gz-section-header relative mb-9">
            <div className="h-px bg-gz-ink/35 mb-3" />

            <div className="hidden sm:flex items-center justify-between font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-mid mb-3 gap-3">
              <span className="capitalize shrink-0">Sección II · Análisis de Sentencia · Nuevo</span>
              <span className="text-gz-burgundy shrink-0">— Estudio jurídico —</span>
            </div>

            <div className="flex flex-col items-center text-center gap-2">
              <div className="flex items-center justify-center gap-4">
                <Image
                  src="/brand/logo-sello.svg"
                  alt="Studio Iuris"
                  width={80}
                  height={80}
                  className="h-[56px] w-[56px] sm:h-[68px] sm:w-[68px] shrink-0"
                />
                <h1 className="font-cormorant text-[36px] sm:text-[52px] lg:text-[60px] font-bold text-gz-ink leading-[0.92] tracking-tight">
                  Nuevo <span className="text-gz-burgundy italic">Análisis</span>
                </h1>
              </div>
              <p className="font-cormorant italic text-[15px] sm:text-[17px] text-gz-ink-mid max-w-[640px]">
                Elige el formato. Un mini-análisis se publica rápido; uno completo se sostiene como pieza doctrinal.
              </p>
            </div>

            <div className="mt-5 h-[3px] bg-gz-ink/85" />
            <div className="h-px bg-gz-ink/85 mt-[2px]" />
            <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
          </div>

          {/* ═══ Format cards — paper-stack ═══════════════════════ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mini */}
            <FormatCard
              accent="gold"
              kicker="✦ Mini-análisis"
              xp={ANALISIS_LIMITS.mini.xp}
              titulo={ANALISIS_LIMITS.mini.label}
              descripcion={ANALISIS_LIMITS.mini.descripcion}
              specs={[
                ["Hechos", `máx. ${ANALISIS_LIMITS.mini.maxHechos} caracteres`],
                ["Ratio decidendi", `máx. ${ANALISIS_LIMITS.mini.maxRatio} car.`],
                ["Opinión", `máx. ${ANALISIS_LIMITS.mini.maxOpinion} car.`],
                ["Tiempo estimado", ANALISIS_LIMITS.mini.tiempoEstimado],
              ]}
              onClick={() => setFormato("mini")}
            />

            {/* Completo */}
            <FormatCard
              accent="burgundy"
              kicker="⚖ Análisis completo"
              xp={ANALISIS_LIMITS.completo.xp}
              titulo={ANALISIS_LIMITS.completo.label}
              descripcion={ANALISIS_LIMITS.completo.descripcion}
              specs={[
                ["Hechos", `máx. ${ANALISIS_LIMITS.completo.maxHechos} car.`],
                ["Ratio decidendi", `máx. ${ANALISIS_LIMITS.completo.maxRatio} car.`],
                ["Opinión", "sin límite"],
                ["Tiempo estimado", ANALISIS_LIMITS.completo.tiempoEstimado],
              ]}
              onClick={() => setFormato("completo")}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP 2: Structured Editor ────────────────────────────

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/dashboard/diario?tab=analisis"
            className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
          >
            <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
            Volver a los análisis
          </Link>
          <button
            type="button"
            onClick={() => setFormato(null)}
            className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] font-semibold text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer border-b border-gz-ink-light/40 hover:border-gz-burgundy pb-0.5"
          >
            Cambiar formato
          </button>
        </div>

        {/* ═══ Hero editorial compacto ════════════════════════════ */}
        <header className="gz-section-header relative mb-7">
          <div className="h-px bg-gz-ink/35 mb-3" />

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={44}
              height={44}
              className="h-9 w-9 shrink-0"
            />
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy font-semibold flex items-center gap-1.5">
              <span aria-hidden>⚖</span>
              Análisis de Sentencia · Nuevo
            </p>
            <span
              className={`rounded-full px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] ${
                formato === "mini"
                  ? "bg-gz-gold/15 text-gz-gold"
                  : "bg-gz-burgundy/15 text-gz-burgundy"
              }`}
            >
              {limits!.label}
            </span>
          </div>

          <h1 className="font-cormorant text-[30px] sm:text-[40px] !font-bold leading-[1.05] tracking-tight text-gz-ink mb-2">
            Redacta tu <span className="text-gz-burgundy italic">análisis</span>
          </h1>
          <p className="font-cormorant italic text-[15px] sm:text-[16px] text-gz-ink-mid">
            Identifica el fallo, ordena los hechos, fija la ratio decidendi y comparte tu opinión jurídica.
          </p>

          {/* Triple regla */}
          <div className="mt-4 h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
        </header>

        {/* Fallo de la Semana banner */}
        {falloDeLaSemanaId && (
          <div className="mb-6 rounded-[4px] border border-gz-gold bg-gz-gold/[0.05] p-4">
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-gold font-semibold">
              Fallo de la Semana
            </p>
            <p className="font-archivo text-[13px] text-gz-ink mt-1">
              Este analisis participa en el Fallo de la Semana (+{XP_FALLO_SEMANA_PARTICIPAR} XP extra)
            </p>
          </div>
        )}

        {/* Loading fallo data */}
        {falloLoading && (
          <div className="mb-6 h-[60px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mb-6 border border-red-300 bg-red-50 rounded-[4px] p-4">
            <p className="font-ibm-mono uppercase tracking-wider text-[11px] text-red-700 mb-2">
              Errores
            </p>
            <ul className="list-disc pl-5 space-y-1 font-archivo text-sm text-red-700">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="mb-6">
            {renderLabel("Titulo del analisis")}
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Nulidad de contrato por error esencial"
              className="w-full font-cormorant text-[22px] leading-tight bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
            />
          </div>

          {/* ═══ SECTION 1: IDENTIFICACION ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink mb-2">
              I. Identificacion del Fallo
            </h2>
            {renderHint("Datos basicos de la sentencia que vas a analizar.")}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5">
              {/* Tribunal */}
              <div>
                {renderLabel("Tribunal")}
                <select
                  value={tribunal}
                  onChange={(e) => setTribunal(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {TRIBUNALES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rol */}
              <div>
                {renderLabel("Numero de Rol")}
                <input
                  type="text"
                  value={rol}
                  onChange={(e) => setRol(e.target.value)}
                  placeholder="1234-2026"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

              {/* Fecha */}
              <div>
                {renderLabel("Fecha del fallo")}
                <input
                  type="date"
                  value={fechaFallo}
                  onChange={(e) => setFechaFallo(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

              {/* Partes */}
              <div>
                {renderLabel("Partes")}
                <input
                  type="text"
                  value={partes}
                  onChange={(e) => setPartes(e.target.value)}
                  placeholder="Perez con Gonzalez"
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
                />
              </div>

              {/* Materia */}
              <div>
                {renderLabel("Materia")}
                <select
                  value={materia}
                  onChange={(e) => setMateria(e.target.value)}
                  className="w-full font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink focus:outline-none focus:border-gz-gold transition-colors"
                >
                  <option value="">Seleccionar...</option>
                  {MATERIAS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ═══ SECTION 2: HECHOS ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                II. Hechos
              </h2>
              {renderCharCounter(hechos.length, limits!.maxHechos)}
            </div>
            {renderHint("Resume los hechos relevantes del caso de forma clara y cronologica.")}
            {renderProgressBar(hechos.length, limits!.maxHechos)}
            <textarea
              value={hechos}
              onChange={(e) => {
                const max = limits!.maxHechos as number;
                if (max === 0 || e.target.value.length <= max) {
                  setHechos(e.target.value);
                }
              }}
              maxLength={(limits!.maxHechos as number) || undefined}
              rows={formato === "mini" ? 6 : 8}
              placeholder="Describe los hechos relevantes del caso..."
              className="w-full mt-3 font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ SECTION 3: RATIO DECIDENDI ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                III. Ratio Decidendi
              </h2>
              {renderCharCounter(ratio.length, limits!.maxRatio)}
            </div>
            {renderHint("Identifica la razon de la decision del tribunal: el principio juridico central.")}
            {renderProgressBar(ratio.length, limits!.maxRatio)}
            <textarea
              value={ratio}
              onChange={(e) => {
                const max = limits!.maxRatio as number;
                if (max === 0 || e.target.value.length <= max) {
                  setRatio(e.target.value);
                }
              }}
              maxLength={(limits!.maxRatio as number) || undefined}
              rows={formato === "mini" ? 6 : 10}
              placeholder="Identifica la razon de la decision del tribunal..."
              className="w-full mt-3 font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ SECTION 4: OPINION DEL AUTOR ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                IV. Tu Opinion
              </h2>
              {renderCharCounter(opinion.length, limits!.maxOpinion)}
            </div>
            {renderHint("Tu comentario critico sobre el fallo. Argumenta tu posicion.")}
            {renderProgressBar(opinion.length, limits!.maxOpinion)}
            <textarea
              value={opinion}
              onChange={(e) => {
                const max = limits!.maxOpinion as number;
                if (max === 0 || e.target.value.length <= max) {
                  setOpinion(e.target.value);
                }
              }}
              maxLength={(limits!.maxOpinion as number) || undefined}
              rows={formato === "mini" ? 6 : 10}
              placeholder="Tu opinion o comentario critico sobre el fallo..."
              className="w-full mt-3 font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ RESUMEN PARA EL FEED ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="font-ibm-mono uppercase tracking-wider text-[12px] text-gz-ink">
                Resumen para el Feed
              </h2>
              {renderCharCounter(resumen.length, limits!.maxResumen)}
            </div>
            {renderHint("Breve resumen que aparecera en el feed. Captura la esencia del analisis.")}
            {renderProgressBar(resumen.length, limits!.maxResumen)}
            <textarea
              value={resumen}
              onChange={(e) => {
                const max = limits!.maxResumen as number;
                if (max === 0 || e.target.value.length <= max) {
                  setResumen(e.target.value);
                }
              }}
              maxLength={(limits!.maxResumen as number) || undefined}
              rows={4}
              placeholder="Breve resumen que aparecera en el feed..."
              className="w-full mt-3 font-cormorant text-[16px] leading-relaxed bg-white border border-gz-rule rounded-[4px] px-4 py-3 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors resize-y"
            />
          </div>

          {/* ═══ TAGS — free-form ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            {renderLabel("Tags")}
            {renderHint("Escribe tus propios #tags. Espacio, enter o coma para confirmar cada uno.")}
            <div className="mt-3">
              <TagsInput
                value={selectedTags.join(",")}
                onChange={(csv) => {
                  setSelectedTags(csv ? csv.split(",").filter(Boolean) : []);
                }}
                placeholder="ej: nulidad, contrato, error_esencial..."
                accent="burgundy"
                max={8}
              />
            </div>
          </div>

          {/* ═══ COLABORACION ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={colaborativo}
                onChange={(e) => {
                  setColaborativo(e.target.checked);
                  if (e.target.checked && colegas.length === 0) {
                    setColegasLoading(true);
                    fetch("/api/colegas", { credentials: "include" })
                      .then((r) => r.json())
                      .then((d) => setColegas(d.colegas ?? []))
                      .catch(() => {})
                      .finally(() => setColegasLoading(false));
                  }
                }}
                className="accent-gz-navy w-4 h-4"
              />
              <span className="font-archivo text-sm text-gz-ink">
                Analisis colaborativo
              </span>
            </label>
            {renderHint("Invita hasta 2 colegas para co-autorar este analisis.")}

            {colaborativo && (
              <div className="mt-4 space-y-3">
                {/* Invited co-autores */}
                {invitados.length > 0 && (
                  <div className="space-y-2">
                    {invitados.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-[4px] border border-gz-rule bg-white px-4 py-2.5"
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                          {(inv.firstName?.[0] ?? "")}{(inv.lastName?.[0] ?? "")}
                        </div>
                        <span className="font-archivo text-[13px] text-gz-ink flex-1">
                          {inv.firstName} {inv.lastName}
                        </span>
                        <span className={`font-ibm-mono text-[10px] uppercase tracking-[1px] ${
                          inv.estado === "aceptada" ? "text-green-600" : "text-gz-ink-light"
                        }`}>
                          {inv.estado}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Colega list */}
                {invitados.length < 2 && (
                  <>
                    {colegasLoading ? (
                      <div className="h-[60px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
                    ) : colegas.length === 0 ? (
                      <p className="font-archivo text-[13px] text-gz-ink-light italic">
                        No tienes colegas aun. Agrega colegas para colaborar.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                          Tus colegas
                        </p>
                        {colegas
                          .filter((c: { id: string }) => !invitados.some((inv) => inv.id === c.id))
                          .map((colega: { id: string; firstName: string; lastName: string; avatarUrl?: string }) => (
                          <div
                            key={colega.id}
                            className="flex items-center gap-3 rounded-[4px] border border-gz-rule bg-white px-4 py-2.5"
                          >
                            {colega.avatarUrl ? (
                              <img src={colega.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                                {colega.firstName[0]}{colega.lastName[0]}
                              </div>
                            )}
                            <span className="font-archivo text-[13px] text-gz-ink flex-1">
                              {colega.firstName} {colega.lastName}
                            </span>
                            <button
                              type="button"
                              disabled={invitandoId === colega.id}
                              onClick={async () => {
                                // Note: invitation requires a saved publication ID
                                // For now, mark as "pending save" — actual invitation happens after the first save
                                setInvitandoId(colega.id);
                                setInvitados((prev) => [
                                  ...prev,
                                  { id: colega.id, firstName: colega.firstName, lastName: colega.lastName, estado: "por invitar" },
                                ]);
                                setInvitandoId(null);
                              }}
                              className="rounded-[3px] bg-gz-navy px-3 py-1 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
                            >
                              {invitandoId === colega.id ? "..." : "Invitar"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {invitados.length >= 2 && (
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                    Maximo 2 co-autores alcanzado.
                  </p>
                )}

                <p className="font-archivo text-[11px] text-gz-ink-light italic">
                  Todos los co-autores podran editar el borrador.
                </p>
              </div>
            )}
          </div>

          {/* ═══ FALLO URL ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            {renderLabel("Link al fallo original (opcional)")}
            {renderHint("URL al fallo en el Poder Judicial u otra fuente.")}
            <input
              type="url"
              value={falloUrl}
              onChange={(e) => setFalloUrl(e.target.value)}
              placeholder="https://www.pjud.cl/..."
              className="w-full mt-3 font-archivo text-sm bg-white border border-gz-rule rounded-[4px] px-3 py-2.5 text-gz-ink placeholder:text-gz-ink-light/50 focus:outline-none focus:border-gz-gold transition-colors"
            />
          </div>

          {/* ═══ PREVIEW TOGGLE ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="font-archivo text-[13px] font-semibold text-gz-gold hover:underline"
            >
              {showPreview ? "Ocultar vista previa" : "Vista previa"}
            </button>

            {showPreview && (
              <div className="mt-4 rounded-[4px] border border-gz-rule bg-white p-6">
                <span
                  className={`inline-block rounded-full px-3 py-0.5 font-ibm-mono text-[10px] font-semibold uppercase tracking-[1px] mb-3 ${
                    formato === "mini"
                      ? "bg-gz-gold/15 text-gz-gold"
                      : "bg-gz-navy/15 text-gz-navy"
                  }`}
                >
                  {limits!.label}
                </span>
                <h3 className="font-cormorant text-[24px] font-bold text-gz-ink mb-4">
                  {titulo || "Sin titulo"}
                </h3>
                <div className="mb-4 rounded-[4px] bg-gz-cream-dark/30 p-4 font-ibm-mono text-[11px] text-gz-ink-mid space-y-1">
                  <p>Tribunal: {tribunal || "—"}</p>
                  <p>Rol: {rol || "—"}</p>
                  <p>Fecha: {fechaFallo || "—"}</p>
                  <p>Partes: {partes || "—"}</p>
                  <p>Materia: {materia || "—"}</p>
                </div>
                {resumen && (
                  <div className="mb-4 border-l-[3px] border-gz-gold pl-4">
                    <p className="font-cormorant text-[16px] italic text-gz-ink-mid">
                      {resumen}
                    </p>
                  </div>
                )}
                {hechos && (
                  <div className="mb-4">
                    <h4 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy mb-2">
                      I. Hechos
                    </h4>
                    <p className="font-cormorant text-[15px] leading-[1.7] text-gz-ink whitespace-pre-wrap">
                      {hechos}
                    </p>
                  </div>
                )}
                {ratio && (
                  <div className="mb-4">
                    <h4 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy mb-2">
                      II. Ratio Decidendi
                    </h4>
                    <p className="font-cormorant text-[15px] leading-[1.7] text-gz-ink whitespace-pre-wrap">
                      {ratio}
                    </p>
                  </div>
                )}
                {opinion && (
                  <div className="mb-4">
                    <h4 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy mb-2">
                      III. Opinion del Autor
                    </h4>
                    <p className="font-cormorant text-[15px] leading-[1.7] text-gz-ink whitespace-pre-wrap">
                      {opinion}
                    </p>
                  </div>
                )}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm bg-gz-gold/[0.08] px-3 py-1 font-ibm-mono text-[10px] font-medium text-gz-gold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══ OPTIONS & SUBMIT ═══ */}
          <div className="border-t-2 border-gz-rule mt-8 pt-8">
            {/* Show in feed checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={showInFeed}
                onChange={(e) => setShowInFeed(e.target.checked)}
                className="accent-gz-navy w-4 h-4"
              />
              <span className="font-archivo text-sm text-gz-ink">
                Mostrar preview en el feed de Obiter Dictum
              </span>
            </label>

            {/* XP info */}
            <p className="font-ibm-mono text-[11px] text-gz-ink-light mb-6">
              +{limits!.xp} XP por publicar
              {falloDeLaSemanaId ? ` + ${XP_FALLO_SEMANA_PARTICIPAR} XP Fallo de la Semana` : ""}
            </p>

            {/* Peer Review toggle */}
            {!peerReviewMode ? (
              <>
                {/* Two-button layout */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-2.5 font-archivo text-sm border border-gz-rule text-gz-ink-light rounded-[4px] hover:border-gz-gold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 font-archivo text-sm bg-gz-navy text-white rounded-[4px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Publicando..." : "Publicar directamente \u2192"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeerReviewMode(true);
                      loadPeerReviewColegas();
                    }}
                    className="px-6 py-2.5 font-archivo text-sm border-2 border-gz-gold text-gz-gold rounded-[4px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
                  >
                    Solicitar peer review primero
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Peer Review Options */}
                <div className="rounded-[4px] border-2 border-gz-gold bg-gz-gold/[0.03] p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-ibm-mono text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold">
                      Peer Review
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setPeerReviewMode(false);
                        setSelectedReviewers([]);
                      }}
                      className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-ink underline"
                    >
                      Cancelar peer review
                    </button>
                  </div>

                  <p className="font-archivo text-[13px] text-gz-ink-mid mb-4">
                    Tu publicacion sera revisada por pares antes de aparecer con el sello de calidad.
                    Requisitos del revisor: grado 8+ y 2+ publicaciones.
                  </p>

                  {/* Auto-assign vs Manual */}
                  <div className="space-y-3 mb-4">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={peerReviewAutoAssign}
                        onChange={() => setPeerReviewAutoAssign(true)}
                        className="accent-gz-gold w-4 h-4"
                      />
                      <div>
                        <span className="font-archivo text-sm text-gz-ink font-medium">
                          Asignacion automatica
                        </span>
                        <p className="font-archivo text-[12px] text-gz-ink-light">
                          Se asignaran 2 revisores automaticamente (preferencia por misma materia)
                        </p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="radio"
                        checked={!peerReviewAutoAssign}
                        onChange={() => setPeerReviewAutoAssign(false)}
                        className="accent-gz-gold w-4 h-4"
                      />
                      <div>
                        <span className="font-archivo text-sm text-gz-ink font-medium">
                          Elegir revisores manualmente
                        </span>
                        <p className="font-archivo text-[12px] text-gz-ink-light">
                          Selecciona de tus colegas quienes revisaran tu publicacion
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Manual reviewer selection */}
                  {!peerReviewAutoAssign && (
                    <div className="mt-4">
                      {peerReviewColegasLoading ? (
                        <div className="h-[60px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
                      ) : peerReviewColegas.length === 0 ? (
                        <p className="font-archivo text-[13px] text-gz-ink-light italic">
                          No tienes colegas aun. Usa la asignacion automatica.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                            Seleccionar revisores
                          </p>
                          {peerReviewColegas.map(
                            (colega: {
                              id: string;
                              firstName: string;
                              lastName: string;
                              avatarUrl?: string;
                            }) => {
                              const isSelected = selectedReviewers.includes(colega.id);
                              return (
                                <button
                                  key={colega.id}
                                  type="button"
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedReviewers((prev) =>
                                        prev.filter((id) => id !== colega.id)
                                      );
                                    } else if (selectedReviewers.length < 3) {
                                      setSelectedReviewers((prev) => [
                                        ...prev,
                                        colega.id,
                                      ]);
                                    }
                                  }}
                                  className={`flex w-full items-center gap-3 rounded-[4px] border px-4 py-2.5 text-left transition-colors ${
                                    isSelected
                                      ? "border-gz-gold bg-gz-gold/[0.08]"
                                      : "border-gz-rule bg-white hover:border-gz-gold/40"
                                  }`}
                                >
                                  {colega.avatarUrl ? (
                                    <img
                                      src={colega.avatarUrl}
                                      alt=""
                                      className="h-7 w-7 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                                      {colega.firstName[0]}
                                      {colega.lastName[0]}
                                    </div>
                                  )}
                                  <span className="font-archivo text-[13px] text-gz-ink flex-1">
                                    {colega.firstName} {colega.lastName}
                                  </span>
                                  {isSelected && (
                                    <span className="font-ibm-mono text-[10px] text-gz-gold font-semibold">
                                      Seleccionado
                                    </span>
                                  )}
                                </button>
                              );
                            }
                          )}
                          {selectedReviewers.length > 0 && (
                            <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-1">
                              {selectedReviewers.length} revisor(es) seleccionado(s)
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-5 py-2.5 font-archivo text-sm border border-gz-rule text-gz-ink-light rounded-[4px] hover:border-gz-gold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitWithPeerReview}
                    disabled={loading || peerReviewLoading || (!peerReviewAutoAssign && selectedReviewers.length === 0)}
                    className="px-6 py-2.5 font-archivo text-sm bg-gz-gold text-gz-navy font-semibold rounded-[4px] hover:bg-gz-navy hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading || peerReviewLoading
                      ? "Publicando y solicitando review..."
                      : "Publicar y solicitar peer review \u2192"}
                  </button>
                </div>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── FormatCard — selector premium ────────────────────────

function FormatCard({
  accent,
  kicker,
  xp,
  titulo,
  descripcion,
  specs,
  onClick,
}: {
  accent: "gold" | "burgundy";
  kicker: string;
  xp: number;
  titulo: string;
  descripcion: string;
  specs: [string, string][];
  onClick: () => void;
}) {
  const isGold = accent === "gold";
  const railColor = isGold ? "bg-gz-gold" : "bg-gz-burgundy";
  const accentText = isGold ? "text-gz-gold" : "text-gz-burgundy";
  const dotColor = isGold ? "bg-gz-gold" : "bg-gz-burgundy";
  const hoverBorder = isGold ? "hover:border-gz-gold" : "hover:border-gz-burgundy";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative text-left cursor-pointer"
    >
      {/* paper-stack shadow */}
      <span className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-gz-rule/40 bg-white/40 pointer-events-none" aria-hidden />
      <span className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[3px] border border-gz-rule/60 bg-white/60 pointer-events-none" aria-hidden />

      <div className={`relative rounded-[3px] border border-gz-rule bg-white overflow-hidden transition-colors ${hoverBorder}`}>
        <div className={`h-[3px] ${railColor}`} />
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
            <span className={`font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold ${accentText}`}>
              {kicker}
            </span>
            <span className="ml-auto font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
              +{xp} XP
            </span>
          </div>

          <h3 className="font-cormorant text-[26px] !font-bold text-gz-ink leading-tight mb-2">
            {titulo}
          </h3>
          <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-snug mb-4">
            {descripcion}
          </p>

          <dl className="space-y-1.5 border-t border-gz-rule/60 pt-3">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 text-[12px]">
                <dt className="font-ibm-mono uppercase tracking-[1px] text-gz-ink-light text-[10px]">{label}</dt>
                <dd className="font-archivo text-gz-ink font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          <div className={`mt-5 inline-flex items-center gap-1 font-archivo text-[12px] font-semibold ${accentText} border-b ${isGold ? "border-gz-gold/40" : "border-gz-burgundy/40"} pb-0.5 transition-all group-hover:gap-2`}>
            Elegir este formato →
          </div>
        </div>
      </div>
    </button>
  );
}
