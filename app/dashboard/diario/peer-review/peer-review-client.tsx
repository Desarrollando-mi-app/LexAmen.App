"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// ─── Tipos ────────────────────────────────────────────────────

interface Postulacion {
  id: string;
  motivacion: string;
  areasInteres: string | null;
  publicacionMuestra: string | null;
  estado: "pendiente" | "aprobada" | "rechazada";
  resolucionNota: string | null;
  resueltaAt: string | null;
  createdAt: string;
}

interface EstadoResponse {
  isPeerReviewer: boolean;
  peerReviewerSince: string | null;
  cumpleRequisitos: boolean;
  requisitos: {
    minGrado: number;
    gradoActual: number;
    minPublicaciones: number;
    publicacionesActuales: number;
  };
  postulacion: Postulacion | null;
}

const RAMAS_OPTIONS = [
  { value: "civil", label: "Civil" },
  { value: "penal", label: "Penal" },
  { value: "constitucional", label: "Constitucional" },
  { value: "laboral", label: "Laboral" },
  { value: "comercial", label: "Comercial" },
  { value: "administrativo", label: "Administrativo" },
  { value: "procesal", label: "Procesal" },
  { value: "tributario", label: "Tributario" },
  { value: "internacional", label: "Internacional" },
];

// ─── Component ────────────────────────────────────────────────

export function PeerReviewClient() {
  const [estado, setEstado] = useState<EstadoResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diario/peer-review/postular", {
        credentials: "include",
      });
      if (!res.ok) {
        setEstado(null);
      } else {
        setEstado(await res.json());
      }
    } catch {
      setEstado(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  if (loading) {
    return (
      <section className="max-w-[1400px] mx-auto px-7 mt-12">
        <div className="mx-auto max-w-[640px] border border-gz-rule bg-white p-12 text-center">
          <div className="h-3 bg-gz-cream-dark animate-pulse rounded w-1/2 mx-auto" />
        </div>
      </section>
    );
  }

  if (!estado) {
    return (
      <section className="max-w-[1400px] mx-auto px-7 mt-12">
        <div className="mx-auto max-w-[640px] border border-gz-rule bg-white p-8 text-center">
          <p className="font-cormorant italic text-[18px] text-gz-ink-mid">
            Inicia sesión para postular al cuerpo de revisores.
          </p>
        </div>
      </section>
    );
  }

  // ── 1. Ya es reviewer ──────────────────────────────────────
  if (estado.isPeerReviewer) {
    return <ReviewerActivoView since={estado.peerReviewerSince} />;
  }

  // ── 2. Postulación pendiente ───────────────────────────────
  if (estado.postulacion?.estado === "pendiente") {
    return <PostulacionPendienteView postulacion={estado.postulacion} />;
  }

  // ── 3. Postulación rechazada (puede repostular) ────────────
  if (estado.postulacion?.estado === "rechazada") {
    return (
      <PostulacionRechazadaView
        postulacion={estado.postulacion}
        cumpleRequisitos={estado.cumpleRequisitos}
        requisitos={estado.requisitos}
        onSubmitted={refetch}
      />
    );
  }

  // ── 4. No cumple requisitos ────────────────────────────────
  if (!estado.cumpleRequisitos) {
    return <NoCumpleRequisitosView requisitos={estado.requisitos} />;
  }

  // ── 5. Cumple requisitos, sin postulación previa ───────────
  return (
    <PostulacionFormView
      requisitos={estado.requisitos}
      onSubmitted={refetch}
    />
  );
}

// ─── Vistas ──────────────────────────────────────────────────

function ReviewerActivoView({ since }: { since: string | null }) {
  return (
    <section className="max-w-[1400px] mx-auto px-7 mt-12">
      <div className="mx-auto max-w-[640px]">
        <article className="border border-gz-ink bg-white p-8 sm:p-10 text-center">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-gold mb-4">
            — Cuerpo de revisores —
          </div>
          <p className="font-cormorant text-[24px] sm:text-[28px] leading-[1.3] text-gz-ink">
            Eres parte del <span className="italic">cuerpo de revisores</span> de Iuris.
          </p>
          <p className="font-archivo text-[13px] leading-[1.65] text-gz-ink-mid mt-4">
            {since
              ? `Activo desde ${new Date(since).toLocaleDateString("es-CL", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}.`
              : "Activo."}{" "}
            Recibirás notificaciones cuando se asignen revisiones a tu nombre.
          </p>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gz-rule" />
            <span className="font-cormorant italic text-2xl text-gz-gold opacity-60">✠</span>
            <div className="h-px flex-1 bg-gz-rule" />
          </div>

          <Link
            href="/dashboard/diario/peer-review/mis-pendientes"
            className="inline-flex items-center gap-2 font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] border border-gz-ink text-gz-ink px-5 py-2.5 rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
          >
            Mis revisiones pendientes →
          </Link>
        </article>
      </div>
    </section>
  );
}

function PostulacionPendienteView({ postulacion }: { postulacion: Postulacion }) {
  return (
    <section className="max-w-[1400px] mx-auto px-7 mt-12">
      <div className="mx-auto max-w-[640px]">
        <article className="border border-gz-rule bg-white p-8 sm:p-10">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light mb-4">
            — Postulación en revisión —
          </div>
          <p className="font-cormorant text-[22px] leading-[1.3] text-gz-ink">
            Tu postulación está siendo evaluada por la dirección editorial.
          </p>
          <p className="font-archivo text-[12.5px] text-gz-ink-mid mt-3">
            Enviada el{" "}
            {new Date(postulacion.createdAt).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Recibirás una notificación con la resolución.
          </p>

          <div className="mt-6 pt-5 border-t border-gz-rule">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-2">
              Tu motivación
            </p>
            <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-[1.6]">
              {postulacion.motivacion}
            </p>
          </div>
        </article>
      </div>
    </section>
  );
}

function PostulacionRechazadaView({
  postulacion,
  cumpleRequisitos,
  requisitos,
  onSubmitted,
}: {
  postulacion: Postulacion;
  cumpleRequisitos: boolean;
  requisitos: EstadoResponse["requisitos"];
  onSubmitted: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <section className="max-w-[1400px] mx-auto px-7 mt-12">
      <div className="mx-auto max-w-[640px]">
        <article className="border border-gz-rule bg-white p-8 sm:p-10">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light mb-4">
            — Postulación no aprobada —
          </div>
          <p className="font-cormorant text-[20px] leading-[1.3] text-gz-ink">
            Tu postulación anterior no fue aprobada en esta oportunidad.
          </p>
          {postulacion.resolucionNota && (
            <div className="mt-5 p-4 border-l-2 border-gz-gold bg-gz-cream/50">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
                Nota del editor
              </p>
              <p className="font-cormorant italic text-[15px] text-gz-ink leading-[1.5]">
                {postulacion.resolucionNota}
              </p>
            </div>
          )}

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 inline-flex items-center gap-2 font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] border border-gz-ink text-gz-ink px-5 py-2.5 rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
            >
              Postular nuevamente →
            </button>
          )}
        </article>

        {showForm && cumpleRequisitos && (
          <div className="mt-6">
            <PostulacionFormView requisitos={requisitos} onSubmitted={onSubmitted} />
          </div>
        )}

        {showForm && !cumpleRequisitos && (
          <div className="mt-6">
            <NoCumpleRequisitosView requisitos={requisitos} />
          </div>
        )}
      </div>
    </section>
  );
}

