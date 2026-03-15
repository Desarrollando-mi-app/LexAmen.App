"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FORMATO_LABELS } from "@/lib/diario-constants";
import { parseNormas } from "@/lib/norma-parser";

// ─── Types ───────────────────────────────────────────────

interface PostUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad?: string | null;
}

interface CitaItem {
  id: string;
  titulo: string;
  formato: string;
  contenido: string | null;
  opinion: string | null;
  createdAt: string;
  user: PostUser;
}

interface PostData {
  id: string;
  formato: string;
  visibilidad: string;
  titulo: string;
  materia: string | null;
  contenido: string | null;
  rol: string | null;
  tribunal: string | null;
  fecha: string | null;
  partes: string | null;
  hechos: string | null;
  ratio: string | null;
  norma: string | null;
  opinion: string | null;
  pdfUrl: string | null;
  views: number;
  citadoDeId: string | null;
  createdAt: string;
  userId: string;
  user: PostUser;
  hashtags: Array<{ id: string; tag: string }>;
  citadoDe: {
    id: string;
    titulo: string;
    formato: string;
    userName: string;
    createdAt: string;
  } | null;
  citas: CitaItem[];
  citasCount: number;
  guardadosCount: number;
  isGuardado: boolean;
}

// ─── RichText ────────────────────────────────────────────

