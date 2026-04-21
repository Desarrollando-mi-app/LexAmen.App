"use client";

import Link from "next/link";
import { RAMA_LABELS, LIBRO_LABELS, TITULO_LABELS, getParrafoLabel } from "@/lib/curriculum-data";

interface FilterBreadcrumbProps {
  rama?: string;
  libro?: string;
  titulo?: string;
  parrafo?: string;
}

/** Trunca manteniendo legibilidad en una sola línea. */
function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 2) + "…" : s;
}

export function FilterBreadcrumb({ rama, libro, titulo, parrafo }: FilterBreadcrumbProps) {
  if (!rama) return null;

  const ramaLabel = RAMA_LABELS[rama] ?? rama.replace(/_/g, " ");
  const libroLabel = libro ? (LIBRO_LABELS[libro] ?? libro) : null;
  const tituloLabel = titulo ? (TITULO_LABELS[titulo] ?? titulo) : null;
  // Cuando hay párrafo, el título deja de ser el "final" y el párrafo toma el color acento.
  const parrafoLabel = parrafo ? getParrafoLabel(parrafo) : null;

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="font-ibm-mono text-[11px] text-gz-ink-light tracking-wide uppercase">
        <span>{ramaLabel}</span>
        {libroLabel && (
          <>
            <span className="mx-1.5 text-gz-rule">›</span>
            <span>{truncate(libroLabel, 30)}</span>
          </>
        )}
        {tituloLabel && (
          <>
            <span className="mx-1.5 text-gz-rule">›</span>
            <span className={parrafoLabel ? "" : "text-gz-gold"}>
              {truncate(tituloLabel, 35)}
            </span>
          </>
        )}
        {parrafoLabel && (
          <>
            <span className="mx-1.5 text-gz-rule">›</span>
            <span className="text-gz-gold">{truncate(parrafoLabel, 50)}</span>
          </>
        )}
      </div>
      <Link
        href="/dashboard/indice-maestro"
        className="font-archivo text-[12px] text-gz-ink-light hover:text-gz-gold transition-colors"
      >
        ← Volver al Índice
      </Link>
    </div>
  );
}
