"use client";

import { useState } from "react";
import Link from "next/link";

const RAMAS = [
  { value: "DERECHO_CIVIL", label: "Derecho Civil" },
  { value: "DERECHO_PROCESAL_CIVIL", label: "Derecho Procesal Civil" },
  { value: "DERECHO_ORGANICO", label: "Derecho Organico" },
];

const MATERIAS_POR_RAMA: Record<string, string[]> = {
  DERECHO_CIVIL: [
    "Obligaciones",
    "Contratos",
    "Responsabilidad Civil",
    "Bienes",
    "Sucesiones",
    "Familia",
    "Personas",
    "Acto Juridico",
  ],
  DERECHO_PROCESAL_CIVIL: [
    "Juicio Ordinario",
    "Juicio Sumario",
    "Juicio Ejecutivo",
    "Medidas Cautelares",
    "Recursos",
    "Prueba",
    "Competencia",
  ],
  DERECHO_ORGANICO: [
    "Tribunales",
    "Competencia",
    "Jurisdiccion",
    "Auxiliares de la Administracion de Justicia",
  ],
};

export default function ProponerExpedientePage() {
  const [titulo, setTitulo] = useState("");
  const [hechos, setHechos] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [rama, setRama] = useState(RAMAS[0].value);
  const [materiasSelected, setMateriasSelected] = useState<string[]>([]);
  const [bandoDemandante, setBandoDemandante] = useState("Demandante");
  const [bandoDemandado, setBandoDemandado] = useState("Demandado");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const materiaOptions = MATERIAS_POR_RAMA[rama] ?? [];

  function toggleMateria(m: string) {
    setMateriasSelected((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!titulo.trim()) {
      setError("El titulo es requerido.");
      return;
    }
    if (hechos.trim().length < 50) {
      setError("Los hechos deben tener al menos 50 caracteres.");
      return;
    }
    if (!pregunta.trim()) {
      setError("La pregunta es requerida.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expediente/proponer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          titulo: titulo.trim(),
          hechos: hechos.trim(),
          pregunta: pregunta.trim(),
          rama,
          materias: materiasSelected.join(","),
          bandoDemandante: bandoDemandante.trim() || "Demandante",
          bandoDemandado: bandoDemandado.trim() || "Demandado",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al enviar la propuesta.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al enviar la propuesta."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <div className="mb-6 rounded-[4px] border border-gz-gold bg-gz-gold/[0.06] p-8">
            <p className="mb-2 font-cormorant text-[28px] font-bold text-gz-ink">
              Propuesta enviada
            </p>
            <p className="mb-4 font-archivo text-[14px] text-gz-ink-mid">
              El equipo editorial la revisara. Si es aprobada, aparecera como un
              nuevo Expediente Abierto para toda la comunidad.
            </p>
            <Link
              href="/dashboard/diario/expediente"
              className="inline-block rounded-[3px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              Volver a Expedientes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Back */}
        <Link
          href="/dashboard/diario/expediente"
          className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light transition-colors hover:text-gz-ink"
        >
          &larr; Volver a Expedientes
        </Link>

        {/* Header */}
        <header className="mb-6">
          <p className="mb-2 font-ibm-mono text-[9px] font-semibold uppercase tracking-[2.5px] text-gz-burgundy">
            Proponer Caso
          </p>
          <h1 className="font-cormorant text-[32px] font-bold text-gz-ink">
            Proponer un caso para debate
          </h1>
          <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid">
            Describe un caso juridico interesante para que la comunidad lo
            debata.
          </p>
        </header>

        <div className="mb-6 h-[2px] bg-gz-rule-dark" />

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-[4px] border border-gz-rule bg-white p-6"
        >
          {/* Titulo */}
          <div>
            <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              Titulo del caso
            </label>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              maxLength={200}
              placeholder="Ej: Responsabilidad del vendedor por vicios ocultos"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
          </div>

          {/* Hechos */}
          <div>
            <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              Hechos del caso
            </label>
            <textarea
              value={hechos}
              onChange={(e) => setHechos(e.target.value)}
              rows={10}
              placeholder="Describe los hechos relevantes del caso con el mayor detalle posible..."
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-cormorant text-[16px] leading-[1.7] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
            <p className="mt-0.5 text-right font-ibm-mono text-[9px] text-gz-ink-light">
              {hechos.length} caracteres (min. 50)
            </p>
          </div>

          {/* Pregunta */}
          <div>
            <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              Pregunta a debatir
            </label>
            <input
              value={pregunta}
              onChange={(e) => setPregunta(e.target.value)}
              maxLength={300}
              placeholder="Ej: Debe responder el vendedor por los danos causados?"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
          </div>

          {/* Rama */}
          <div>
            <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              Rama del Derecho
            </label>
            <select
              value={rama}
              onChange={(e) => {
                setRama(e.target.value);
                setMateriasSelected([]);
              }}
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none"
            >
              {RAMAS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Materias */}
          <div>
            <label className="mb-2 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              Materias relacionadas
            </label>
            <div className="flex flex-wrap gap-2">
              {materiaOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMateria(m)}
                  className={`rounded-sm px-3 py-1 font-ibm-mono text-[10px] font-medium transition-colors ${
                    materiasSelected.includes(m)
                      ? "bg-gz-gold text-white"
                      : "bg-gz-gold/[0.08] text-gz-gold hover:bg-gz-gold/20"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Bando names */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
                Nombre bando 1
              </label>
              <input
                value={bandoDemandante}
                onChange={(e) => setBandoDemandante(e.target.value)}
                maxLength={50}
                placeholder="Demandante"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
                Nombre bando 2
              </label>
              <input
                value={bandoDemandado}
                onChange={(e) => setBandoDemandado(e.target.value)}
                maxLength={50}
                placeholder="Demandado"
                className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="font-archivo text-[12px] text-gz-red">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[3px] bg-gz-navy px-4 py-3 font-archivo text-[14px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
          >
            {submitting ? "Enviando..." : "Enviar propuesta"}
          </button>
        </form>
      </div>
    </div>
  );
}
