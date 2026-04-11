"use client";

import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MATERIAS_DIARIO,
  FORMATO_LABELS,
  VISIBILIDAD_LABELS,
} from "@/lib/diario-constants";
import { parseNormas } from "@/lib/norma-parser";

// ─── Types ───────────────────────────────────────────────

interface PostUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
}

interface PostHashtag {
  id: string;
  tag: string;
}

interface DiarioPostItem {
  id: string;
  formato: string;
  visibilidad: string;
  titulo: string;
  materia: string | null;
  contenido: string | null;
  tribunal: string | null;
  hechos: string | null;
  ratio: string | null;
  opinion: string | null;
  views: number;
  citadoDeId: string | null;
  createdAt: string;
  user: PostUser;
  hashtags: PostHashtag[];
  citasCount: number;
  guardadosCount: number;
  isGuardado: boolean;
}

interface ContingenciaItem {
  id: string;
  tag: string;
  count: number;
  pinned: boolean;
}

interface DiarioFeedProps {
  initialPosts: DiarioPostItem[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  contingencias: ContingenciaItem[];
}

// ─── Helpers ─────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

/** Renderiza texto con hashtags resaltados y normas como links */
function RichText({ text }: { text: string }) {
  const normas = parseNormas(text);

  // Primero resaltar hashtags
  const parts = text.split(/(#[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9_]+)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/dashboard/diario?hashtag=${tag}`}
              className="font-semibold text-gz-gold hover:underline"
            >
              {part}
            </Link>
          );
        }

        // Dentro de segmentos no-hashtag, buscar normas
        const normaInPart = normas.filter((n) => part.includes(n.original));
        if (normaInPart.length === 0) return <span key={i}>{part}</span>;

        // Reemplazar normas por links
        let remaining = part;
        const elements: React.ReactNode[] = [];
        let keyIdx = 0;

        for (const norma of normaInPart) {
          const idx = remaining.indexOf(norma.original);
          if (idx === -1) continue;

          if (idx > 0) {
            elements.push(
              <span key={`${i}-${keyIdx++}`}>{remaining.slice(0, idx)}</span>
            );
          }
          elements.push(
            <a
              key={`${i}-${keyIdx++}`}
              href={norma.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gz-gold hover:underline font-ibm-mono text-[13px]"
              title={`${norma.codigo} — Art. ${norma.articulo}`}
            >
              {norma.original}
            </a>
          );
          remaining = remaining.slice(idx + norma.original.length);
        }

        if (remaining) {
          elements.push(
            <span key={`${i}-${keyIdx++}`}>{remaining}</span>
          );
        }

        return <Fragment key={i}>{elements}</Fragment>;
      })}
    </span>
  );
}

// ─── PostCard ────────────────────────────────────────────