function RichText({ text }: { text: string }) {
  const normas = parseNormas(text);
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

        const normaInPart = normas.filter((n) => part.includes(n.original));
        if (normaInPart.length === 0) return <span key={i}>{part}</span>;

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
              className="text-gz-gold hover:underline"
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

// ─── Component ───────────────────────────────────────────

export function PostDetail({
  post,
  currentUserId,
}: {
  post: PostData;
  currentUserId: string;
}) {
  const router = useRouter();
  const [isGuardado, setIsGuardado] = useState(post.isGuardado);
  const [guardadosCount, setGuardadosCount] = useState(post.guardadosCount);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isOwner = post.userId === currentUserId;
  const initials = `${post.user.firstName[0]}${post.user.lastName[0]}`.toUpperCase();

  const createdDate = new Date(post.createdAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleToggleGuardar() {
    try {
      const res = await fetch(`/api/diario/${post.id}/guardar`, {
        method: "POST",
      });
      const data = await res.json();
      setIsGuardado(data.guardado);
      setGuardadosCount((c) => (data.guardado ? c + 1 : c - 1));
    } catch {
      toast.error("Error al guardar");
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/diario/${post.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Error al eliminar");
        return;
      }
      toast.success("Publicación eliminada");
      router.push("/dashboard/diario");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Back link */}
      <Link
        href="/dashboard/diario"
        className="mb-4 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
      >
        ← Volver al feed
      </Link>

      {/* Main card */}
      <article className="rounded-[4px] border border-gz-rule bg-white p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <Link href={`/dashboard/perfil/${post.user.id}`}>
            {post.user.avatarUrl ? (
              <img
                src={post.user.avatarUrl}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[11px] font-bold text-gz-gold">
                {initials}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/perfil/${post.user.id}`}
              className="font-archivo text-[14px] font-semibold text-gz-ink hover:underline"
            >
              {post.user.firstName} {post.user.lastName}
            </Link>
            {post.user.universidad && (
              <p className="font-ibm-mono text-[10px] text-gz-ink-light">{post.user.universidad}</p>
            )}
            <p className="font-ibm-mono text-[11px] text-gz-ink-light">{createdDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-sm px-2.5 py-1 font-ibm-mono text-[9px] uppercase tracking-[0.5px] font-medium ${
                post.formato === "OBITER_DICTUM"
                  ? "bg-gz-gold/[0.1] text-gz-gold"
                  : "bg-gz-navy/[0.1] text-gz-navy"
              }`}
            >
              {FORMATO_LABELS[post.formato] ?? post.formato}
            </span>
            {post.visibilidad === "COLEGAS" && (
              <span className="text-[10px] text-gz-ink-light">🔒</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 font-cormorant text-[24px] sm:text-[28px] !font-bold text-gz-ink leading-tight">
          {post.titulo}
        </h1>

        {/* Materia */}
        {post.materia && (
          <p className="mb-4 font-ibm-mono text-[10px] text-gz-ink-light">📚 {post.materia}</p>
        )}

        {/* Cited from */}
        {post.citadoDe && (
          <Link
            href={`/dashboard/diario/${post.citadoDe.id}`}
            className="mb-4 block rounded-[3px] border border-gz-gold/20 bg-gz-gold/[0.06] p-3"
          >
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">Cita a:</p>
            <p className="font-cormorant text-[15px] font-semibold text-gz-ink">
              {post.citadoDe.titulo}
            </p>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              por {post.citadoDe.userName}
            </p>
          </Link>
        )}

        {/* ─── Obiter Dictum body ──────────────────────── */}
        {post.formato === "OBITER_DICTUM" && post.contenido && (
          <div className="mb-6 font-cormorant text-[17px] text-gz-ink leading-[1.8] whitespace-pre-line">
            <RichText text={post.contenido} />
          </div>
        )}

        {/* ─── Análisis de Fallos body ─────────────────── */}
        {post.formato === "ANALISIS_FALLOS" && (
          <div className="mb-6 space-y-4">
            {(post.rol || post.tribunal || post.fecha || post.partes) && (
              <div className="rounded-[3px] bg-gz-cream-dark p-4 grid grid-cols-2 gap-3 text-sm">
                {post.rol && (
                  <div>
                    <span className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] text-gz-ink-light font-medium">Rol</span>
                    <p className="font-archivo text-[14px] text-gz-ink-mid">{post.rol}</p>
                  </div>
                )}
                {post.tribunal && (
                  <div>
                    <span className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] text-gz-ink-light font-medium">Tribunal</span>
                    <p className="font-archivo text-[14px] text-gz-ink-mid">{post.tribunal}</p>
                  </div>
                )}
                {post.fecha && (
                  <div>
                    <span className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] text-gz-ink-light font-medium">Fecha</span>
                    <p className="font-archivo text-[14px] text-gz-ink-mid">{post.fecha}</p>
                  </div>
                )}
                {post.partes && (
                  <div>
                    <span className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] text-gz-ink-light font-medium">Partes</span>
                    <p className="font-archivo text-[14px] text-gz-ink-mid">{post.partes}</p>
                  </div>
                )}
              </div>
            )}

            {post.hechos && (
              <div>
                <h3 className="mb-1 font-archivo text-[13px] font-bold text-gz-ink">
                  Hechos relevantes
                </h3>
                <div className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed whitespace-pre-line">
                  <RichText text={post.hechos} />
                </div>
              </div>
            )}

            {post.ratio && (
              <div>
                <h3 className="mb-1 font-archivo text-[13px] font-bold text-gz-ink">
                  Ratio Decidendi
                </h3>
                <div className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed whitespace-pre-line">
                  <RichText text={post.ratio} />
                </div>
              </div>
            )}

            {post.norma && (
              <div>
                <h3 className="mb-1 font-archivo text-[13px] font-bold text-gz-ink">
                  Normas aplicadas
                </h3>
                <div className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed">
                  <RichText text={post.norma} />
                </div>
              </div>
            )}

            {post.opinion && (
              <div>
                <h3 className="mb-1 font-archivo text-[13px] font-bold text-gz-ink">
                  Opinión / Análisis
                </h3>
                <div className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed whitespace-pre-line">
                  <RichText text={post.opinion} />
                </div>
              </div>
            )}

            {post.pdfUrl && (
              <a
                href={post.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
              >
                📄 Ver PDF del fallo
              </a>
            )}
          </div>
        )}

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {post.hashtags.map((h) => (
              <Link
                key={h.id}
                href={`/dashboard/diario?hashtag=${h.tag}`}
                className="rounded-sm bg-gz-gold/[0.08] px-2.5 py-1 font-ibm-mono text-[10px] font-medium text-gz-gold hover:bg-gz-gold/[0.15] transition-colors"
              >
                #{h.tag}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-gz-rule pt-4">
          <button
            onClick={handleToggleGuardar}
            className={`flex items-center gap-1.5 rounded-[3px] px-3 py-2 font-archivo text-[13px] font-medium transition-colors ${
              isGuardado
                ? "bg-gz-gold/[0.1] text-gz-gold"
                : "border border-gz-rule text-gz-ink-mid hover:bg-gz-cream-dark/50"
            }`}
          >
            {isGuardado ? "Guardado" : "Guardar"} ({guardadosCount})
          </button>

          <Link
            href={`/dashboard/diario?citar=${post.id}`}
            className="flex items-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
          >
            Citar ({post.citasCount})
          </Link>

          <span className="font-ibm-mono text-[10px] text-gz-ink-light">{post.views} vistas</span>

          {isOwner && (
            <div className="ml-auto">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="font-archivo text-[12px] text-gz-burgundy">¿Eliminar?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-[3px] bg-gz-burgundy px-3 py-1.5 font-archivo text-[12px] font-medium text-white hover:bg-gz-burgundy/90 disabled:opacity-50"
                  >
                    {deleting ? "..." : "Sí, eliminar"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] text-gz-ink-mid hover:bg-gz-cream-dark/50"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-[3px] border border-gz-burgundy/20 px-3 py-1.5 font-archivo text-[12px] text-gz-burgundy hover:bg-gz-burgundy/[0.06] transition-colors"
                >
                  🗑 Eliminar
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      {/* ─── Citas (posts que citan este) ──────────────── */}
      {post.citas.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 font-cormorant text-[20px] !font-bold text-gz-ink">
            💬 Citas ({post.citasCount})
          </h2>
          <div className="space-y-3">
            {post.citas.map((cita) => {
              const citaInitials = `${cita.user.firstName[0]}${cita.user.lastName[0]}`.toUpperCase();
              return (
                <Link
                  key={cita.id}
                  href={`/dashboard/diario/${cita.id}`}
                  className="block rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {cita.user.avatarUrl ? (
                      <img
                        src={cita.user.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 text-[10px] font-bold text-gz-gold">
                        {citaInitials}
                      </div>
                    )}
                    <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                      {cita.user.firstName} {cita.user.lastName}
                    </span>
                    <span
                      className={`rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] uppercase tracking-[0.5px] font-semibold ${
                        cita.formato === "OBITER_DICTUM"
                          ? "bg-gz-gold/[0.1] text-gz-gold"
                          : "bg-gz-navy/[0.1] text-gz-navy"
                      }`}
                    >
                      {FORMATO_LABELS[cita.formato]}
                    </span>
                  </div>
                  <h4 className="font-archivo text-[13px] font-bold text-gz-ink">{cita.titulo}</h4>
                  {cita.contenido && (
                    <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid line-clamp-2">
                      {cita.contenido}
                    </p>
                  )}
                  {cita.opinion && !cita.contenido && (
                    <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid line-clamp-2">
                      {cita.opinion}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
