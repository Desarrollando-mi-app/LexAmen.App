"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────

interface PlanTema {
  id: string;
  rama: string;
  libro: string | null;
  titulo: string;
  parrafo: string | null;
  nombre: string;
  prioridad: number;
  estimacionHoras: number;
  completado: boolean;
  porcentaje: number;
}

interface PlanSesion {
  id: string;
  fecha: string;
  actividades: { temaId?: string; temaNombre: string; actividad: string; duracionMin: number }[];
  completada: boolean;
  xpGanado: number;
}

interface SerializedPlan {
  id: string;
  fechaExamen: string;
  horasEstudioDia: number;
  diasDescanso: string[];
  modoGeneracion: string;
  estado: string;
  pdf1Nombre: string | null;
  pdf2Nombre: string | null;
  pdf3Nombre: string | null;
  hasPdf1: boolean;
  hasPdf2: boolean;
  hasPdf3: boolean;
  temas: PlanTema[];
  sesiones: PlanSesion[];
}

interface SerializedConfig {
  id: string;
  universidad: string;
  sede: string | null;
  fechaExamen: string | null;
  parseStatus: string;
  temas: {
    id: string;
    nombre: string;
    materiaMapping: string | null;
    libroMapping: string | null;
    tituloMapping: string | null;
    tieneContenido: boolean;
    porcentajeAvance: number;
  }[];
}

interface ProgresoPageClientProps {
  plan: SerializedPlan | null;
  oldConfig: SerializedConfig | null;
  initialUniversidad: string | null;
  initialSede: string | null;
  initialFechaExamen: string | null;
}

// ─── Constants ──────────────────────────────────────────────

const RAMA_LABELS: Record<string, string> = {
  DERECHO_CIVIL: "Derecho Civil",
  DERECHO_PROCESAL_CIVIL: "D. Procesal Civil",
  DERECHO_ORGANICO: "D. Orgánico",
};

const RAMA_COLORS: Record<string, string> = {
  DERECHO_CIVIL: "var(--gz-navy)",
  DERECHO_PROCESAL_CIVIL: "var(--gz-burgundy)",
  DERECHO_ORGANICO: "var(--gz-sage)",
};

const DIAS_SEMANA = [
  { key: "lunes", label: "Lu" },
  { key: "martes", label: "Ma" },
  { key: "miércoles", label: "Mi" },
  { key: "jueves", label: "Ju" },
  { key: "viernes", label: "Vi" },
  { key: "sábado", label: "Sá" },
  { key: "domingo", label: "Do" },
];

const ACTIVIDAD_ICONS: Record<string, string> = {
  flashcards: "\uD83C\uDCCF",
  mcq: "\u2705",
  vf: "\u2696\uFE0F",
};

// ─── Component ──────────────────────────────────────────────

