"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const RAMAS = [
  { value: "civil", label: "Derecho Civil" },
  { value: "penal", label: "Derecho Penal" },
  { value: "constitucional", label: "Derecho Constitucional" },
  { value: "administrativo", label: "Derecho Administrativo" },
  { value: "laboral", label: "Derecho Laboral" },
  { value: "tributario", label: "Derecho Tributario" },
  { value: "comercial", label: "Derecho Comercial" },
  { value: "procesal", label: "Derecho Procesal" },
  { value: "internacional", label: "Derecho Internacional" },
  { value: "ambiental", label: "Derecho Ambiental" },
  { value: "familia", label: "Derecho de Familia" },
  { value: "otro", label: "Otro" },
];

export default function ProponerDebatePage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [rama, setRama] = useState("");
  const [materias, setMaterias] = useState("");
  const [miPosicion, setMiPosicion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/diario/debates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ titulo, descripcion, rama, materias, miPosicion }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear el debate");
      }

      const data = await res.json();
      router.push(`/dashboard/diario/debates/${data.debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6">
      {/* Header */}
      <p className="mb-1 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
        El Diario
      </p>
      <div className="mb-1 flex items-center gap-3">
        <Image
          src="/brand/logo-sello.svg"
          alt="Studio Iuris"
          width={80}
          height={80}
          className="h-[60px] w-[60px]"
        />
        <h1 className="font-cormorant text-[32px] font-bold leading-none text-gz-ink">
          Proponer un Debate
        </h1>
      </div>
      <div className="mt-3 h-[2px] bg-gz-rule-dark" />

      {/* Back link */}
      <Link
        href="/dashboard/diario/debates"
        className="mt-4 inline-block font-archivo text-[12px] text-gz-gold hover:underline"
      >
        &larr; Volver a debates
      </Link>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && (
          <div className="rounded-[4px] border border-red-200 bg-red-50 px-4 py-3 font-archivo text-[13px] text-red-700">
            {error}
          </div>
        )}

        {/* Titulo */}
        <div>
          <label className="mb-1.5 block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Titulo del debate
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder='Ej: "La prescripcion adquisitiva debe operar de pleno derecho"'
            required
            minLength={10}
            maxLength={200}
            className="h-10 w-full rounded-[3px] border border-gz-rule bg-white px-3 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
            {titulo.length}/200 caracteres
          </p>
        </div>

        {/* Descripcion */}
        <div>
          <label className="mb-1.5 block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Descripcion del problema juridico
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe el problema juridico que quieres debatir. Incluye contexto, normas aplicables y por que es un tema debatible..."
            required
            minLength={30}
            maxLength={2000}
            rows={5}
            className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
            {descripcion.length}/2000 caracteres
          </p>
        </div>

        {/* Rama */}
        <div>
          <label className="mb-1.5 block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Rama del derecho
          </label>
          <select
            value={rama}
            onChange={(e) => setRama(e.target.value)}
            required
            className="h-10 w-full rounded-[3px] border border-gz-rule bg-white px-3 font-archivo text-[14px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          >
            <option value="">Seleccionar rama...</option>
            {RAMAS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* Materias */}
        <div>
          <label className="mb-1.5 block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Materias relacionadas{" "}
            <span className="font-normal normal-case tracking-normal text-gz-ink-light">
              (opcional)
            </span>
          </label>
          <input
            type="text"
            value={materias}
            onChange={(e) => setMaterias(e.target.value)}
            placeholder="Ej: prescripcion, posesion, bienes"
            className="h-10 w-full rounded-[3px] border border-gz-rule bg-white px-3 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
        </div>

        {/* Mi Posicion */}
        <div>
          <label className="mb-1.5 block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Tu posicion
          </label>
          <textarea
            value={miPosicion}
            onChange={(e) => setMiPosicion(e.target.value)}
            placeholder="Declara brevemente tu posicion: ¿a favor o en contra? ¿Que tesis defiendes?"
            required
            minLength={10}
            maxLength={500}
            rows={3}
            className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2.5 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
          <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light">
            {miPosicion.length}/500 caracteres
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-10 items-center gap-2 rounded-[3px] bg-gz-navy px-6 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
          >
            {submitting ? "Publicando..." : "Publicar debate"}
          </button>
          <Link
            href="/dashboard/diario/debates"
            className="font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
