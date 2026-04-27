// ─── InvArticulo — Cuerpo del detalle ────────────────────────
//
// Renderiza la investigación completa: art-flag, título, deck, byline
// (con sello del autor + nombre + universidad + etapa en CASTELLANO,
// no "Estado II"), strip de meta, resumen amarillo con barra ocre
// lateral, tags pills, y el cuerpo HTML del editor (capitulares y
// secciones romanas via CSS counters de globals.css).

import Link from "next/link";
import {
  TIPOS_INVESTIGACION_LABELS,
  AREAS_DERECHO_LABELS_CORTOS,
} from "@/lib/investigaciones-constants";
import type { InvSerializedFull } from "@/lib/investigaciones";

export function InvArticulo({
  investigacion,
}: {
  investigacion: InvSerializedFull;
}) {
  const { user } = investigacion;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const tipoLabel =
    TIPOS_INVESTIGACION_LABELS[
      investigacion.tipo as keyof typeof TIPOS_INVESTIGACION_LABELS
    ] ?? investigacion.tipo;
  const areaLabel =
    AREAS_DERECHO_LABELS_CORTOS[
      investigacion.area as keyof typeof AREAS_DERECHO_LABELS_CORTOS
    ] ?? investigacion.area;
  const fechaLarga = new Date(investigacion.publishedAt).toLocaleDateString(
    "es-CL",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
  const lecturaMin = Math.max(1, Math.ceil(investigacion.wordCount / 250));

  return (
    <article className="inv-articulo max-w-[720px]">
      {/* Flag editorial */}
      <div className="font-cormorant italic text-[13px] text-inv-ocre tracking-[3px] uppercase mb-3.5">
        <span className="not-italic">— </span>
        {tipoLabel} · {areaLabel}
        <span className="not-italic"> —</span>
      </div>

      {/* Título */}
      <h1 className="font-cormorant text-[36px] sm:text-[44px] lg:text-[48px] font-medium leading-[1.08] mb-5 tracking-[-1px] text-inv-ink">
        {investigacion.titulo}
      </h1>

      {/* Deck (bajada) */}
      {investigacion.deck && (
        <p className="font-cormorant italic text-[18px] leading-[1.5] text-inv-ink-2 mb-6 pb-6 border-b border-inv-rule">
          {investigacion.deck}
        </p>
      )}

      {/* Byline */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b-[3px] border-double border-inv-ink">
        <Link
          href={`/dashboard/perfil/${user.id}`}
          className="inv-sello shrink-0"
          style={{ width: 52, height: 52, fontSize: 18 }}
        >
          {user.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={user.avatarUrl}
              alt=""
              className="rounded-full object-cover absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
            />
          ) : (
            <span>{initials}</span>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <div className="font-cormorant italic text-[13px] text-inv-ink-3 mb-0.5">
            por
          </div>
          <Link
            href={`/dashboard/perfil/${user.id}`}
            className="font-cormorant text-[19px] font-medium text-inv-ink hover:text-inv-ocre transition-colors cursor-pointer"
          >
            {user.firstName} {user.lastName}
          </Link>
          <div className="font-crimson-pro italic text-[13px] text-inv-ink-3 mt-0.5">
            {user.universidad && <span>{user.universidad}</span>}
            {user.etapaActual && (
              <>
                {user.universidad && " · "}
                <em>{capitalize(user.etapaActual)}</em>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Meta strip */}
      <div className="flex gap-x-6 gap-y-3 mb-8 pb-5 border-b border-inv-rule-2 flex-wrap font-crimson-pro text-[12px] text-inv-ink-3 tracking-[1px] uppercase">
        <div>
          <span className="font-cormorant italic text-inv-ink-4 block mb-1 normal-case tracking-normal text-[12px]">
            Publicado
          </span>
          <span className="font-cormorant text-[14px] text-inv-ink font-medium normal-case tracking-normal">
            {fechaLarga}
          </span>
        </div>
        <div>
          <span className="font-cormorant italic text-inv-ink-4 block mb-1 normal-case tracking-normal text-[12px]">
            Extensión
          </span>
          <span className="font-cormorant text-[14px] text-inv-ink font-medium normal-case tracking-normal">
            {investigacion.wordCount.toLocaleString("es-CL")} palabras
          </span>
        </div>
        <div>
          <span className="font-cormorant italic text-inv-ink-4 block mb-1 normal-case tracking-normal text-[12px]">
            Lecturas
          </span>
          <span className="font-cormorant text-[14px] text-inv-ink font-medium normal-case tracking-normal">
            {investigacion.views.toLocaleString("es-CL")}
          </span>
        </div>
        <div>
          <span className="font-cormorant italic text-inv-ink-4 block mb-1 normal-case tracking-normal text-[12px]">
            Lectura estimada
          </span>
          <span className="font-cormorant text-[14px] text-inv-ink font-medium normal-case tracking-normal">
            {lecturaMin} min
          </span>
        </div>
      </div>

      {/* Resumen — bloque amarillo con borde ocre */}
      <div className="bg-inv-paper-2 border-l-[3px] border-inv-ocre p-6 mb-9">
        <div className="font-cormorant italic text-[13px] tracking-[3px] uppercase text-inv-ocre mb-2.5">
          — Resumen —
        </div>
        <p className="font-cormorant italic text-[18px] leading-[1.6] text-inv-ink">
          {investigacion.abstract}
        </p>
      </div>

      {/* Tags — placeholder en sprint 1 (instituciones se mostrarán como pills) */}
      {/* Las instituciones jurídicas se muestran en el aside (sprint 2 mejora aquí) */}

      {/* Cuerpo */}
      <div
        className="art-body font-crimson-pro text-[16px] sm:text-[17px] leading-[1.75] text-inv-ink"
        dangerouslySetInnerHTML={{ __html: investigacion.contenido }}
      />
    </article>
  );
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

// ─── InvBibliografia (placeholder Sprint 1) ─────────────────
// La bibliografía se mostrará en sprint 2 cuando el editor TipTap
// inserte las citas y las externas. Por ahora, si el campo
// `bibliografiaExterna` viene poblado con un array, se renderiza.

export function InvBibliografia({
  data,
}: {
  data: unknown;
}) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  type Bib = {
    autor?: string;
    titulo?: string;
    año?: number;
    fuente?: string;
    url?: string;
  };
  const items = data as Bib[];

  return (
    <div className="bibliografia mt-12 mb-9 px-7 py-7 bg-inv-paper-2 border-y-[3px] border-double border-inv-ink">
      <h3 className="font-cormorant text-[24px] sm:text-[26px] font-medium mb-1.5 tracking-[-0.3px] text-inv-ink">
        — Referencias —
      </h3>
      <p className="font-cormorant italic text-[13px] text-inv-ink-3 mb-5 pb-3.5 border-b border-inv-rule-2">
        {items.length} {items.length === 1 ? "fuente citada" : "fuentes citadas"}.
      </p>
      <ul className="list-none">
        {items.map((it, i) => (
          <li
            key={i}
            className="font-crimson-pro text-[15px] leading-[1.55] py-3 border-b border-inv-rule-2 last:border-b-0 grid grid-cols-[28px_1fr] gap-3.5 items-start"
          >
            <span className="font-cormorant italic text-[18px] text-inv-ocre font-medium text-right">
              {i + 1}.
            </span>
            <div className="text-inv-ink">
              {it.autor && <span>{it.autor} </span>}
              {it.año && <span>({it.año}). </span>}
              {it.titulo && (
                <em className="font-cormorant text-[16px]">{it.titulo}</em>
              )}
              {it.fuente && <span>. {it.fuente}</span>}
              {it.url && (
                <span className="ml-1.5 text-inv-ocre">
                  ·{" "}
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-b border-inv-ocre/40 hover:border-inv-ocre cursor-pointer"
                  >
                    URL
                  </a>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