export function ProgresoPageClient({
  plan,
  oldConfig,
  initialFechaExamen,
}: ProgresoPageClientProps) {
  const router = useRouter();
  const [showSetup, setShowSetup] = useState(false);

  const isActive = plan?.estado === "activo" || plan?.estado === "completado";

  if (showSetup || !plan || plan.estado === "configurando") {
    return (
      <SetupView
        plan={plan}
        oldConfig={oldConfig}
        initialFechaExamen={initialFechaExamen}
        onDone={() => {
          setShowSetup(false);
          router.refresh();
        }}
      />
    );
  }

  if (plan.estado === "generando") {
    return <GeneratingView onRefresh={() => router.refresh()} />;
  }

  if (isActive) {
    return (
      <DashboardView
        plan={plan}
        onReconfigure={() => setShowSetup(true)}
      />
    );
  }

  return (
    <SetupView
      plan={plan}
      oldConfig={oldConfig}
      initialFechaExamen={initialFechaExamen}
      onDone={() => {
        setShowSetup(false);
        router.refresh();
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// SETUP VIEW — 3-step wizard
// ═══════════════════════════════════════════════════════════════

function SetupView({
  plan,
  oldConfig,
  initialFechaExamen,
  onDone,
}: {
  plan: SerializedPlan | null;
  oldConfig: SerializedConfig | null;
  initialFechaExamen: string | null;
  onDone: () => void;
}) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — config
  const [fechaExamen, setFechaExamen] = useState(
    plan?.fechaExamen?.split("T")[0] ?? initialFechaExamen?.split("T")[0] ?? ""
  );
  const [horasEstudioDia, setHorasEstudioDia] = useState(plan?.horasEstudioDia ?? 3);
  const [diasDescanso, setDiasDescanso] = useState<string[]>(plan?.diasDescanso ?? ["domingo"]);

  // Step 2 — PDFs
  const [pdfSlots, setPdfSlots] = useState<{ nombre: string | null; uploading: boolean }[]>([
    { nombre: plan?.pdf1Nombre ?? null, uploading: false },
    { nombre: plan?.pdf2Nombre ?? null, uploading: false },
    { nombre: plan?.pdf3Nombre ?? null, uploading: false },
  ]);

  // Step 3 — parse + generate
  const [parseStatus, setParseStatus] = useState<"idle" | "parsing" | "parsed" | "generating" | "done" | "error">("idle");
  const [parsedTemas, setParsedTemas] = useState<PlanTema[]>(plan?.temas ?? []);
  const [totalHoras, setTotalHoras] = useState(0);

  const hasPdfs = pdfSlots.some((s) => s.nombre !== null);

  // ─── Step 1: Save config ──────────────────────────────────
  const saveConfig = async () => {
    if (!fechaExamen) {
      setError("Selecciona la fecha de examen");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan-estudio/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fechaExamen, horasEstudioDia, diasDescanso }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar");
      }
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  // ─── Step 2: Upload PDF ───────────────────────────────────
  const uploadPdf = async (file: File, slotIndex: number) => {
    const slots = [...pdfSlots];
    slots[slotIndex] = { nombre: null, uploading: true };
    setPdfSlots(slots);
    setError(null);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slot", String(slotIndex + 1));

      const res = await fetch("/api/plan-estudio/upload-pdf", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Error al subir PDF");

      const updated = [...pdfSlots];
      updated[slotIndex] = { nombre: data.nombre, uploading: false };
      setPdfSlots(updated);
    } catch (e) {
      const updated = [...pdfSlots];
      updated[slotIndex] = { nombre: null, uploading: false };
      setPdfSlots(updated);
      setError(e instanceof Error ? e.message : "Error al subir PDF");
    }
  };

  // ─── Step 3: Parse + Generate ─────────────────────────────
  const parseAndGenerate = async () => {
    setParseStatus("parsing");
    setError(null);
    try {
      // Parse
      const parseRes = await fetch("/api/plan-estudio/parse", { method: "POST" });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || "Error al parsear");

      setParsedTemas(parseData.temas);
      setTotalHoras(parseData.totalHorasEstimadas);
      setParseStatus("parsed");

      // Small delay to show parsed state
      await new Promise((r) => setTimeout(r, 800));

      // Generate
      setParseStatus("generating");
      const genRes = await fetch("/api/plan-estudio/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modo: "automatico" }),
      });
      const genData = await genRes.json();
      if (!genRes.ok) throw new Error(genData.error || "Error al generar");

      setParseStatus("done");
      setTimeout(() => onDone(), 1200);
    } catch (e) {
      setParseStatus("error");
      setError(e instanceof Error ? e.message : "Error al procesar");
    }
  };

  return (
    <div className="px-4 lg:px-0 py-8 sm:py-12">
      {/* Header */}
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
        Plan de Estudios &middot; Configuraci&oacute;n
      </p>
      <div className="flex items-center gap-3 mb-1">
        <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-tight">
          Mi Plan de Estudios
        </h1>
      </div>
      <div className="border-b-2 border-gz-rule-dark mt-3 mb-6" />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-ibm-mono text-[12px] font-medium transition-colors ${
                s <= step
                  ? "bg-gz-gold text-white"
                  : "border-2 border-gz-rule text-gz-ink-light"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div className={`w-12 h-[2px] ${s < step ? "bg-gz-gold" : "bg-gz-rule"}`} />
            )}
          </div>
        ))}
        <span className="ml-3 font-archivo text-[12px] text-gz-ink-mid">
          {step === 1 && "Configuración"}
          {step === 2 && "Cedularios"}
          {step === 3 && "Generar plan"}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 border border-red-300 bg-red-50 text-red-700 font-archivo text-[13px] rounded-sm"
          style={{ backgroundColor: "rgba(200,50,50,0.05)" }}>
          {error}
        </div>
      )}

      {/* Migration offer from old config */}
      {step === 1 && oldConfig && !plan && (
        <div className="mb-6 p-4 border-l-4 border-gz-gold" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
          <p className="font-archivo text-[13px] text-gz-ink font-medium mb-1">
            Tienes una configuraci&oacute;n anterior de &ldquo;Mi Examen&rdquo;
          </p>
          <p className="font-archivo text-[12px] text-gz-ink-mid">
            Facultad: {oldConfig.universidad}{oldConfig.sede ? ` \u2014 ${oldConfig.sede}` : ""}
            {oldConfig.temas.length > 0 && ` \u00B7 ${oldConfig.temas.length} temas`}
          </p>
          {oldConfig.fechaExamen && !fechaExamen && (
            <button
              onClick={() => setFechaExamen(oldConfig.fechaExamen!.split("T")[0])}
              className="mt-2 font-archivo text-[11px] text-gz-gold hover:underline"
            >
              Usar fecha de examen anterior \u2192
            </button>
          )}
        </div>
      )}

      {/* ─── STEP 1: Config ──────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <label className="block font-archivo text-[13px] text-gz-ink font-medium mb-2">
              Fecha de Examen de Grado
            </label>
            <input
              type="date"
              value={fechaExamen}
              onChange={(e) => setFechaExamen(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full border-2 border-gz-rule p-3 font-archivo text-[14px] text-gz-ink focus:border-gz-gold outline-none rounded-sm"
              style={{ backgroundColor: "var(--gz-cream)" }}
            />
          </div>

          <div>
            <label className="block font-archivo text-[13px] text-gz-ink font-medium mb-2">
              Horas de estudio por d&iacute;a: <span className="text-gz-gold">{horasEstudioDia}h</span>
            </label>
            <input
              type="range"
              min={1}
              max={8}
              value={horasEstudioDia}
              onChange={(e) => setHorasEstudioDia(parseInt(e.target.value))}
              className="w-full accent-[var(--gz-gold)]"
            />
            <div className="flex justify-between font-ibm-mono text-[10px] text-gz-ink-light mt-1">
              <span>1h</span>
              <span>8h</span>
            </div>
          </div>

          <div>
            <label className="block font-archivo text-[13px] text-gz-ink font-medium mb-2">
              D&iacute;as de descanso
            </label>
            <div className="flex gap-2 flex-wrap">
              {DIAS_SEMANA.map((d) => {
                const selected = diasDescanso.includes(d.key);
                return (
                  <button
                    key={d.key}
                    onClick={() =>
                      setDiasDescanso(
                        selected
                          ? diasDescanso.filter((x) => x !== d.key)
                          : [...diasDescanso, d.key]
                      )
                    }
                    className={`w-10 h-10 rounded-full font-archivo text-[12px] font-medium transition-colors border-2 ${
                      selected
                        ? "bg-gz-gold border-gz-gold text-white"
                        : "border-gz-rule text-gz-ink-mid hover:border-gz-gold"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={loading || !fechaExamen}
            className="w-full py-3 font-archivo text-[14px] font-semibold text-white rounded-sm transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--gz-navy)" }}
          >
            {loading ? "Guardando..." : "Continuar \u2192"}
          </button>
        </div>
      )}

      {/* ─── STEP 2: Upload PDFs ─────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <p className="font-cormorant italic text-[17px] text-gz-ink-mid">
            Sube hasta 3 cedularios en PDF. El sistema los analizar&aacute; con IA para extraer los temas de estudio.
          </p>

          {pdfSlots.map((slot, idx) => (
            <PdfSlot
              key={idx}
              index={idx}
              nombre={slot.nombre}
              uploading={slot.uploading}
              onUpload={(file) => uploadPdf(file, idx)}
              onRemove={() => {
                const updated = [...pdfSlots];
                updated[idx] = { nombre: null, uploading: false };
                setPdfSlots(updated);
              }}
            />
          ))}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 font-archivo text-[13px] text-gz-ink-mid border-2 border-gz-rule hover:border-gz-gold rounded-sm transition-colors"
            >
              \u2190 Atr&aacute;s
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!hasPdfs}
              className="flex-1 py-3 font-archivo text-[14px] font-semibold text-white rounded-sm transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "var(--gz-navy)" }}
            >
              Continuar \u2192
            </button>
          </div>

          {!hasPdfs && (
            <p className="font-archivo text-[12px] text-gz-ink-light text-center">
              Sube al menos un PDF para continuar
            </p>
          )}
        </div>
      )}

      {/* ─── STEP 3: Parse + Generate ────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          {parseStatus === "idle" && (
            <>
              <p className="font-cormorant italic text-[17px] text-gz-ink-mid">
                Listo para analizar tus cedularios y generar un plan de estudio personalizado.
              </p>
              <div className="p-4 border border-gz-rule rounded-sm" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
                <p className="font-archivo text-[13px] text-gz-ink font-medium mb-2">Resumen</p>
                <ul className="space-y-1 font-archivo text-[12px] text-gz-ink-mid">
                  <li>Fecha de examen: <strong className="text-gz-ink">{new Date(fechaExamen + "T12:00:00").toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}</strong></li>
                  <li>Horas/d&iacute;a: <strong className="text-gz-ink">{horasEstudioDia}h</strong></li>
                  <li>PDFs subidos: <strong className="text-gz-ink">{pdfSlots.filter(s => s.nombre).length}</strong></li>
                  <li>Descanso: <strong className="text-gz-ink">{diasDescanso.length > 0 ? diasDescanso.join(", ") : "ninguno"}</strong></li>
                </ul>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 font-archivo text-[13px] text-gz-ink-mid border-2 border-gz-rule hover:border-gz-gold rounded-sm"
                >
                  \u2190 Atr&aacute;s
                </button>
                <button
                  onClick={parseAndGenerate}
                  className="flex-1 py-3 font-archivo text-[14px] font-semibold text-white rounded-sm"
                  style={{ backgroundColor: "var(--gz-gold)" }}
                >
                  Analizar y Generar Plan
                </button>
              </div>
            </>
          )}

          {(parseStatus === "parsing" || parseStatus === "generating") && (
            <div className="text-center py-10">
              <div className="inline-block animate-spin w-10 h-10 border-[3px] border-gz-gold border-t-transparent rounded-full mb-4" />
              <p className="font-cormorant text-[22px] font-bold text-gz-ink mb-2">
                {parseStatus === "parsing" ? "Analizando cedularios..." : "Generando plan de estudio..."}
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid">
                {parseStatus === "parsing"
                  ? "La IA est\u00E1 extrayendo los temas de tus PDFs"
                  : "Distribuyendo temas en sesiones diarias"}
              </p>
            </div>
          )}

          {parseStatus === "parsed" && (
            <div className="text-center py-6">
              <p className="font-cormorant text-[22px] font-bold text-gz-ink mb-2">
                {parsedTemas.length} temas identificados
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid">
                ~{totalHoras} horas estimadas de estudio
              </p>
            </div>
          )}

          {parseStatus === "done" && (
            <div className="text-center py-10">
              <div className="text-[48px] mb-3">{"\u2713"}</div>
              <p className="font-cormorant text-[26px] font-bold text-gz-ink mb-2">
                Plan generado
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-mid">
                Redirigiendo al dashboard...
              </p>
            </div>
          )}

          {parseStatus === "error" && (
            <div className="text-center py-6">
              <button
                onClick={parseAndGenerate}
                className="px-8 py-3 font-archivo text-[14px] font-semibold text-white rounded-sm"
                style={{ backgroundColor: "var(--gz-gold)" }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PDF Slot ───────────────────────────────────────────────

function PdfSlot({
  index,
  nombre,
  uploading,
  onUpload,
  onRemove,
}: {
  index: number;
  nombre: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") onUpload(file);
    },
    [onUpload]
  );

  if (nombre) {
    return (
      <div className="flex items-center gap-3 p-4 border-2 border-gz-rule rounded-sm" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
        <div className="w-8 h-8 rounded-full bg-gz-gold flex items-center justify-center text-white font-ibm-mono text-[12px]">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-archivo text-[13px] text-gz-ink font-medium truncate">{nombre}</p>
          <p className="font-ibm-mono text-[10px] text-gz-ink-light">PDF subido</p>
        </div>
        <button
          onClick={onRemove}
          className="font-archivo text-[11px] text-red-500 hover:underline"
        >
          Eliminar
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gz-rule hover:border-gz-gold cursor-pointer rounded-sm transition-colors"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
        }}
        className="hidden"
      />
      {uploading ? (
        <>
          <div className="animate-spin w-6 h-6 border-2 border-gz-gold border-t-transparent rounded-full" />
          <p className="font-archivo text-[12px] text-gz-ink-mid">Subiendo...</p>
        </>
      ) : (
        <>
          <div className="w-8 h-8 rounded-full border-2 border-gz-rule flex items-center justify-center text-gz-ink-light font-ibm-mono text-[12px]">
            {index + 1}
          </div>
          <p className="font-archivo text-[13px] text-gz-ink-mid">
            Arrastra un PDF o haz clic
          </p>
          <p className="font-ibm-mono text-[10px] text-gz-ink-light">Cedulario {index + 1} (opcional)</p>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// GENERATING VIEW
// ═══════════════════════════════════════════════════════════════

function GeneratingView({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="px-4 lg:px-0 py-16 text-center">
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
        Plan de Estudios &middot; Generando
      </p>
      <div className="flex items-center justify-center gap-3 mb-1">
        <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-tight">
          Generando tu plan
        </h1>
      </div>
      <div className="border-b-2 border-gz-rule-dark mt-4 mb-8 mx-auto max-w-xs" />
      <div className="inline-block animate-spin w-8 h-8 border-2 border-gz-gold border-t-transparent rounded-full mb-4" />
      <p className="font-cormorant italic text-[17px] text-gz-ink-mid">
        Esto puede tomar unos segundos...
      </p>
      <button
        onClick={onRefresh}
        className="mt-6 font-archivo text-[12px] text-gz-gold hover:underline"
      >
        Actualizar estado
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD VIEW — Active plan
// ═══════════════════════════════════════════════════════════════

function DashboardView({
  plan,
  onReconfigure,
}: {
  plan: SerializedPlan;
  onReconfigure: () => void;
}) {
  const router = useRouter();
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  // ─── Computed ─────────────────────────────────────────────
  const fechaExamen = new Date(plan.fechaExamen);
  const ahora = new Date();
  const diasRestantes = Math.max(0, Math.ceil((fechaExamen.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24)));

  const temasTotal = plan.temas.length;
  const temasCompletados = plan.temas.filter((t) => t.completado).length;
  const porcentajeGeneral =
    temasTotal > 0
      ? Math.round(
          (plan.temas.reduce((s, t) => s + t.porcentaje, 0) / temasTotal) * 100
        ) / 100
      : 0;

  const sesionesCompletadas = plan.sesiones.filter((s) => s.completada).length;
  const sesionesPendientes = plan.sesiones.filter((s) => !s.completada).length;

  // Group temas by rama
  const ramaGroups = new Map<string, PlanTema[]>();
  for (const tema of plan.temas) {
    if (!ramaGroups.has(tema.rama)) ramaGroups.set(tema.rama, []);
    ramaGroups.get(tema.rama)!.push(tema);
  }

  // Today's session
  const todayStr = ahora.toISOString().split("T")[0];
  const todaySesion = plan.sesiones.find((s) => s.fecha.split("T")[0] === todayStr);

  // Próximas sesiones (next 5 not completed)
  const proximasSesiones = plan.sesiones
    .filter((s) => !s.completada && s.fecha.split("T")[0] >= todayStr)
    .slice(0, 5);

  // ─── Recalcular ───────────────────────────────────────────
  const recalcular = async () => {
    setRecalculating(true);
    try {
      const res = await fetch("/api/plan-estudio/recalcular", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al recalcular");
        return;
      }
      setShowRecalcModal(false);
      router.refresh();
    } catch {
      alert("Error de conexi\u00F3n");
    } finally {
      setRecalculating(false);
    }
  };

  // ─── Mark session complete ────────────────────────────────
  const completarSesion = async (fecha: string) => {
    const fechaKey = fecha.split("T")[0];
    try {
      const res = await fetch(`/api/plan-estudio/sesiones/${fechaKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completada: true }),
      });
      if (res.ok) router.refresh();
    } catch {
      // silent
    }
  };

  return (
    <div className="px-4 lg:px-0 py-8 sm:py-12">
      {/* Header */}
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
        Plan de Estudios &middot; Dashboard
      </p>
      <div className="flex items-center gap-3 mb-1">
        <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-tight">
          Plan de Estudios
        </h1>
      </div>
      <div className="border-b-2 border-gz-rule-dark mt-3 mb-8" />

      {/* ─── Overview stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="D\u00edas restantes" value={String(diasRestantes)} sub={fechaExamen.toLocaleDateString("es-CL", { day: "numeric", month: "short" })} />
        <StatCard label="Progreso general" value={`${Math.round(porcentajeGeneral)}%`} sub={`${temasCompletados}/${temasTotal} temas`} />
        <StatCard label="Sesiones completadas" value={String(sesionesCompletadas)} sub={`${sesionesPendientes} pendientes`} />
        <StatCard label="Horas/d\u00eda" value={`${plan.horasEstudioDia}h`} sub={`${plan.diasDescanso.length > 0 ? plan.diasDescanso.length + " d\u00edas descanso" : "sin descanso"}`} />
      </div>

      {/* ─── Progress bar ────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="font-archivo text-[12px] text-gz-ink-mid font-medium">Progreso general</span>
          <span className="font-ibm-mono text-[12px] text-gz-gold font-medium">{Math.round(porcentajeGeneral)}%</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, porcentajeGeneral)}%`, backgroundColor: "var(--gz-gold)" }}
          />
        </div>
      </div>

      {/* ─── Today's session ─────────────────────────────────── */}
      {todaySesion && (
        <div className="mb-8 p-6 border-2 border-gz-gold rounded-sm" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">Sesi&oacute;n de hoy</p>
              <p className="font-cormorant text-[24px] font-bold text-gz-ink">
                {todaySesion.completada ? "Completada" : "Pendiente"}
              </p>
            </div>
            {!todaySesion.completada && (
              <button
                onClick={() => completarSesion(todaySesion.fecha)}
                className="px-5 py-2 font-archivo text-[13px] font-semibold text-white rounded-sm"
                style={{ backgroundColor: "var(--gz-gold)" }}
              >
                Marcar completada
              </button>
            )}
          </div>
          <div className="space-y-2">
            {todaySesion.actividades.map((act, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[16px]">{ACTIVIDAD_ICONS[act.actividad] || "\uD83D\uDCDD"}</span>
                <span className="font-archivo text-[13px] text-gz-ink flex-1">{act.temaNombre}</span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-light">{act.actividad}</span>
                <span className="font-ibm-mono text-[11px] text-gz-ink-mid">{act.duracionMin} min</span>
              </div>
            ))}
          </div>
          {!todaySesion.completada && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {Array.from(new Set(todaySesion.actividades.map(a => a.actividad))).map((tipo) => {
                const href = tipo === "flashcards" ? "/dashboard/flashcards" : tipo === "mcq" ? "/dashboard/mcq" : "/dashboard/truefalse";
                return (
                  <Link
                    key={tipo}
                    href={href}
                    className="px-4 py-2 font-archivo text-[12px] font-medium border-2 border-gz-rule hover:border-gz-gold rounded-sm transition-colors text-gz-ink"
                  >
                    Comenzar {tipo} \u2192
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Progress by rama ────────────────────────────────── */}
      <div className="mb-8">
        <h2 className="font-cormorant text-[24px] font-bold text-gz-ink mb-4">Progreso por materia</h2>
        <div className="space-y-6">
          {Array.from(ramaGroups.entries()).map(([rama, temas]) => {
            const avg = Math.round(temas.reduce((s, t) => s + t.porcentaje, 0) / temas.length);
            return (
              <div key={rama}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-archivo text-[14px] text-gz-ink font-medium">
                    {RAMA_LABELS[rama] || rama}
                  </span>
                  <span className="font-ibm-mono text-[12px] font-medium" style={{ color: RAMA_COLORS[rama] || "var(--gz-ink-mid)" }}>
                    {avg}%
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-3" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, avg)}%`, backgroundColor: RAMA_COLORS[rama] || "var(--gz-ink-mid)" }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {temas.map((tema) => (
                    <div
                      key={tema.id}
                      className="flex items-center gap-2 p-2 rounded-sm"
                      style={{ backgroundColor: tema.completado ? "rgba(58,90,53,0.05)" : "transparent" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: tema.completado
                            ? "var(--gz-sage)"
                            : tema.porcentaje > 50
                            ? "var(--gz-gold)"
                            : "var(--gz-rule)",
                        }}
                      />
                      <span className="font-archivo text-[12px] text-gz-ink flex-1 truncate">{tema.nombre}</span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">{Math.round(tema.porcentaje)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Próximas sesiones ───────────────────────────────── */}
      {proximasSesiones.length > 0 && (
        <div className="mb-8">
          <h2 className="font-cormorant text-[24px] font-bold text-gz-ink mb-4">Pr&oacute;ximas sesiones</h2>
          <div className="space-y-3">
            {proximasSesiones.map((sesion) => {
              const fecha = new Date(sesion.fecha);
              const isToday = sesion.fecha.split("T")[0] === todayStr;
              return (
                <div
                  key={sesion.id}
                  className={`flex items-center gap-4 p-4 border rounded-sm ${isToday ? "border-gz-gold" : "border-gz-rule"}`}
                  style={{ backgroundColor: isToday ? "var(--gz-cream-dark)" : "transparent" }}
                >
                  <div className="text-center min-w-[48px]">
                    <p className="font-ibm-mono text-[10px] uppercase text-gz-ink-light">
                      {fecha.toLocaleDateString("es-CL", { weekday: "short" })}
                    </p>
                    <p className="font-cormorant text-[22px] font-bold text-gz-ink leading-tight">
                      {fecha.getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex gap-2 flex-wrap">
                      {sesion.actividades.slice(0, 3).map((act, i) => (
                        <span key={i} className="font-archivo text-[11px] text-gz-ink-mid">
                          {ACTIVIDAD_ICONS[act.actividad] || "\uD83D\uDCDD"} {act.temaNombre.length > 25 ? act.temaNombre.slice(0, 25) + "..." : act.temaNombre}
                        </span>
                      ))}
                      {sesion.actividades.length > 3 && (
                        <span className="font-archivo text-[11px] text-gz-ink-light">+{sesion.actividades.length - 3}</span>
                      )}
                    </div>
                  </div>
                  {isToday && (
                    <span className="font-ibm-mono text-[10px] text-gz-gold font-medium">HOY</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Actions ─────────────────────────────────────────── */}
      <div className="border-t-2 border-gz-rule pt-6 flex flex-wrap gap-3">
        <button
          onClick={() => setShowRecalcModal(true)}
          className="px-5 py-2 font-archivo text-[12px] font-medium text-gz-ink border-2 border-gz-rule hover:border-gz-gold rounded-sm transition-colors"
        >
          Recalcular plan
        </button>
        <button
          onClick={onReconfigure}
          className="px-5 py-2 font-archivo text-[12px] font-medium text-gz-ink-mid border-2 border-gz-rule hover:border-gz-rule-dark rounded-sm transition-colors"
        >
          Reconfigurar
        </button>
        <Link
          href="/dashboard/calendario"
          className="px-5 py-2 font-archivo text-[12px] font-medium text-gz-gold border-2 border-gz-gold rounded-sm hover:bg-gz-gold hover:text-white transition-colors"
        >
          Ver calendario \u2192
        </Link>
      </div>

      {/* ─── Recalculate modal ───────────────────────────────── */}
      {showRecalcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md mx-4 p-6 rounded-sm" style={{ backgroundColor: "var(--gz-cream)" }}>
            <h3 className="font-cormorant text-[24px] font-bold text-gz-ink mb-3">
              Recalcular plan
            </h3>
            <p className="font-archivo text-[13px] text-gz-ink-mid mb-4">
              Se preservar&aacute;n las sesiones pasadas completadas y se redistribuir&aacute;n los temas pendientes en los d&iacute;as restantes antes del examen. Los eventos de calendario futuros ser&aacute;n reemplazados.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRecalcModal(false)}
                className="flex-1 py-2 font-archivo text-[13px] text-gz-ink-mid border-2 border-gz-rule rounded-sm"
              >
                Cancelar
              </button>
              <button
                onClick={recalcular}
                disabled={recalculating}
                className="flex-1 py-2 font-archivo text-[13px] font-semibold text-white rounded-sm disabled:opacity-50"
                style={{ backgroundColor: "var(--gz-gold)" }}
              >
                {recalculating ? "Recalculando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="p-4 border border-gz-rule rounded-sm" style={{ backgroundColor: "var(--gz-cream-dark)" }}>
      <p className="font-archivo text-[11px] text-gz-ink-light mb-1">{label}</p>
      <p className="font-cormorant text-[32px] font-bold text-gz-ink leading-none">{value}</p>
      <p className="font-ibm-mono text-[10px] text-gz-ink-mid mt-1">{sub}</p>
    </div>
  );
}