function NoCumpleRequisitosView({
  requisitos,
}: {
  requisitos: EstadoResponse["requisitos"];
}) {
  const faltaGrado = Math.max(0, requisitos.minGrado - requisitos.gradoActual);
  const faltaPubs = Math.max(0, requisitos.minPublicaciones - requisitos.publicacionesActuales);

  return (
    <section className="max-w-[1400px] mx-auto px-7 mt-12">
      <div className="mx-auto max-w-[640px]">
        <article className="border border-gz-rule bg-white p-8 sm:p-10">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light mb-4">
            — Requisitos para postular —
          </div>
          <p className="font-cormorant text-[20px] leading-[1.35] text-gz-ink">
            El cuerpo de revisores se forma con autores que ya hayan demostrado{" "}
            <span className="italic">rigor y producción sostenida</span>.
          </p>

          <div className="mt-6 space-y-4">
            <RequisitoRow
              label="Grado mínimo"
              actual={requisitos.gradoActual}
              meta={requisitos.minGrado}
              cumple={requisitos.gradoActual >= requisitos.minGrado}
            />
            <RequisitoRow
              label="Publicaciones (Análisis o Ensayos)"
              actual={requisitos.publicacionesActuales}
              meta={requisitos.minPublicaciones}
              cumple={requisitos.publicacionesActuales >= requisitos.minPublicaciones}
            />
          </div>

          <div className="mt-7 pt-5 border-t border-gz-rule">
            <p className="font-cormorant italic text-[14.5px] text-gz-ink-mid">
              {faltaGrado > 0 && faltaPubs > 0
                ? `Te faltan ${faltaGrado} grado(s) y ${faltaPubs} publicación(es) para poder postular.`
                : faltaGrado > 0
                ? `Te falta${faltaGrado === 1 ? "" : "n"} ${faltaGrado} grado${faltaGrado === 1 ? "" : "s"} para poder postular.`
                : `Te falta${faltaPubs === 1 ? "" : "n"} ${faltaPubs} publicación${faltaPubs === 1 ? "" : "es"} para poder postular.`}
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="/dashboard/diario/analisis"
              className="font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] border border-gz-ink text-gz-ink px-4 py-2 rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
            >
              Ver Análisis
            </Link>
            <Link
              href="/dashboard/diario/ensayos"
              className="font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] border border-gz-ink text-gz-ink px-4 py-2 rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
            >
              Ver Ensayos
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}

function RequisitoRow({
  label,
  actual,
  meta,
  cumple,
}: {
  label: string;
  actual: number;
  meta: number;
  cumple: boolean;
}) {
  const pct = Math.min(100, Math.round((actual / meta) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-archivo text-[13px] text-gz-ink">{label}</p>
        <p className="font-ibm-mono text-[11px] tracking-[1px] text-gz-ink-mid">
          <span className={cumple ? "text-gz-gold font-semibold" : "text-gz-ink"}>
            {actual}
          </span>
          <span className="text-gz-ink-light"> / {meta}</span>
        </p>
      </div>
      <div className="h-1.5 bg-gz-cream-dark rounded-[2px] overflow-hidden">
        <div
          className={`h-full transition-all ${cumple ? "bg-gz-gold" : "bg-gz-ink/40"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PostulacionFormView({
  requisitos,
  onSubmitted,
}: {
  requisitos: EstadoResponse["requisitos"];
  onSubmitted: () => void;
}) {
  const [motivacion, setMotivacion] = useState("");
  const [areas, setAreas] = useState<string[]>([]);
  const [publicacionMuestra, setPublicacionMuestra] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motivacionLen = motivacion.trim().length;
  const motivacionValida = motivacionLen >= 80 && motivacionLen <= 2000;

  const toggleArea = (v: string) => {
    setAreas((prev) =>
      prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v].slice(0, 5),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!motivacionValida || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/diario/peer-review/postular", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          motivacion: motivacion.trim(),
          areasInteres: areas,
          publicacionMuestra: publicacionMuestra.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "No se pudo enviar la postulación.");
      }
      onSubmitted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar.");
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-[1400px] mx-auto px-7 mt-12">
      <div className="mx-auto max-w-[640px]">
        <article className="border border-gz-ink bg-white p-8 sm:p-10">
          <div className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-gold mb-4">
            — Postulación al cuerpo de revisores —
          </div>
          <p className="font-cormorant text-[22px] leading-[1.3] text-gz-ink">
            Postula para revisar publicaciones antes de imprenta.
          </p>
          <p className="font-archivo text-[13px] leading-[1.65] text-gz-ink-mid mt-3">
            Cumples los requisitos: grado {requisitos.gradoActual} (mín. {requisitos.minGrado}),{" "}
            {requisitos.publicacionesActuales} publicación{requisitos.publicacionesActuales === 1 ? "" : "es"}{" "}
            (mín. {requisitos.minPublicaciones}). Cuéntanos por qué quieres ser parte del cuerpo
            editorial.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Motivación */}
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mb-2">
                Motivación · {motivacionLen}/2000 caracteres
              </label>
              <textarea
                value={motivacion}
                onChange={(e) => setMotivacion(e.target.value)}
                rows={6}
                placeholder="Cuenta tu trayectoria, qué áreas dominas, qué tipo de publicaciones te interesa revisar y qué podrías aportar como par evaluador. Mínimo 80 caracteres."
                className="w-full font-cormorant text-[15px] text-gz-ink bg-white border border-gz-rule rounded-[3px] p-3 outline-none focus:border-gz-ink resize-y placeholder:text-gz-ink-light/60"
                maxLength={2000}
              />
              {motivacionLen > 0 && motivacionLen < 80 && (
                <p className="mt-1 font-archivo text-[11px] text-gz-burgundy">
                  Faltan {80 - motivacionLen} caracteres.
                </p>
              )}
            </div>

            {/* Áreas de interés */}
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mb-2">
                Áreas de interés · opcional · máx. 5
              </label>
              <div className="flex flex-wrap gap-2">
                {RAMAS_OPTIONS.map((r) => {
                  const active = areas.includes(r.value);
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => toggleArea(r.value)}
                      className={`px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer ${
                        active
                          ? "bg-gz-ink text-gz-cream border-gz-ink"
                          : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"
                      }`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Publicación muestra */}
            <div>
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mb-2">
                Publicación destacada · opcional
              </label>
              <input
                type="text"
                value={publicacionMuestra}
                onChange={(e) => setPublicacionMuestra(e.target.value)}
                placeholder="URL o ID de tu mejor publicación"
                className="w-full font-archivo text-[13.5px] text-gz-ink bg-white border border-gz-rule rounded-[3px] p-2.5 outline-none focus:border-gz-ink placeholder:text-gz-ink-light/60"
                maxLength={500}
              />
            </div>

            {error && (
              <p className="font-archivo text-[12px] text-gz-burgundy">{error}</p>
            )}

            <button
              type="submit"
              disabled={!motivacionValida || submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 font-ibm-mono text-[10.5px] uppercase tracking-[1.5px] bg-gz-gold text-gz-cream px-6 py-3 rounded-[3px] hover:bg-gz-ink transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Enviando…" : "Enviar postulación →"}
            </button>
          </form>
        </article>
      </div>
    </section>
  );
}
