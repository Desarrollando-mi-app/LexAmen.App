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
  institution?: string | null;
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
              className="font-semibold text-gold hover:underline"
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
              className="text-blue-600 hover:underline"
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
        className="mb-4 inline-flex items-center gap-1 text-sm text-navy/50 hover:text-navy transition-colors"
      >
        ← Volver al feed
      </Link>

      {/* Main card */}
      <article className="rounded-2xl border border-border bg-white p-6 sm:p-8">
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
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold">
                {initials}
              </div>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/dashboard/perfil/${post.user.id}`}
              className="text-base font-semibold text-navy hover:underline"
            >
              {post.user.firstName} {post.user.lastName}
            </Link>
            {post.user.institution && (
              <p className="text-xs text-navy/50">{post.user.institution}</p>
            )}
            <p className="text-xs text-navy/40">{createdDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                post.formato === "OBITER_DICTUM"
                  ? "bg-gold/15 text-gold"
                  : "bg-navy/10 text-navy"
              }`}
            >
              {FORMATO_LABELS[post.formato] ?? post.formato}
            </span>
            {post.visibilidad === "COLEGAS" && (
              <span className="text-[10px] text-navy/40">🔒</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 text-xl font-bold text-navy font-display sm:text-2xl">
          {post.titulo}
        </h1>

        {/* Materia */}
        {post.materia && (
          <p className="mb-4 text-xs text-navy/50">📚 {post.materia}</p>
        )}

        {/* Cited from */}
        {post.citadoDe && (
          <Link
            href={`/dashboard/diario/${post.citadoDe.id}`}
            className="mb-4 block rounded-lg border border-gold/20 bg-gold/5 p-3"
          >
            <p className="text-xs text-navy/50">📎 Cita a:</p>
            <p className="text-sm font-semibold text-navy">
              {post.citadoDe.titulo}
            </p>
            <p className="text-xs text-navy/40">
              por {post.citadoDe.userName}
            </p>
          </Link>
        )}

        {/* ─── Obiter Dictum body ──────────────────────── */}
        {post.formato === "OBITER_DICTUM" && post.contenido && (
          <div className="mb-6 text-sm text-navy/80 leading-relaxed whitespace-pre-line">
            <RichText text={post.contenido} />
          </div>
        )}

        {/* ─── Análisis de Fallos body ─────────────────── */}
        {post.formato === "ANALISIS_FALLOS" && (
          <div className="mb-6 space-y-4">
            {(post.rol || post.tribunal || post.fecha || post.partes) && (
              <div className="rounded-lg bg-navy/5 p-4 grid grid-cols-2 gap-3 text-sm">
                {post.rol && (
                  <div>
                    <span className="text-xs font-semibold text-navy/50">Rol</span>
                    <p className="text-navy">{post.rol}</p>
                  </div>
                )}
                {post.tribunal && (
                  <div>
                    <span className="text-xs font-semibold text-navy/50">Tribunal</span>
                    <p className="text-navy">{post.tribunal}</p>
                  </div>
                )}
                {post.fecha && (
                  <div>
                    <span className="text-xs font-semibold text-navy/50">Fecha</span>
                    <p className="text-navy">{post.fecha}</p>
                  </div>
                )}
                {post.partes && (
                  <div>
                    <span className="text-xs font-semibold text-navy/50">Partes</span>
                    <p className="text-navy">{post.partes}</p>
                  </div>
                )}
              </div>
            )}

            {post.hechos && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-navy">
                  Hechos relevantes
                </h3>
                <div className="text-sm text-navy/80 leading-relaxed whitespace-pre-line">
                  <RichText text={post.hechos} />
                </div>
              </div>
            )}

            {post.ratio && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-navy">
                  Ratio Decidendi
                </h3>
                <div className="text-sm text-navy/80 leading-relaxed whitespace-pre-line">
                  <RichText text={post.ratio} />
                </div>
              </div>
            )}

            {post.norma && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-navy">
                  Normas aplicadas
                </h3>
                <div className="text-sm text-navy/80 leading-relaxed">
                  <RichText text={post.norma} />
                </div>
              </div>
            )}

            {post.opinion && (
              <div>
                <h3 className="mb-1 text-sm font-bold text-navy">
                  Opinión / Análisis
                </h3>
                <div className="text-sm text-navy/80 leading-relaxed whitespace-pre-line">
                  <RichText text={post.opinion} />
                </div>
              </div>
            )}

            {post.pdfUrl && (
              <a
                href={post.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm text-navy/70 hover:bg-navy/5 transition-colors"
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
                className="rounded-full bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold hover:bg-gold/20 transition-colors"
              >
                #{h.tag}
              </Link>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-border pt-4">
          <button
            onClick={handleToggleGuardar}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isGuardado
                ? "bg-gold/15 text-gold"
                : "border border-border text-navy/60 hover:bg-navy/5"
            }`}
          >
            {isGuardado ? "🔖 Guardado" : "📑 Guardar"} ({guardadosCount})
          </button>

          <Link
            href={`/dashboard/diario?citar=${post.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-navy/60 hover:bg-navy/5 transition-colors"
          >
            💬 Citar ({post.citasCount})
          </Link>

          <span className="text-xs text-navy/40">👁 {post.views} vistas</span>

          {isOwner && (
            <div className="ml-auto">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">¿Eliminar?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting ? "..." : "Sí, eliminar"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs text-navy/60 hover:bg-navy/5"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
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
          <h2 className="mb-3 text-lg font-bold text-navy font-display">
            💬 Citas ({post.citasCount})
          </h2>
          <div className="space-y-3">
            {post.citas.map((cita) => {
              const citaInitials = `${cita.user.firstName[0]}${cita.user.lastName[0]}`.toUpperCase();
              return (
                <Link
                  key={cita.id}
                  href={`/dashboard/diario/${cita.id}`}
                  className="block rounded-xl border border-border bg-white p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {cita.user.avatarUrl ? (
                      <img
                        src={cita.user.avatarUrl}
                        alt=""
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold">
                        {citaInitials}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-navy">
                      {cita.user.firstName} {cita.user.lastName}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        cita.formato === "OBITER_DICTUM"
                          ? "bg-gold/15 text-gold"
                          : "bg-navy/10 text-navy"
                      }`}
                    >
                      {FORMATO_LABELS[cita.formato]}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-navy">{cita.titulo}</h4>
                  {cita.contenido && (
                    <p className="mt-1 text-xs text-navy/60 line-clamp-2">
                      {cita.contenido}
                    </p>
                  )}
                  {cita.opinion && !cita.contenido && (
                    <p className="mt-1 text-xs text-navy/60 line-clamp-2">
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
