"use client";

import Link from "next/link";
import { RAMA_LABELS, LIBRO_LABELS, TITULO_LABELS } from "@/lib/curriculum-data";

interface FilterBreadcrumbProps {
  rama?: string;
  libro?: string;
  titulo?: string;
}

export function FilterBreadcrumb({ rama, libro, titulo }: FilterBreadcrumbProps) {
  if (!rama) return null;

  const ramaLabel = RAMA_LABELS[rama] ?? rama.replace(/_/g, " ");
  const libroLabel = libro ? (LIBRO_LABELS[libro] ?? libro) : null;
  const tituloLabel = titulo ? (TITULO_LABELS[titulo] ?? titulo) : null;

  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="font-ibm-mono text-[11px] text-gz-ink-light tracking-wide uppercase">
        <span>{ramaLabel}</span>
        {libroLabel && (
          <>
            <span className="mx-1.5 text-gz-rule">›</span>
            <span>{libroLabel.length > 30 ? libroLabel.slice(0, 28) + "…" : libroLabel}</span>
          </>
        )}
        {tituloLabel && (
          <>
            <span className="mx-1.5 text-gz-rule">›</span>
            <span className="text-gz-gold">{tituloLabel.length > 35 ? tituloLabel.slice(0, 33) + "…" : tituloLabel}</span>
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
