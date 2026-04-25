"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MastheadAcademia } from "@/components/academia/masthead-academia";
import {
  FilterShellAcademia,
  SegmentedControlAcademia,
  FilterChipAcademia,
  SortSelectAcademia,
} from "@/components/academia/filter-row-academia";
import { EmptyStateAcademia } from "@/components/academia/empty-state-academia";
import {
  expedienteSplitGradient,
  expedienteEstadoLabel,
  ramaLabel,
} from "@/lib/academia-helpers";

// ─── Types ──────────────────────────────────────────────────

interface ExpedienteSummary {
  id: string;
  numero: number;
  titulo: string;
  rama: string;
  materias: string | null;
  estado: string;
  bandoDemandante: string;
  bandoDemandado: string;
  fechaApertura: string;
  fechaCierre: string;
  totalArgumentos: number;
  demandanteCount: number;
  demandadoCount: number;
  mejorAlegato: {
    authorName: string;
    authorAvatar: string | null;
    votos: number;
  } | null;
}

const RAMAS_EXPEDIENTE = [
  { value: "civil", label: "Civil", glyph: "§" },
  { value: "penal", label: "Penal", glyph: "¶" },
  { value: "constitucional", label: "Constitucional", glyph: "‡" },
  { value: "administrativo", label: "Administrativo", glyph: "Ⓞ" },
  { value: "laboral", label: "Laboral", glyph: "⚖" },
  { value: "comercial", label: "Comercial", glyph: "ℛ" },
  { value: "procesal", label: "Procesal", glyph: "†" },
  { value: "tributario", label: "Tributario", glyph: "℥" },
  { value: "internacional", label: "Internacional", glyph: "∴" },
  { value: "ambiental", label: "Ambiental", glyph: "※" },
  { value: "familia", label: "Familia", glyph: "⸸" },
] as const;

type EstadoFilter = "TODOS" | "ABIERTOS" | "CERRADOS";
type Sort = "recientes" | "participacion" | "cierre";

// ─── Component ──────────────────────────────────────────────

