// ─── PerfilImprenta — bloque del perfil ─────────────────────────
//
// Renderiza producción académica + métricas reputacionales del autor.
// Tres tweaks visuales según `variant` (default | editorial | moderno),
// pero el contenido es idéntico. Sigue la metáfora visual de la
// Trayectoria existente (timeline con dots, header sans-serif uppercase
// tracking ancho, tipografía serif para títulos).

import Link from "next/link";
import type { PerfilImprentaData } from "@/lib/perfil-imprenta";
import { TIPOS_INVESTIGACION_LABELS } from "@/lib/investigaciones-constants";

type Variant = "default" | "editorial" | "moderno";

export function PerfilImprenta({
  userId,
  isOwner,
  data,
  variant,
}: {
  userId: string;
  isOwner: boolean;
  data: PerfilImprentaData;
  variant: Variant;
}) {
  const { metrics, authority, recientes, totalInvestigaciones } = data;
  const isEmpty = totalInvestigaciones === 0;

  // Wrapper visual por variante
  const wrapperCls =
    variant === "editorial"
      ? "relative pt-2 pb-4"
      : variant === "moderno"
        ? "rounded-[3px] border border-gz-rule bg-white p-4"
        : "rounded-[4px] border border-gz-rule bg-gz-cream p-5";

  const headerWrapCls =
    variant === "editorial"
      ? "font-ibm-mono text-[10px] uppercase tracking-[3px] text-gz-ink border-b border-gz-ink pb-1 mb-3 flex items-center justify-between"
      : "flex items-center justify-between mb-4";

  const headerLabelCls =
    variant === "editorial"
      ? ""
      : variant === "moderno"
        ? "font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light"
        : "font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink";

  return (
    <section className={wrapperCls}>
      {/* § decorativo flotante (solo editorial) */}
      {variant === "editorial" && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gz-cream px-2 font-cormorant text-[18px] text-gz-gold italic leading-none">
          §
        </div>
      )}

      {/* Header */}
      <header className={headerWrapCls}>
        <span className={headerLabelCls}>Imprenta del autor</span>
        {!isEmpty && (
          <Link
            href={`/dashboard/diario/investigaciones?authorId=${userId}`}
            className={
              variant === "editorial"
                ? "inline-flex items-center justify-center h-6 w-6 border border-gz-ink text-gz-ink hover:bg-gz-ink hover:text-gz-cream transition-colors cursor-pointer"
                : "inline-flex items-center justify-center h-7 w-7 rounded-full border border-gz-gold text-gz-gold hover:bg-gz-gold hover:text-white transition-all duration-200 cursor-pointer"
            }
            aria-label="Ver todas las investigaciones de este autor"
            title="Ver todas las investigaciones de este autor"
          >
            <span className="font-cormorant text-[14px] leading-none -mt-px">
              →
            </span>
          </Link>
        )}
      </header>

      {/* Estado vacío */}
      {isEmpty ? (
        <div className="py-6 text-center">
          <p className="font-cormorant italic text-[14px] text-gz-ink-light mb-2">
            {isOwner
              ? "Aún no has publicado investigaciones"
              : "Este autor aún no ha publicado investigaciones"}
          </p>
          {isOwner && (
            <Link
              href="/dashboard/diario/investigaciones/nueva"
              className="inline-block font-cormorant italic text-[13px] text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
            >
              Publica tu primera investigación →
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Métricas 2×2 */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <MetricCard
              label="Investigaciones"
              value={metrics.totalInvestigaciones.toString()}
            />
            <MetricCard
              label="Citas recibidas"
              value={metrics.totalCitationsReceived.toString()}
              tooltip={`${metrics.citationsInternal} internas · ${metrics.citationsExternal} externas`}
              hint={
                metrics.totalCitationsReceived > 0
                  ? `${metrics.citationsInternal} int · ${metrics.citationsExternal} ext`
                  : null
              }
            />
            <MetricCard
              label="Índice h"
              value={metrics.hIndex.toString()}
              hint={
                metrics.hIndex > 0
                  ? `${metrics.hIndex} ${
                      metrics.hIndex === 1 ? "trabajo citado" : "trabajos citados"
                    } ${metrics.hIndex}+ veces`
                  : null
              }
            />
            {metrics.obraMasCitada ? (
              <MetricCardLink
                label="Obra más citada"
                title={metrics.obraMasCitada.titulo}
                hint={`${metrics.obraMasCitada.citas} ${
                  metrics.obraMasCitada.citas === 1 ? "cita" : "citas"
                }`}
                href={`/dashboard/diario/investigaciones/${metrics.obraMasCitada.id}`}
              />
            ) : (
              <MetricCard label="Obra más citada" value="—" />
            )}
          </div>

          {/* Áreas de autoridad */}
          {authority.length > 0 && authority[0].citas > 0 && (
            <div className="mb-5">
              <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-3">
                Áreas de autoridad
              </h3>
              <ol className="relative border-l-2 border-gz-rule pl-4 space-y-2.5">
                {authority.map((a) => (
                  <li key={a.institucionId} className="relative">
                    <span className="absolute -left-[6px] top-[6px] w-[10px] h-[10px] rounded-full border-2 border-gz-cream bg-gz-gold" />
                    <p className="font-cormorant text-[15px] font-medium leading-tight text-gz-ink">
                      {a.institucionNombre}
                    </p>
                    <p className="font-archivo italic text-[11px] text-gz-ink-mid mt-0.5">
                      {a.citas} {a.citas === 1 ? "cita" : "citas"} ·{" "}
                      {a.trabajos}{" "}
                      {a.trabajos === 1 ? "trabajo" : "trabajos"}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Recientes */}
          <div>
            <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-3">
              Recientes
            </h3>
            <ol className="relative border-l-2 border-gz-rule pl-4 space-y-3">
              {recientes.map((r) => (
                <li key={r.id} className="relative group/r">
                  <span className="absolute -left-[6px] top-[6px] w-[10px] h-[10px] rounded-full border-2 border-gz-cream bg-gz-gold" />
                  <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
                    {new Date(r.publishedAt).getFullYear()}
                  </div>
                  <Link
                    href={`/dashboard/diario/investigaciones/${r.id}`}
                    className="block font-cormorant text-[15px] font-medium leading-tight text-gz-ink hover:text-gz-gold transition-colors cursor-pointer mt-0.5"
                  >
                    {r.titulo}
                  </Link>
                  <p className="font-archivo italic text-[11px] text-gz-ink-mid mt-0.5">
                    {TIPOS_INVESTIGACION_LABELS[
                      r.tipo as keyof typeof TIPOS_INVESTIGACION_LABELS
                    ] ?? r.tipo}
                    {r.citationsTotal > 0 && (
                      <>
                        {" · "}
                        <span className="text-gz-gold not-italic">
                          Citado {r.citationsTotal}{" "}
                          {r.citationsTotal === 1 ? "vez" : "veces"}
                        </span>
                      </>
                    )}
                  </p>
                </li>
              ))}
            </ol>

            {totalInvestigaciones > 3 && (
              <Link
                href={`/dashboard/diario/investigaciones?authorId=${userId}`}
                className="block mt-4 text-center font-cormorant italic text-[13px] text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
              >
                Ver las {totalInvestigaciones} investigaciones →
              </Link>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tooltip,
}: {
  label: string;
  value: string;
  hint?: string | null;
  tooltip?: string;
}) {
  return (
    <div title={tooltip}>
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
        {label}
      </p>
      <p className="font-cormorant text-[26px] font-medium leading-none text-gz-ink tabular-nums">
        {value}
      </p>
      {hint && (
        <p className="font-archivo italic text-[10.5px] text-gz-ink-mid mt-1 leading-tight">
          {hint}
        </p>
      )}
    </div>
  );
}

function MetricCardLink({
  label,
  title,
  hint,
  href,
}: {
  label: string;
  title: string;
  hint: string;
  href: string;
}) {
  return (
    <Link href={href} className="group cursor-pointer block">
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
        {label}
      </p>
      <p className="font-cormorant text-[14px] font-medium leading-tight text-gz-ink group-hover:text-gz-gold transition-colors line-clamp-2">
        {title}
      </p>
      <p className="font-archivo italic text-[10.5px] text-gz-gold mt-1">
        {hint}
      </p>
    </Link>
  );
}
