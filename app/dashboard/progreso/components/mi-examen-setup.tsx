"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UNIVERSIDADES_CHILE } from "@/lib/universidades-chile";

// ─── Types ─────────────────────────────────────────────────

interface ParsedTema {
  nombre: string;
  tieneContenido: boolean;
  flashcardsDisponibles: number;
  mcqDisponibles: number;
  vfDisponibles: number;
}

interface MiExamenSetupProps {
  initialUniversidad?: string | null;
  initialSede?: string | null;
  initialFechaExamen?: string | null;
}

// ─── Component ─────────────────────────────────────────────

export function MiExamenSetup({
  initialUniversidad,
  initialSede,
  initialFechaExamen,
}: MiExamenSetupProps) {
  const router = useRouter();

  // Steps: 1 = universidad, 2 = cedulario, 3 = análisis
  const [step, setStep] = useState(1);

  // Step 1 state
  const [universidad, setUniversidad] = useState(initialUniversidad ?? "");
  const [otraUniversidad, setOtraUniversidad] = useState("");
  const [sede, setSede] = useState(initialSede ?? "");
  const [fechaExamen, setFechaExamen] = useState(initialFechaExamen ?? "");

  // Step 2 state
  const [cedularioMode, setCedularioMode] = useState<"pdf" | "text" | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [cedularioTexto, setCedularioTexto] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedTemas, setParsedTemas] = useState<ParsedTema[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);

  // ─── Step 1: Save config ────────────────────────────────

  async function handleStep1Submit() {
    const uni = universidad === "otra" ? otraUniversidad.trim() : universidad;
    if (!uni) {
      toast.error("Selecciona tu universidad");
      return;
    }

    try {
      const res = await fetch("/api/mi-examen/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          universidad: uni,
          sede: sede || null,
          fechaExamen: fechaExamen || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar configuración");
        return;
      }

      setConfigId(data.config.id);
      setStep(2);
    } catch {
      toast.error("Error de conexión");
    }
  }

  // ─── Step 2: Upload cedulario ───────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setCedularioMode("pdf");
    } else {
      toast.error("Solo se aceptan archivos PDF");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      setCedularioMode("pdf");
    } else if (file) {
      toast.error("Solo se aceptan archivos PDF");
    }
  }, []);

  async function handleStep2Submit() {
    setParsing(true);
    setParseError(null);
    setStep(3);

    try {
      // If PDF mode: upload first
      if (cedularioMode === "pdf" && pdfFile) {
        const formData = new FormData();
        formData.append("file", pdfFile);

        const uploadRes = await fetch("/api/mi-examen/upload-cedulario", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error ?? "Error al subir PDF");
        }

        const uploadData = await uploadRes.json();
        setConfigId(uploadData.config.id);
      }

      // If text mode: save text with config
      if (cedularioMode === "text" && cedularioTexto.trim()) {
        const uni = universidad === "otra" ? otraUniversidad.trim() : universidad;
        const res = await fetch("/api/mi-examen/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            universidad: uni,
            sede: sede || null,
            fechaExamen: fechaExamen || null,
            cedularioTexto: cedularioTexto.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Error al guardar texto");
        }

        const data = await res.json();
        setConfigId(data.config.id);
      }

      // Now parse
      const parseRes = await fetch("/api/mi-examen/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ configId }),
      });

      const parseData = await parseRes.json();

      if (!parseRes.ok) {
        throw new Error(parseData.error ?? "Error al analizar el cedulario");
      }

      setParsedTemas(
        parseData.config.temas.map(
          (t: {
            nombre: string;
            tieneContenido: boolean;
            flashcardsDisponibles: number;
            mcqDisponibles: number;
            vfDisponibles: number;
          }) => ({
            nombre: t.nombre,
            tieneContenido: t.tieneContenido,
            flashcardsDisponibles: t.flashcardsDisponibles,
            mcqDisponibles: t.mcqDisponibles,
            vfDisponibles: t.vfDisponibles,
          })
        )
      );
      setParsing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setParseError(msg);
      setParsing(false);
    }
  }

  function handleConfirmPlan() {
    router.refresh();
  }

  // ─── Step indicator ─────────────────────────────────────

  const canProceedStep2 =
    (cedularioMode === "pdf" && pdfFile) ||
    (cedularioMode === "text" && cedularioTexto.trim().length >= 20);

  const temasConContenido = parsedTemas.filter((t) => t.tieneContenido).length;
  const temasSinContenido = parsedTemas.length - temasConContenido;

  return (
    <div className="mx-auto max-w-2xl px-4 lg:px-0 py-8">
      {/* ─── Kicker ──────────────────────────────────────── */}
      <div className="text-center mb-8">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
          Mi Examen &middot; Configuraci&oacute;n
        </p>
        <h1 className="font-cormorant text-[28px] sm:text-[34px] !font-bold text-gz-ink leading-tight mt-2">
          Configura tu examen de grado
        </h1>
        <div className="border-b-2 border-gz-rule-dark mt-4 mb-6 mx-auto max-w-xs" />
      </div>

      {/* ─── Step indicator ──────────────────────────────── */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-ibm-mono text-[12px] font-semibold transition-colors ${
                s < step
                  ? "bg-gz-gold text-white"
                  : s === step
                    ? "border-2 border-gz-gold text-gz-gold"
                    : "border border-gz-rule text-gz-ink-light"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && <div className="w-12 h-px bg-gz-rule" />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Universidad y fecha ─────────────────── */}
      {step === 1 && (
        <div className="rounded-[4px] border border-gz-rule bg-white p-6 space-y-5">
          {/* Universidad */}
          <div>
            <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-1.5">
              &iquest;En qu&eacute; universidad estudias?
            </label>
            <select
              value={universidad}
              onChange={(e) => setUniversidad(e.target.value)}
              className="w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none transition-colors"
            >
              <option value="">Selecciona tu universidad</option>
              {UNIVERSIDADES_CHILE.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>

            {universidad === "otra" && (
              <input
                type="text"
                value={otraUniversidad}
                onChange={(e) => setOtraUniversidad(e.target.value)}
                placeholder="Nombre de tu universidad"
                className="mt-2 w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
              />
            )}
          </div>

          {/* Sede */}
          <div>
            <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-1.5">
              Sede <span className="font-normal text-gz-ink-light">(opcional)</span>
            </label>
            <input
              type="text"
              value={sede}
              onChange={(e) => setSede(e.target.value)}
              placeholder="Santiago, Concepción, Valparaíso..."
              className="w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
            />
          </div>

          {/* Fecha examen */}
          <div>
            <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-1.5">
              &iquest;Cu&aacute;ndo rindes el examen?{" "}
              <span className="font-normal text-gz-ink-light">(aproximado)</span>
            </label>
            <input
              type="date"
              value={fechaExamen}
              onChange={(e) => setFechaExamen(e.target.value)}
              className="w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
            />
          </div>

          {/* CTA */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleStep1Submit}
              disabled={!universidad || (universidad === "otra" && !otraUniversidad.trim())}
              className="rounded-[3px] bg-gz-gold px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Cedulario ───────────────────────────── */}
      {step === 2 && (
        <div className="rounded-[4px] border border-gz-rule bg-white p-6 space-y-5">
          <div>
            <p className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed">
              El cedulario es el documento con los temas que pueden ser preguntados
              en tu examen de grado. Puedes subir un PDF o pegar el texto directamente.
            </p>
          </div>

          {/* Opción A: PDF */}
          <div>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
              Opci&oacute;n A
            </p>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[4px] p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-gz-gold bg-gz-gold/[0.08]"
                  : pdfFile
                    ? "border-gz-sage bg-gz-sage/[0.04]"
                    : "border-gz-rule hover:border-gz-gold hover:bg-gz-gold/[0.04]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />

              {pdfFile ? (
                <div>
                  <p className="text-[24px] mb-1">✓</p>
                  <p className="font-archivo text-[14px] font-semibold text-gz-sage">
                    {pdfFile.name}
                  </p>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-1">
                    {(pdfFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPdfFile(null);
                      setCedularioMode(null);
                    }}
                    className="font-archivo text-[12px] text-gz-burgundy mt-2 hover:underline"
                  >
                    Cambiar archivo
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[32px] text-gz-ink-light mb-2">📄</p>
                  <p className="font-archivo text-[14px] text-gz-ink-mid">
                    Arrastra tu PDF aqu&iacute; o haz click para seleccionar
                  </p>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-1">
                    PDF, m&aacute;ximo 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Separador */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gz-rule" />
            <span className="font-ibm-mono text-[10px] text-gz-ink-light uppercase">
              o
            </span>
            <div className="flex-1 h-px bg-gz-rule" />
          </div>

          {/* Opción B: Texto */}
          <div>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
              Opci&oacute;n B
            </p>
            <p className="font-archivo text-[13px] text-gz-ink-mid mb-2">
              📋 Pega el texto de tu cedulario
            </p>
            <textarea
              value={cedularioTexto}
              onChange={(e) => {
                setCedularioTexto(e.target.value);
                if (e.target.value.trim().length > 0) {
                  setCedularioMode("text");
                  setPdfFile(null);
                }
              }}
              placeholder="Copia el contenido del cedulario desde el PDF o web de tu facultad..."
              className="w-full border border-gz-rule rounded-[4px] p-4 font-archivo text-[14px] text-gz-ink min-h-[200px] resize-y focus:border-gz-gold focus:ring-1 focus:ring-gz-gold/20 focus:outline-none"
            />
            {cedularioTexto.trim().length > 0 && cedularioTexto.trim().length < 20 && (
              <p className="font-ibm-mono text-[10px] text-gz-burgundy mt-1">
                El texto es muy corto. Pega el cedulario completo.
              </p>
            )}
          </div>

          {/* CTAs */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep(1)}
              className="rounded-[3px] border border-gz-rule px-5 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-mid transition-colors hover:bg-gz-cream-dark"
            >
              &larr; Atr&aacute;s
            </button>
            <button
              onClick={handleStep2Submit}
              disabled={!canProceedStep2}
              className="rounded-[3px] bg-gz-gold px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Analizar &rarr;
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Análisis ────────────────────────────── */}
      {step === 3 && (
        <div className="rounded-[4px] border border-gz-rule bg-white p-6">
          {/* Parsing... */}
          {parsing && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin w-8 h-8 border-2 border-gz-gold border-t-transparent rounded-full mb-4" />
              <p className="font-cormorant italic text-[17px] text-gz-ink-mid">
                Analizando tu cedulario...
              </p>
              <p className="font-archivo text-[13px] text-gz-ink-light mt-2">
                Estamos identificando los temas de tu examen y
                mape&aacute;ndolos al contenido de Studio <span className="text-gz-red">Iuris</span>.
              </p>
            </div>
          )}

          {/* Error */}
          {!parsing && parseError && (
            <div className="text-center py-8">
              <p className="text-[32px] mb-2">❌</p>
              <p className="font-cormorant text-[18px] font-bold text-gz-ink mb-2">
                No pudimos analizar el cedulario
              </p>
              <p className="font-archivo text-[13px] text-gz-burgundy mb-6 max-w-md mx-auto">
                {parseError}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setStep(2);
                    setCedularioMode("text");
                    setPdfFile(null);
                    setParseError(null);
                  }}
                  className="rounded-[3px] border border-gz-rule px-5 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-mid transition-colors hover:bg-gz-cream-dark"
                >
                  Intentar con texto
                </button>
                <button
                  onClick={handleStep2Submit}
                  className="rounded-[3px] bg-gz-gold px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {!parsing && !parseError && parsedTemas.length > 0 && (
            <div>
              <div className="text-center mb-6">
                <p className="text-[24px] mb-1">✅</p>
                <p className="font-cormorant text-[20px] font-bold text-gz-ink">
                  Cedulario analizado &middot; {parsedTemas.length} temas identificados
                </p>
                <p className="font-archivo text-[13px] text-gz-ink-mid mt-1">
                  {temasConContenido} temas con contenido disponible
                  {temasSinContenido > 0 && (
                    <span className="text-gz-ink-light">
                      {" "}
                      &middot; {temasSinContenido} sin contenido a&uacute;n
                    </span>
                  )}
                </p>
              </div>

              {/* Temas list preview */}
              <div className="max-h-[300px] overflow-y-auto border border-gz-rule rounded-[4px] divide-y divide-gz-cream-dark mb-6">
                {parsedTemas.map((tema, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                      {tema.nombre}
                    </span>
                    {tema.tieneContenido ? (
                      <span className="font-ibm-mono text-[9px] bg-gz-sage/[0.1] text-gz-sage px-2 py-0.5 rounded-full whitespace-nowrap">
                        {tema.flashcardsDisponibles + tema.mcqDisponibles + tema.vfDisponibles} items
                      </span>
                    ) : (
                      <span className="font-ibm-mono text-[9px] bg-gz-cream-dark text-gz-ink-light px-2 py-0.5 rounded-full whitespace-nowrap">
                        Sin contenido
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-center">
                <button
                  onClick={handleConfirmPlan}
                  className="rounded-[3px] bg-gz-gold px-8 py-3 font-archivo text-[14px] font-semibold text-white transition-colors hover:bg-gz-gold/90"
                >
                  Confirmar y generar mi plan &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
