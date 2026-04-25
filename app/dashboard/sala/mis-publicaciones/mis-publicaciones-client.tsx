"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  KIND_LABELS,
  type Publication,
  type PublicationKind,
} from "@/lib/mis-publicaciones-helpers";
import { PublicacionRow } from "@/components/sala/publicacion-row";

type FilterKind = "TODAS" | PublicationKind;
type FilterEstado = "ACTIVAS" | "OCULTAS" | "TODAS";

interface MisPublicacionesClientProps {
  publications: Publication[];
  initialKind?: FilterKind;
}

export function MisPublicacionesClient({
  publications,
  initialKind = "TODAS",
}: MisPublicacionesClientProps) {
  const [filterKind, setFilterKind] = useState<FilterKind>(initialKind);
  const [filterEstado, setFilterEstado] = useState<FilterEstado>("ACTIVAS");
  const [query, setQuery] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const counts = useMemo(() => {
    return {
      total: publications.length,
      ayudantia: publications.filter((p) => p.kind === "ayudantia").length,
      pasantia: publications.filter((p) => p.kind === "pasantia").length,
      oferta: publications.filter((p) => p.kind === "oferta").length,
      activas: publications.filter((p) => p.isActive).length,
      ocultas: publications.filter((p) => !p.isActive).length,
    };
  }, [publications]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return publications.filter((p) => {
      if (removed.has(p.id)) return false;
      if (filterKind !== "TODAS" && p.kind !== filterKind) return false;
      if (filterEstado === "ACTIVAS" && !p.isActive) return false;
      if (filterEstado === "OCULTAS" && p.isActive) return false;
      if (q) {
        const hay =
          `${p.title} ${p.eyebrow} ${p.meta} ${KIND_LABELS[p.kind]}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publications, filterKind, filterEstado, query, removed]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      {/* Migaja */}
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/sala" className="hover:text-gz-gold transition-colors">
          ← La Sala
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/sala/ayudantias"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Ayudantías
          </Link>
          <Link
            href="/dashboard/sala/pasantias"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Pasantías
          </Link>
          <Link
            href="/dashboard/sala/ofertas"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Ofertas
          </Link>
        </nav>
      </div>

      {/* Masthead editorial */}
      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-5 border-b border-gz-ink">
        <div className="flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
          <span>Studio Iuris · Sala</span>
          <span>Tus publicaciones</span>
        </div>
        <div className="mt-3 flex items-end justify-between flex-wrap gap-4">
          <h1 className="font-cormorant font-semibold text-[52px] leading-[1.02] tracking-[-1.5px] text-gz-ink m-0">
            <span className="text-gz-gold italic font-medium mr-2">¶</span>
            Mis publicaciones
          </h1>
          <p className="font-cormorant italic text-[18px] text-gz-ink-mid m-0 max-w-md">
            Todo lo que has publicado en La Sala —
            <span className="text-gz-ink"> {counts.total} en total</span>,
            {" "}{counts.activas} activa{counts.activas === 1 ? "" : "s"}.
          </p>
        </div>
      </header>

      {/* Filtros */}
      <div className="max-w-[1100px] mx-auto px-7 pt-6">
        {/* Search + estado */}
        <div className="flex items-stretch gap-3 max-w-3xl mx-auto">
          <div className="flex-1 flex items-stretch bg-white border border-gz-rule rounded-[4px] overflow-hidden shadow-sm">
            <div className="flex-1 flex flex-col justify-center px-5 py-3">
              <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light">
                Buscar entre tus publicaciones
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ej. obligaciones, junior, pasantía verano…"
                className="font-archivo text-[14px] text-gz-ink bg-transparent border-none outline-none placeholder:text-gz-ink-light/60 py-0.5"
              />
            </div>
          </div>
        </div>

        {/* Tabs por kind */}
        <div className="mt-6 overflow-x-auto">
          <div className="flex gap-0 border-y border-gz-rule min-w-max">
            <KindTab
              active={filterKind === "TODAS"}
              onClick={() => setFilterKind("TODAS")}
              glyph="∗"
              label="Todas"
              count={counts.total}
            />
            <KindTab
              active={filterKind === "ayudantia"}
              onClick={() => setFilterKind("ayudantia")}
              glyph="§"
              label="Ayudantías"
              count={counts.ayudantia}
            />
            <KindTab
              active={filterKind === "pasantia"}
              onClick={() => setFilterKind("pasantia")}
              glyph="¶"
              label="Pasantías"
              count={counts.pasantia}
            />
            <KindTab
              active={filterKind === "oferta"}
              onClick={() => setFilterKind("oferta")}
              glyph="⚖"
              label="Ofertas"
              count={counts.oferta}
            />
          </div>
        </div>

        {/* Filtro de estado */}
        <div className="flex justify-between items-center gap-3 py-4 border-b border-gz-rule flex-wrap">
          <div className="flex gap-2">
            {(["ACTIVAS", "OCULTAS", "TODAS"] as const).map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setFilterEstado(e)}
                className={`px-3.5 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition
                           ${filterEstado === e
                             ? "bg-gz-ink text-gz-cream border-gz-ink"
                             : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
              >
                {e === "ACTIVAS"
                  ? `Activas (${counts.activas})`
                  : e === "OCULTAS"
                    ? `Ocultas (${counts.ocultas})`
                    : `Todas (${counts.total})`}
              </button>
            ))}
          </div>
          <span className="font-cormorant italic text-[14px] text-gz-ink-mid">
            {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {/* Lista */}
      <main className="max-w-[1100px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="border-t border-gz-rule bg-white">
            {filtered.map((pub) => (
              <PublicacionRow
                key={`${pub.kind}-${pub.id}`}
                pub={pub}
                onDeleted={(id) => {
                  setRemoved((prev) => new Set(prev).add(id));
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  glyph,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  glyph: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 border-r border-gz-rule last:border-r-0
                 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase transition whitespace-nowrap cursor-pointer
                 ${active
                   ? "bg-gz-ink text-gz-cream"
                   : "text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"}`}
    >
      <span
        className={`font-cormorant text-[16px] italic ${active ? "text-gz-gold-bright" : "text-gz-gold"}`}
      >
        {glyph}
      </span>
      {label}
      <span
        className={`font-archivo text-[10px] ${active ? "text-gz-cream/70" : "text-gz-ink-light"}`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="py-24 text-center border border-gz-rule bg-white">
      <p className="font-cormorant italic text-[22px] text-gz-ink-mid">
        {query
          ? "No hay publicaciones que coincidan con tu búsqueda."
          : "Aún no has publicado nada en La Sala."}
      </p>
      <p className="mt-2 font-archivo text-[13px] text-gz-ink-light">
        {query ? (
          "Prueba con otro término o cambia el filtro."
        ) : (
          <>
            Empieza por publicar una ayudantía, una pasantía o una oferta laboral
            desde el listado correspondiente.
          </>
        )}
      </p>
    </div>
  );
}
