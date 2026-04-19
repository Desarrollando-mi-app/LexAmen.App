"use client";

/**
 * StudyPoolToggle — selector segmentado "Por título | Integradores"
 * ─────────────────────────────────────────────────────────────────
 * Mantiene el estado en la URL (`?pool=integradores` o ausente = normal)
 * para que el Server Component de cada módulo filtre prisma al render inicial.
 *
 * Uso típico (dentro de cada page.tsx de módulo):
 *
 *   const pool = resolveStudyPool(searchParams.pool);
 *   <StudyPoolToggle currentPool={pool} integradoresCount={N} />
 *
 * Nota: usamos `pool` (no `mode`) porque varios viewers ya tienen su propio
 * `mode` interno (ej: flashcards mode=ALL|FAVORITES|PENDING).
 *
 * Patrón: al cambiar pool, reseteamos filtros de título/párrafo/libro porque
 * el pool de ejercicios cambia y los filtros ya no son compatibles.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export type StudyPool = "normal" | "integradores";

interface Props {
  currentPool: StudyPool;
  /** Si true, oculta el toggle cuando no hay integradores en ese módulo. */
  hideIfNoIntegradores?: boolean;
  integradoresCount?: number;
}

export function StudyPoolToggle({ currentPool, hideIfNoIntegradores = false, integradoresCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  if (hideIfNoIntegradores && integradoresCount === 0) return null;

  const setPool = (pool: StudyPool) => {
    if (pool === currentPool) return;
    const next = new URLSearchParams(searchParams.toString());
    if (pool === "integradores") next.set("pool", "integradores");
    else next.delete("pool");
    // Reset filtros granulares porque el pool cambia
    next.delete("titulo");
    next.delete("parrafo");
    next.delete("libro");
    const qs = next.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  return (
    <div
      role="radiogroup"
      aria-label="Modo de estudio"
      className={`inline-flex items-stretch rounded-[3px] border border-gz-rule bg-gz-cream overflow-hidden ${isPending ? "opacity-60" : ""}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentPool === "normal"}
        onClick={() => setPool("normal")}
        disabled={isPending}
        className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-4 py-2 transition-colors cursor-pointer ${
          currentPool === "normal"
            ? "bg-gz-ink text-gz-cream"
            : "text-gz-ink-mid hover:bg-gz-cream-dark/40"
        }`}
      >
        Por título
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentPool === "integradores"}
        onClick={() => setPool("integradores")}
        disabled={isPending}
        className={`font-ibm-mono text-[10px] uppercase tracking-[2px] px-4 py-2 border-l border-gz-rule transition-colors cursor-pointer ${
          currentPool === "integradores"
            ? "bg-gz-ink text-gz-cream"
            : "text-gz-ink-mid hover:bg-gz-cream-dark/40"
        }`}
      >
        Integradores
        {typeof integradoresCount === "number" && integradoresCount > 0 && (
          <span
            className={`ml-1.5 ${
              currentPool === "integradores" ? "text-gz-gold" : "text-gz-ink-light"
            }`}
          >
            · {integradoresCount}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Normaliza el searchParam "pool" a uno de los dos valores válidos.
 * Cualquier valor inesperado colapsa a "normal".
 */
export function resolveStudyPool(raw: string | string[] | undefined): StudyPool {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "integradores" ? "integradores" : "normal";
}
