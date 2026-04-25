"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  KIND_GLYPHS,
  KIND_LABELS,
  SUBKIND_LABELS,
  kindAccent,
  type Publication,
} from "@/lib/mis-publicaciones-helpers";

interface PublicacionRowProps {
  pub: Publication;
  /** Callback opcional para que el padre quite la fila al eliminar. */
  onDeleted?: (id: string) => void;
  /** Si está presente, "Editar" abre el editor inline en el padre en lugar
   * de navegar al fallback `editHref`. */
  onEdit?: (pub: Publication) => void;
}

/**
 * Fila editorial V4 para una publicación (ayudantía / pasantía / oferta).
 * Diseño minimal, sin cover; el "tipo" se denota con un glifo en cormorant
 * grande a la izquierda. Acciones inline a la derecha: Ver, Ocultar/Mostrar,
 * Editar (inline), Eliminar (con confirm).
 */
export function PublicacionRow({ pub, onDeleted, onEdit }: PublicacionRowProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(pub.isActive);
  const [busy, setBusy] = useState<"toggle" | "delete" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const accent = kindAccent(pub.kind, pub.subkind);
  const glyphColor =
    accent === "burgundy"
      ? "text-gz-burgundy"
      : accent === "ink"
        ? "text-gz-ink"
        : "text-gz-gold";
  const eyebrowColor =
    accent === "burgundy"
      ? "text-gz-burgundy"
      : accent === "ink"
        ? "text-gz-ink-mid"
        : "text-gz-gold";

  async function toggleActive() {
    if (busy) return;
    setBusy("toggle");
    const next = !isActive;
    // optimistic
    setIsActive(next);
    try {
      const res = await fetch(pub.apiHref, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No pudimos actualizar la publicación.");
        setIsActive(!next);
        return;
      }
      toast.success(next ? "Publicación visible." : "Publicación oculta.");
      router.refresh();
    } catch {
      toast.error("Error de red. Intenta de nuevo.");
      setIsActive(!next);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    setBusy("delete");
    try {
      const res = await fetch(pub.apiHref, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "No pudimos eliminar la publicación.");
        return;
      }
      toast.success("Publicación eliminada.");
      setDeleted(true);
      onDeleted?.(pub.id);
      router.refresh();
    } catch {
      toast.error("Error de red.");
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  }

  if (deleted) return null;

  return (
    <article
      className={`relative grid grid-cols-[64px_1fr_auto] gap-5 items-start
                  border-b border-gz-rule bg-white px-5 py-5
                  transition-colors duration-150 hover:bg-gz-cream/60
                  ${!isActive ? "opacity-70" : ""}`}
    >
      {/* Glifo grande estilo capitular */}
      <div
        className={`font-cormorant italic font-semibold text-[58px] leading-none ${glyphColor} select-none`}
        aria-hidden
      >
        {KIND_GLYPHS[pub.kind]}
      </div>

      {/* Cuerpo */}
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`font-ibm-mono text-[10px] tracking-[1.5px] uppercase font-medium ${eyebrowColor}`}
          >
            {KIND_LABELS[pub.kind]}
            {pub.subkind ? ` · ${SUBKIND_LABELS[pub.subkind]}` : ""}
          </span>
          <span className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light">
            · {pub.eyebrow}
          </span>
        </div>

        <h3 className="mt-1 font-cormorant font-semibold text-[22px] leading-[1.18] text-gz-ink m-0">
          <Link
            href={pub.detailHref}
            className="hover:text-gz-gold transition-colors"
          >
            {pub.title}
          </Link>
        </h3>

        <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid m-0 leading-[1.45]">
          {pub.meta}
        </p>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-light">
            {formatRelative(pub.createdAt)}
          </span>
          {!isActive && (
            <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase px-2 py-[2px] rounded-[3px] bg-gz-ink/85 text-gz-cream">
              Oculta
            </span>
          )}
          {pub.isHidden && (
            <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase px-2 py-[2px] rounded-[3px] bg-gz-burgundy/90 text-gz-cream">
              Moderación
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Link
          href={pub.detailHref}
          className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-mid hover:text-gz-gold transition-colors"
        >
          Ver →
        </Link>
        <button
          type="button"
          onClick={toggleActive}
          disabled={!!busy}
          className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-mid hover:text-gz-ink transition-colors disabled:opacity-50"
        >
          {busy === "toggle" ? "…" : isActive ? "Ocultar" : "Mostrar"}
        </button>
        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(pub)}
            className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-mid hover:text-gz-ink transition-colors cursor-pointer"
          >
            Editar
          </button>
        ) : (
          <Link
            href={pub.editHref}
            className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-mid hover:text-gz-ink transition-colors"
          >
            Editar
          </Link>
        )}
        {confirming ? (
          <span className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={!!busy}
              className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-burgundy hover:underline disabled:opacity-50"
            >
              {busy === "delete" ? "Eliminando…" : "Confirmar"}
            </button>
            <span className="text-gz-ink-light">·</span>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={!!busy}
              className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-ink-light hover:text-gz-ink-mid"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-burgundy/85 hover:text-gz-burgundy transition-colors"
          >
            Eliminar
          </button>
        )}
      </div>
    </article>
  );
}

/** Tiempo relativo en español, simple. */
function formatRelative(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  const w = Math.floor(d / 7);
  if (w < 4) return `Hace ${w} sem`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `Hace ${mo} mes${mo === 1 ? "" : "es"}`;
  const y = Math.floor(d / 365);
  return `Hace ${y} año${y === 1 ? "" : "s"}`;
}
