import Link from "next/link";
import type { StudyPool } from "./study-mode-toggle.utils";

/**
 * Indicador discreto cuando el usuario está navegando el pool de integradores.
 * Muestra un back-link a /dashboard/integradores + nota en cursiva.
 *
 * Renderiza `null` cuando pool !== "integradores", por lo que puede insertarse
 * donde estaba el `StudyPoolToggle` sin dejar contenedores vacíos.
 *
 * `className` permite añadir padding/margin específico de cada página al wrapper
 * (e.g. `px-4 sm:px-6 pt-4` en páginas full-bleed, `mt-4` dentro de gz-section-header).
 */
export function PoolIndicator({
  pool,
  className = "",
}: {
  pool: StudyPool;
  className?: string;
}) {
  if (pool !== "integradores") return null;

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`.trim()}>
      <Link
        href="/dashboard/integradores"
        className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid hover:text-gz-gold transition-colors"
      >
        ← Ejercicios Integradores
      </Link>
      <span className="font-cormorant italic text-sm text-gz-ink-mid">
        Mostrando ejercicios integradores.
      </span>
    </div>
  );
}