export function ExpedientesV4Client({
  expedientes,
}: {
  expedientes: ExpedienteSummary[];
}) {
  const [query, setQuery] = useState("");
  const [rama, setRama] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFilter>("TODOS");
  const [sort, setSort] = useState<Sort>("recientes");

  const counts = useMemo(() => {
    const abiertos = expedientes.filter((e) => e.estado === "abierto").length;
    return {
      todos: expedientes.length,
      abiertos,
      cerrados: expedientes.length - abiertos,
    };
  }, [expedientes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = expedientes.filter((e) => {
      if (rama && e.rama !== rama) return false;
      if (estado === "ABIERTOS" && e.estado !== "abierto") return false;
      if (estado === "CERRADOS" && e.estado === "abierto") return false;
      if (q) {
        const hay = `${e.titulo} ${e.materias ?? ""} N° ${e.numero}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "participacion") {
      list = [...list].sort(
        (a, b) =>
          b.totalArgumentos - a.totalArgumentos ||
          new Date(b.fechaApertura).getTime() -
            new Date(a.fechaApertura).getTime(),
      );
    } else if (sort === "cierre") {
      list = [...list].sort(
        (a, b) =>
          new Date(a.fechaCierre).getTime() -
          new Date(b.fechaCierre).getTime(),
      );
    } else {
      // recientes
      list = [...list].sort(
        (a, b) =>
          new Date(b.fechaApertura).getTime() -
          new Date(a.fechaApertura).getTime(),
      );
    }
    return list;
  }, [expedientes, query, rama, estado, sort]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/diario" className="hover:text-gz-gold transition-colors">
          ← Publicaciones
        </Link>
        <Link
          href="/dashboard/diario/expediente/proponer"
          className="px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
        >
          Proponer caso →
        </Link>
      </div>

      <MastheadAcademia
        seccion="Expediente Abierto"
        glyph="†"
        subtitulo="Casos jurídicos abiertos para alegar en bandos — demandante y demandado"
        resultCount={filtered.length}
        resultLabel="expedientes"
      />

      <FilterShellAcademia
        searchLabel="Buscar por número, título o materia"
        searchPlaceholder="ej. responsabilidad médica, expediente 14…"
        query={query}
        onQueryChange={setQuery}
        segmentedSlot={
          <SegmentedControlAcademia<EstadoFilter>
            value={estado}
            onChange={setEstado}
            options={[
              { value: "TODOS", label: "Todos", count: counts.todos },
              { value: "ABIERTOS", label: "Abiertos", count: counts.abiertos },
              { value: "CERRADOS", label: "Cerrados", count: counts.cerrados },
            ]}
          />
        }
        chipsSlot={
          <>
            <FilterChipAcademia
              active={rama === null}
              onClick={() => setRama(null)}
              label="Toda rama"
            />
            {RAMAS_EXPEDIENTE.map((r) => (
              <FilterChipAcademia
                key={r.value}
                active={rama === r.value}
                onClick={() => setRama(r.value)}
                label={r.label}
                glyph={r.glyph}
              />
            ))}
          </>
        }
        sortSlot={
          <SortSelectAcademia<Sort>
            value={sort}
            onChange={setSort}
            options={[
              { value: "recientes", label: "Más recientes" },
              { value: "participacion", label: "Más participación" },
              { value: "cierre", label: "Cierre próximo" },
            ]}
          />
        }
      />

      <main className="max-w-[1400px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          expedientes.length === 0 ? (
            <EmptyStateAcademia
              glyph="†"
              titulo="Aún no hay expedientes publicados."
              descripcion="Vuelve pronto o propone tú un caso para que la comunidad lo debata en bandos demandante y demandado."
              ctaLabel="Proponer un caso"
              ctaHref="/dashboard/diario/expediente/proponer"
            />
          ) : (
            <EmptyStateAcademia
              glyph="†"
              titulo="No hay expedientes con esos filtros."
              descripcion="Prueba quitando filtros, cambiando el estado o ampliando a otra rama."
            />
          )
        ) : (
          <div
            className="grid gap-0 border-t border-l border-gz-rule bg-white"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))" }}
          >
            {filtered.map((exp) => (
              <ExpedienteTile key={exp.id} exp={exp} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Tile ─────────────────────────────────────────────────

function ExpedienteTile({ exp }: { exp: ExpedienteSummary }) {
  const split = expedienteSplitGradient(exp.rama);
  const isOpen = exp.estado === "abierto";
  const total = exp.demandanteCount + exp.demandadoCount;
  const demPct = total > 0 ? Math.round((exp.demandanteCount / total) * 100) : 50;
  const fechaCierre = new Date(exp.fechaCierre);

  return (
    <article
      className="relative flex flex-col bg-white cursor-pointer
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                 group"
    >
      <Link
        href={`/dashboard/diario/expediente/${exp.id}`}
        aria-label={`Abrir expediente Nº ${exp.numero}: ${exp.titulo}`}
        className="absolute inset-0 z-[1] overflow-hidden text-[0]"
      >
        Ver expediente
      </Link>

      {/* Cover split demandante / demandado */}
      <div className="relative aspect-[16/9] overflow-hidden border-b border-gz-rule flex">
        <div className="flex-1 relative" style={{ background: split.demandante }}>
          <span className="absolute bottom-2.5 left-3 font-ibm-mono text-[9px] tracking-[1.2px] uppercase text-gz-cream/88">
            {exp.bandoDemandante}
          </span>
        </div>
        <div className="flex-1 relative" style={{ background: split.demandado }}>
          <span className="absolute bottom-2.5 right-3 font-ibm-mono text-[9px] tracking-[1.2px] uppercase text-gz-cream/88">
            {exp.bandoDemandado}
          </span>
        </div>

        {/* Top labels */}
        <span className="absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-ink/90 text-gz-cream font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
          Expediente N° {exp.numero}
        </span>
        <span
          className={`absolute top-3 right-3 z-[2] px-2.5 py-1 rounded-[3px] font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium ${
            isOpen
              ? "bg-gz-gold text-gz-ink"
              : "bg-gz-cream/90 text-gz-ink-mid border border-gz-rule"
          }`}
        >
          {expedienteEstadoLabel(exp.estado)}
        </span>

        {/* Glifo de balanza centrado */}
        <span
          className="absolute inset-0 flex items-center justify-center font-cormorant italic text-[68px] text-gz-cream/95 z-[1] select-none transition-transform duration-200 group-hover:scale-[1.05]"
          style={{ textShadow: "0 2px 14px rgba(28,24,20,0.32)" }}
          aria-hidden
        >
          ⚖
        </span>
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1 relative">
        <span className="font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium text-gz-ink-mid">
          {ramaLabel(exp.rama)}
          {isOpen && (
            <>
              {" · "}
              <CountdownInline target={fechaCierre} />
            </>
          )}
        </span>

        <h3 className="font-cormorant font-semibold text-[20px] leading-[1.18] text-gz-ink m-0">
          {exp.titulo}
        </h3>

        <div className="h-px w-10 bg-gz-gold mb-1" />

        {exp.materias && (
          <p className="font-cormorant italic text-[13px] text-gz-ink-mid m-0 line-clamp-2">
            {exp.materias}
          </p>
        )}

        {/* Bando split bar */}
        {total > 0 && (
          <div className="mt-1 space-y-1">
            <div className="flex h-[6px] w-full overflow-hidden rounded-full">
              <div className="bg-gz-gold transition-all" style={{ width: `${demPct}%` }} />
              <div className="bg-gz-burgundy transition-all" style={{ width: `${100 - demPct}%` }} />
            </div>
            <div className="flex justify-between font-ibm-mono text-[9px] text-gz-ink-light">
              <span>
                {exp.bandoDemandante} {demPct}% ({exp.demandanteCount})
              </span>
              <span>
                ({exp.demandadoCount}) {100 - demPct}% {exp.bandoDemandado}
              </span>
            </div>
          </div>
        )}

        {/* Mejor alegato (sólo cerrados) */}
        {!isOpen && exp.mejorAlegato && (
          <div className="mt-1 px-3 py-2 bg-gz-cream/60 border border-gz-rule rounded-[3px]">
            <p className="font-ibm-mono text-[8.5px] tracking-[1.4px] uppercase text-gz-gold m-0">
              Mejor alegato
            </p>
            <p className="font-cormorant text-[14px] text-gz-ink m-0 mt-0.5">
              {exp.mejorAlegato.authorName}{" "}
              <span className="font-archivo text-[11px] text-gz-ink-light">
                · {exp.mejorAlegato.votos} voto{exp.mejorAlegato.votos === 1 ? "" : "s"}
              </span>
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span className="font-cormorant italic text-[13px] text-gz-ink-mid">
            {exp.totalArgumentos} argumento{exp.totalArgumentos === 1 ? "" : "s"}
          </span>
          <span className="relative z-[2] px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] group-hover:bg-gz-ink group-hover:text-gz-cream transition">
            {isOpen ? "Alegar →" : "Ver expediente →"}
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Countdown inline (compacto, sin segundos) ─────────────

function CountdownInline({ target }: { target: Date }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = target.getTime() - now;
  if (diff <= 0) return <span className="text-gz-burgundy">Plazo vencido</span>;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return <span>Cierra en {days}d {hours}h</span>;
  const minutes = Math.floor((diff % 3600000) / 60000);
  return (
    <span>
      Cierra en {hours}h {minutes}m
    </span>
  );
}