function PostCard({
  post,
  onToggleGuardar,
}: {
  post: DiarioPostItem;
  onToggleGuardar: (id: string) => void;
}) {
  const initials = `${post.user.firstName[0]}${post.user.lastName[0]}`.toUpperCase();

  return (
    <article className="rounded-[4px] border border-gz-rule bg-white p-5 hover:border-gz-gold transition-colors">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <Link href={`/dashboard/perfil/${post.user.id}`}>
          {post.user.avatarUrl ? (
            <img
              src={post.user.avatarUrl}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
              {initials}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/dashboard/perfil/${post.user.id}`}
              className="font-archivo text-[13px] font-semibold text-gz-ink hover:underline"
            >
              {post.user.firstName} {post.user.lastName}
            </Link>
            {post.user.universidad && (
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">{post.user.universidad}</span>
            )}
            <span className="font-ibm-mono text-[11px] text-gz-ink-light">{timeAgo(post.createdAt)}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span
              className={`inline-flex rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[0.5px] font-medium ${
                post.formato === "OBITER_DICTUM"
                  ? "bg-gz-gold/[0.1] text-gz-gold"
                  : "bg-gz-navy/[0.1] text-gz-navy"
              }`}
            >
              {FORMATO_LABELS[post.formato] ?? post.formato}
            </span>
            {post.visibilidad === "COLEGAS" && (
              <span className="font-ibm-mono text-[9px] text-gz-ink-light">🔒 Colegas</span>
            )}
            {post.materia && (
              <span className="font-ibm-mono text-[9px] text-gz-ink-light">{post.materia}</span>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <Link href={`/dashboard/diario/${post.id}`}>
        <h3 className="mb-2 font-cormorant text-[20px] !font-bold text-gz-ink hover:text-gz-gold transition-colors leading-tight">
          {post.titulo}
        </h3>
      </Link>

      {/* Body */}
      {post.formato === "OBITER_DICTUM" && post.contenido && (
        <div className="mb-3 font-cormorant text-[15px] text-gz-ink-mid leading-relaxed line-clamp-4">
          <RichText text={post.contenido} />
        </div>
      )}

      {post.formato === "ANALISIS_FALLOS" && (
        <div className="mb-3 space-y-2 text-sm">
          {post.tribunal && (
            <div>
              <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">Tribunal: </span>
              <span className="text-gz-ink-mid">{post.tribunal}</span>
            </div>
          )}
          {post.ratio && (
            <div>
              <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">Ratio Decidendi: </span>
              <span className="text-gz-ink-mid line-clamp-2">
                <RichText text={post.ratio} />
              </span>
            </div>
          )}
          {post.opinion && (
            <div>
              <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">Opinión: </span>
              <span className="text-gz-ink-mid line-clamp-2">
                <RichText text={post.opinion} />
              </span>
            </div>
          )}
        </div>
      )}

      {/* Hashtags */}
      {post.hashtags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {post.hashtags.map((h) => (
            <Link
              key={h.id}
              href={`/dashboard/diario?hashtag=${h.tag}`}
              className="rounded-sm bg-gz-gold/[0.08] px-2 py-0.5 font-ibm-mono text-[10px] font-medium text-gz-gold hover:bg-gz-gold/[0.15] transition-colors"
            >
              #{h.tag}
            </Link>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 border-t border-gz-rule pt-3 font-ibm-mono text-[11px] text-gz-ink-light">
        <span title="Citas">Citar {post.citasCount}</span>
        <span className="text-gz-ink-light/30">·</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleGuardar(post.id);
          }}
          className={`transition-colors ${
            post.isGuardado
              ? "text-gz-gold font-semibold"
              : "hover:text-gz-gold"
          }`}
          title={post.isGuardado ? "Quitar de guardados" : "Guardar"}
        >
          {post.isGuardado ? "Guardado" : "Guardar"} {post.guardadosCount}
        </button>
        <span className="text-gz-ink-light/30">·</span>
        <span title="Vistas">{post.views} vistas</span>
      </div>
    </article>
  );
}

// ─── PublishModal ─────────────────────────────────────────

function PublishModal({
  onClose,
  onPublished,
  citadoDeId,
}: {
  onClose: () => void;
  onPublished: () => void;
  citadoDeId?: string;
}) {
  const [step, setStep] = useState(citadoDeId ? 2 : 1);
  const [formato, setFormato] = useState<string>(
    citadoDeId ? "OBITER_DICTUM" : ""
  );
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [titulo, setTitulo] = useState("");
  const [materia, setMateria] = useState("");
  const [visibilidad, setVisibilidad] = useState("PUBLICO");
  // Obiter
  const [contenido, setContenido] = useState("");
  // Fallos
  const [rol, setRol] = useState("");
  const [tribunal, setTribunal] = useState("");
  const [fecha, setFecha] = useState("");
  const [partes, setPartes] = useState("");
  const [hechos, setHechos] = useState("");
  const [ratio, setRatio] = useState("");
  const [norma, setNorma] = useState("");
  const [opinion, setOpinion] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");

  async function handlePublish() {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        formato,
        visibilidad,
        titulo,
        materia: materia || null,
      };

      if (formato === "OBITER_DICTUM") {
        body.contenido = contenido;
      } else {
        body.rol = rol || null;
        body.tribunal = tribunal || null;
        body.fecha = fecha || null;
        body.partes = partes || null;
        body.hechos = hechos;
        body.ratio = ratio;
        body.norma = norma || null;
        body.opinion = opinion;
        body.pdfUrl = pdfUrl || null;
      }

      if (citadoDeId) {
        body.citadoDeId = citadoDeId;
      }

      const res = await fetch("/api/diario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al publicar");
        return;
      }

      toast.success("Publicado exitosamente");
      onPublished();
      onClose();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSubmitting(false);
    }
  }

  const canPublish =
    titulo.trim() &&
    formato &&
    (formato === "OBITER_DICTUM"
      ? contenido.trim() && contenido.length <= 128
      : hechos.trim() && ratio.trim() && opinion.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[4px] shadow-sm max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--gz-cream)" }}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-6 py-4">
          <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
            {step === 1
              ? "Nueva publicación"
              : step === 2
              ? FORMATO_LABELS[formato] || "Publicar"
              : "Vista previa"}
          </h2>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4">
          {/* Step 1: Elegir formato */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="font-archivo text-[13px] text-gz-ink-mid mb-4">
                Elige el tipo de publicación:
              </p>
              <button
                onClick={() => {
                  setFormato("OBITER_DICTUM");
                  setStep(2);
                }}
                className="w-full rounded-[4px] border-2 border-gz-rule p-4 text-left hover:border-gz-gold transition-colors"
              >
                <div className="font-cormorant text-[18px] !font-bold text-gz-ink">
                  Obiter Dictum
                </div>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                  Reflexión jurídica breve (máx. 128 caracteres)
                </p>
              </button>
              <button
                onClick={() => {
                  setFormato("ANALISIS_FALLOS");
                  setStep(2);
                }}
                className="w-full rounded-[4px] border-2 border-gz-rule p-4 text-left hover:border-gz-gold transition-colors"
              >
                <div className="font-cormorant text-[18px] !font-bold text-gz-ink">
                  Análisis de Fallos
                </div>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
                  Análisis estructurado de una sentencia o resolución judicial
                </p>
              </button>
            </div>
          )}

          {/* Step 2: Formulario */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Título */}
              <div>
                <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                  Título *
                </label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Título de tu publicación"
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>

              {/* Materia + Visibilidad */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                    Materia
                  </label>
                  <select
                    value={materia}
                    onChange={(e) => setMateria(e.target.value)}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    <option value="">Seleccionar...</option>
                    {MATERIAS_DIARIO.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                    Visibilidad
                  </label>
                  <select
                    value={visibilidad}
                    onChange={(e) => setVisibilidad(e.target.value)}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                  >
                    {Object.entries(VISIBILIDAD_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Obiter Dictum fields */}
              {formato === "OBITER_DICTUM" && (
                <div>
                  <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                    Contenido *{" "}
                    <span
                      className={`ml-1 ${
                        contenido.length > 128
                          ? "text-gz-burgundy"
                          : "text-gz-ink-light"
                      }`}
                    >
                      ({contenido.length}/128)
                    </span>
                  </label>
                  <textarea
                    value={contenido}
                    onChange={(e) => { if (e.target.value.length <= 128) setContenido(e.target.value); }}
                    placeholder="Reflexión jurídica breve (máx. 128 caracteres)"
                    rows={3}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] focus:border-gz-gold focus:outline-none resize-none" style={{ backgroundColor: "var(--gz-cream)" }}
                  />
                </div>
              )}

              {/* Análisis de Fallos fields */}
              {formato === "ANALISIS_FALLOS" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                        Rol
                      </label>
                      <input
                        value={rol}
                        onChange={(e) => setRol(e.target.value)}
                        placeholder="Ej: Rol C-1234-2024"
                        className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                        Tribunal
                      </label>
                      <input
                        value={tribunal}
                        onChange={(e) => setTribunal(e.target.value)}
                        placeholder="Ej: Corte Suprema"
                        className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                        Fecha del fallo
                      </label>
                      <input
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        placeholder="Ej: 15/03/2025"
                        className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                        Partes
                      </label>
                      <input
                        value={partes}
                        onChange={(e) => setPartes(e.target.value)}
                        placeholder="Ej: Pérez con González"
                        className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                      Hechos relevantes *
                    </label>
                    <textarea
                      value={hechos}
                      onChange={(e) => setHechos(e.target.value)}
                      placeholder="Describe los hechos relevantes del caso..."
                      rows={3}
                      className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none" style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                      Ratio Decidendi *
                    </label>
                    <textarea
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value)}
                      placeholder="La razón de la decisión del tribunal..."
                      rows={3}
                      className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none" style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                      Normas aplicadas
                    </label>
                    <input
                      value={norma}
                      onChange={(e) => setNorma(e.target.value)}
                      placeholder="Ej: Art. 1545 CC, Art. 1546 CC"
                      className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                      Tu opinión / análisis *
                    </label>
                    <textarea
                      value={opinion}
                      onChange={(e) => setOpinion(e.target.value)}
                      placeholder="Tu análisis del fallo... Usa #hashtags para categorizar."
                      rows={4}
                      className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none" style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                      URL del PDF (opcional)
                    </label>
                    <input
                      value={pdfUrl}
                      onChange={(e) => setPdfUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none" style={{ backgroundColor: "var(--gz-cream)" }}
                    />
                  </div>
                </>
              )}

              {citadoDeId && (
                <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                  Esta publicación cita a otra publicación
                </p>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="rounded-[4px] border border-gz-rule p-4" style={{ backgroundColor: "var(--gz-cream)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`rounded-sm px-2.5 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[0.5px] font-medium ${
                      formato === "OBITER_DICTUM"
                        ? "bg-gz-gold/[0.1] text-gz-gold"
                        : "bg-gz-navy/[0.1] text-gz-navy"
                    }`}
                  >
                    {FORMATO_LABELS[formato]}
                  </span>
                  <span className="font-ibm-mono text-[9px] text-gz-ink-light">
                    {VISIBILIDAD_LABELS[visibilidad]}
                  </span>
                  {materia && (
                    <span className="font-ibm-mono text-[9px] text-gz-ink-light">{materia}</span>
                  )}
                </div>
                <h3 className="font-cormorant text-[18px] !font-bold text-gz-ink mb-2">
                  {titulo}
                </h3>
                {formato === "OBITER_DICTUM" && contenido && (
                  <div className="font-cormorant text-[15px] text-gz-ink-mid leading-relaxed">
                    <RichText text={contenido} />
                  </div>
                )}
                {formato === "ANALISIS_FALLOS" && (
                  <div className="space-y-2 text-sm">
                    {tribunal && (
                      <p>
                        <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">
                          Tribunal:{" "}
                        </span>
                        {tribunal}
                      </p>
                    )}
                    {hechos && (
                      <p>
                        <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">
                          Hechos:{" "}
                        </span>
                        <RichText text={hechos} />
                      </p>
                    )}
                    {ratio && (
                      <p>
                        <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">
                          Ratio:{" "}
                        </span>
                        <RichText text={ratio} />
                      </p>
                    )}
                    {opinion && (
                      <p>
                        <span className="font-archivo text-[12px] font-semibold text-gz-ink-light">
                          Opinión:{" "}
                        </span>
                        <RichText text={opinion} />
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gz-rule px-6 py-4">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
              >
                Atrás
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {step === 2 && (
              <button
                onClick={() => setStep(3)}
                disabled={!canPublish}
                className="rounded-[3px] border border-gz-rule px-4 py-2 font-archivo text-[13px] font-medium text-gz-ink hover:bg-gz-cream-dark/50 transition-colors disabled:opacity-50"
              >
                Vista previa
              </button>
            )}
            {(step === 2 || step === 3) && (
              <button
                onClick={handlePublish}
                disabled={!canPublish || submitting}
                className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-bold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
              >
                {submitting ? "Publicando..." : "Publicar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────

export function DiarioFeed({
  initialPosts,
  initialNextCursor,
  initialHasMore,
  contingencias,
}: DiarioFeedProps) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [activeHashtag, setActiveHashtag] = useState<string | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Fetch more posts
  const fetchMore = useCallback(async () => {
    if (loading || !hasMore || !nextCursor) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("limit", "10");
      if (activeTab === "OBITER_DICTUM" || activeTab === "ANALISIS_FALLOS") {
        params.set("formato", activeTab);
      }
      if (activeTab === "guardados") {
        params.set("guardados", "true");
      }
      if (activeHashtag) {
        params.set("hashtag", activeHashtag);
      }

      const res = await fetch(`/api/diario?${params}`);
      const data = await res.json();

      setPosts((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {
      toast.error("Error al cargar más publicaciones");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, nextCursor, activeTab, activeHashtag]);

  // IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchMore]);

  // Fetch fresh when tab or hashtag changes
  const fetchFresh = useCallback(
    async (tab: string, hashtag: string | null) => {
      setLoading(true);
      setPosts([]);
      setNextCursor(null);
      setHasMore(false);

      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        if (tab === "OBITER_DICTUM" || tab === "ANALISIS_FALLOS") {
          params.set("formato", tab);
        }
        if (tab === "guardados") {
          params.set("guardados", "true");
        }
        if (hashtag) {
          params.set("hashtag", hashtag);
        }

        const res = await fetch(`/api/diario?${params}`);
        const data = await res.json();

        setPosts(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } catch {
        toast.error("Error al cargar publicaciones");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    setActiveHashtag(null);
    if (tab === "all") {
      // Reset to initial
      setPosts(initialPosts);
      setNextCursor(initialNextCursor);
      setHasMore(initialHasMore);
    } else {
      fetchFresh(tab, null);
    }
  }

  function handleHashtagFilter(tag: string) {
    if (activeHashtag === tag) {
      // Deselect
      setActiveHashtag(null);
      setActiveTab("all");
      setPosts(initialPosts);
      setNextCursor(initialNextCursor);
      setHasMore(initialHasMore);
    } else {
      setActiveHashtag(tag);
      setActiveTab("all");
      fetchFresh("all", tag);
    }
  }

  async function handleToggleGuardar(postId: string) {
    try {
      const res = await fetch(`/api/diario/${postId}/guardar`, {
        method: "POST",
      });
      const data = await res.json();

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                isGuardado: data.guardado,
                guardadosCount: data.guardado
                  ? p.guardadosCount + 1
                  : p.guardadosCount - 1,
              }
            : p
        )
      );
    } catch {
      toast.error("Error al guardar");
    }
  }

  function handlePublished() {
    // Refresh feed
    router.refresh();
    fetchFresh(activeTab, activeHashtag);
  }

  const TABS = [
    { key: "all", label: "Todos" },
    { key: "OBITER_DICTUM", label: "Obiter Dictum" },
    { key: "ANALISIS_FALLOS", label: "Análisis" },
    { key: "guardados", label: "Guardados" },
  ];

  return (
    <div className="py-6">
      <div className="flex gap-6">
        {/* ─── Feed principal ──────────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Tabs */}
          <div className="mb-4 flex gap-1 border border-gz-rule rounded-[4px] p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`flex-1 rounded-[3px] px-3 py-1.5 font-ibm-mono text-[11px] font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink font-semibold"
                    : "text-gz-ink-mid hover:text-gz-ink"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active hashtag filter indicator */}
          {activeHashtag && (
            <div className="mb-4 flex items-center gap-2 rounded-[3px] bg-gz-gold/[0.08] px-3 py-2">
              <span className="font-archivo text-[13px] text-gz-ink-mid">
                Filtrando por{" "}
                <span className="font-semibold text-gz-gold">
                  #{activeHashtag}
                </span>
              </span>
              <button
                onClick={() => handleHashtagFilter(activeHashtag)}
                className="font-ibm-mono text-[10px] text-gz-ink-light hover:text-gz-ink"
              >
                ✕ Quitar filtro
              </button>
            </div>
          )}

          {/* Posts */}
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onToggleGuardar={handleToggleGuardar}
              />
            ))}

            {posts.length === 0 && !loading && (
              <div className="rounded-[4px] border border-gz-rule bg-white p-12 text-center">
                <p className="text-4xl mb-3">📰</p>
                <p className="font-cormorant italic text-[17px] text-gz-ink-light">
                  {activeTab === "guardados"
                    ? "No tienes publicaciones guardadas"
                    : activeHashtag
                    ? `No hay publicaciones con #${activeHashtag}`
                    : "No hay publicaciones aún. ¡Sé el primero en publicar!"}
                </p>
              </div>
            )}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {loading && (
              <div className="flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gz-gold border-t-transparent" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="py-4 text-center font-ibm-mono text-[10px] text-gz-ink-light">
                No hay más publicaciones
              </p>
            )}
          </div>
        </div>

        {/* ─── Sidebar ────────────────────────────────────── */}
        <aside className="hidden w-[300px] shrink-0 lg:block">
          <div className="sticky top-[72px] space-y-4">
            {/* Publish button */}
            <button
              onClick={() => setShowPublishModal(true)}
              className="w-full rounded-[3px] bg-gz-navy px-4 py-3 font-archivo text-[13px] font-bold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
            >
              + Nueva publicación
            </button>

            {/* Contingencias Widget */}
            <div className="rounded-[4px] border border-gz-rule bg-white p-4">
              <h3 className="mb-3 font-cormorant text-[16px] !font-bold text-gz-ink">
                🔥 Contingencias
              </h3>
              {contingencias.length === 0 ? (
                <p className="font-archivo text-[12px] text-gz-ink-light">
                  Las contingencias aparecen cuando un hashtag es tendencia
                </p>
              ) : (
                <div className="space-y-2">
                  {contingencias.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleHashtagFilter(c.tag)}
                      className={`flex w-full items-center justify-between rounded-[3px] px-3 py-2 text-left font-archivo text-[13px] transition-colors ${
                        activeHashtag === c.tag
                          ? "bg-gz-gold/[0.1] text-gz-gold"
                          : "hover:bg-gz-cream-dark/50 text-gz-ink-mid"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {c.pinned && <span className="text-[10px]">📌</span>}
                        <span className="font-medium">#{c.tag}</span>
                      </span>
                      <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                        {c.count} posts
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="rounded-[4px] border border-gz-rule bg-gz-gold/[0.06] p-4">
              <p className="font-archivo text-[12px] text-gz-ink-mid leading-relaxed">
                Usa <span className="font-semibold text-gz-gold">#hashtags</span>{" "}
                en tus publicaciones para categorizar. Referencia normas con{" "}
                <span className="font-semibold text-gz-gold font-ibm-mono">
                  Art. 1445 CC
                </span>{" "}
                para generar links automáticos.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile contingencias */}
      {contingencias.length > 0 && (
        <div className="mt-6 lg:hidden">
          <h3 className="mb-2 font-cormorant text-[16px] !font-bold text-gz-ink">
            🔥 Contingencias
          </h3>
          <div className="flex flex-wrap gap-2">
            {contingencias.map((c) => (
              <button
                key={c.id}
                onClick={() => handleHashtagFilter(c.tag)}
                className={`rounded-sm px-3 py-1 font-ibm-mono text-[10px] font-medium transition-colors ${
                  activeHashtag === c.tag
                    ? "bg-gz-gold text-white"
                    : "bg-gz-gold/[0.08] text-gz-gold hover:bg-gz-gold/[0.15]"
                }`}
              >
                #{c.tag} ({c.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <PublishModal
          onClose={() => setShowPublishModal(false)}
          onPublished={handlePublished}
        />
      )}
    </div>
  );
}
