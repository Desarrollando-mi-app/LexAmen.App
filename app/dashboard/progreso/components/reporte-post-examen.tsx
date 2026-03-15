"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

// ─── Types ─────────────────────────────────────────────────

interface TemaOption {
  id: string;
  nombre: string;
}

interface ReportePostExamenProps {
  temas: TemaOption[];
  onClose: () => void;
  onSubmitted: () => void;
}

// ─── Component ─────────────────────────────────────────────

export function ReportePostExamen({
  temas,
  onClose,
  onSubmitted,
}: ReportePostExamenProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const [fechaExamen, setFechaExamen] = useState("");
  const [aprobado, setAprobado] = useState<boolean | null | undefined>(undefined);
  const [selectedMaterias, setSelectedMaterias] = useState<string[]>([]);
  const [customMateria, setCustomMateria] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [dificultad, setDificultad] = useState<number | null>(null);
  const [comentario, setComentario] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleMateria(nombre: string) {
    setSelectedMaterias((prev) =>
      prev.includes(nombre) ? prev.filter((m) => m !== nombre) : [...prev, nombre]
    );
  }

  function addCustomMateria() {
    const trimmed = customMateria.trim();
    if (trimmed && !selectedMaterias.includes(trimmed)) {
      setSelectedMaterias((prev) => [...prev, trimmed]);
      setCustomMateria("");
      setShowCustomInput(false);
    }
  }

  async function handleSubmit() {
    if (!fechaExamen) {
      toast.error("Indica cuándo rendiste el examen");
      return;
    }
    if (selectedMaterias.length === 0) {
      toast.error("Selecciona al menos una materia");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/mi-examen/reporte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fechaExamen,
          aprobado: aprobado === undefined ? null : aprobado,
          materiasPreguntadas: selectedMaterias,
          dificultadPercibida: dificultad,
          comentario: comentario || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Error al enviar reporte");
        return;
      }

      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
      }, 2000);
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-[4px] border border-gz-rule shadow-xl max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <h3 className="font-cormorant text-[20px] font-bold text-gz-ink">
            Reporte Post-Examen
          </h3>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors text-[18px] leading-none"
          >
            &times;
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-12 px-6">
            <p className="text-[32px] mb-2">✅</p>
            <p className="font-cormorant text-[20px] font-bold text-gz-ink">
              &iexcl;Gracias por tu reporte!
            </p>
            <p className="font-archivo text-[13px] text-gz-ink-mid mt-2">
              Tu experiencia ayudar&aacute; a futuros estudiantes de tu universidad
              a prepararse mejor.
            </p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <p className="font-archivo text-[13px] text-gz-ink-mid">
              Tu experiencia ayuda a futuros estudiantes de tu universidad a prepararse mejor.
            </p>

            {/* Fecha */}
            <div>
              <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-1.5">
                &iquest;Cu&aacute;ndo rendiste el examen?
              </label>
              <input
                type="date"
                value={fechaExamen}
                onChange={(e) => setFechaExamen(e.target.value)}
                className="w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
              />
            </div>

            {/* Aprobado */}
            <div>
              <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-2">
                &iquest;Aprobaste?
              </label>
              <div className="flex gap-2">
                {[
                  { value: true, label: "Sí", activeClass: "border-gz-sage bg-gz-sage/[0.08] text-gz-sage" },
                  { value: false, label: "No", activeClass: "border-gz-burgundy bg-gz-burgundy/[0.08] text-gz-burgundy" },
                  { value: null, label: "Aún no sé", activeClass: "border-gz-gold bg-gz-gold/[0.08] text-gz-gold" },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setAprobado(opt.value)}
                    className={`flex-1 rounded-[3px] px-4 py-2 font-archivo text-[13px] font-semibold transition-colors ${
                      aprobado === opt.value
                        ? opt.activeClass
                        : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Materias */}
            <div>
              <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-2">
                &iquest;Qu&eacute; materias te preguntaron?
              </label>
              <p className="font-archivo text-[12px] text-gz-ink-light mb-2">
                Selecciona todas las que apliquen
              </p>
              <div className="border border-gz-rule rounded-[4px] bg-white divide-y divide-gz-cream-dark max-h-[200px] overflow-y-auto">
                {temas.map((tema) => (
                  <label
                    key={tema.id}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gz-gold/[0.02] transition-colors"
                  >
                    <div
                      className={`w-5 h-5 rounded-[3px] border-2 flex items-center justify-center transition-colors shrink-0 ${
                        selectedMaterias.includes(tema.nombre)
                          ? "bg-gz-gold border-gz-gold"
                          : "border-gz-rule"
                      }`}
                    >
                      {selectedMaterias.includes(tema.nombre) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="font-archivo text-[14px] text-gz-ink">
                      {tema.nombre}
                    </span>
                  </label>
                ))}

                {/* Custom materias already added */}
                {selectedMaterias
                  .filter((m) => !temas.some((t) => t.nombre === m))
                  .map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gz-gold/[0.02]"
                    >
                      <div className="w-5 h-5 rounded-[3px] border-2 bg-gz-gold border-gz-gold flex items-center justify-center shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="font-archivo text-[14px] text-gz-ink">
                        {m}
                      </span>
                      <button
                        onClick={() => toggleMateria(m)}
                        className="ml-auto text-gz-ink-light hover:text-gz-burgundy text-[12px]"
                      >
                        &times;
                      </button>
                    </label>
                  ))}
              </div>

              {/* Add custom */}
              {showCustomInput ? (
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={customMateria}
                    onChange={(e) => setCustomMateria(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomMateria()}
                    placeholder="Nombre de la materia"
                    className="flex-1 border border-gz-rule rounded-[4px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={addCustomMateria}
                    className="rounded-[3px] bg-gz-gold px-3 py-2 font-archivo text-[12px] font-semibold text-white"
                  >
                    A&ntilde;adir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="mt-2 font-archivo text-[12px] text-gz-gold hover:underline"
                >
                  + Agregar otra materia
                </button>
              )}
            </div>

            {/* Dificultad */}
            <div>
              <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-2">
                &iquest;C&oacute;mo fue la dificultad general?{" "}
                <span className="font-normal text-gz-ink-light">(opcional)</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setDificultad(dificultad === n ? null : n)}
                    className={`text-[20px] cursor-pointer transition-colors ${
                      dificultad !== null && n <= dificultad
                        ? "text-gz-gold"
                        : "text-gz-cream-dark hover:text-gz-gold/50"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Comentario */}
            <div>
              <label className="block font-archivo text-[13px] font-semibold text-gz-ink mb-1.5">
                Comentario{" "}
                <span className="font-normal text-gz-ink-light">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value.slice(0, 1000))}
                rows={3}
                placeholder="Cualquier comentario sobre tu experiencia..."
                className="w-full border border-gz-rule rounded-[4px] px-3 py-2.5 font-archivo text-[14px] text-gz-ink bg-white resize-none focus:border-gz-gold focus:outline-none"
              />
            </div>

            {/* CTAs */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-mid transition-colors hover:bg-gz-cream-dark"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-[3px] bg-gz-gold px-4 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold/90 disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar reporte"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
