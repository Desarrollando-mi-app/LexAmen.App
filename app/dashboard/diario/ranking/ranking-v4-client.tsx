"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  RANKING_TIPOS,
  RANKING_TIPO_LABELS,
  type AutorStats,
  type RankingTipo,
} from "@/lib/diario-ranking";
import { MastheadAcademia } from "@/components/academia/masthead-academia";
import {
  FilterShellAcademia,
  SegmentedControlAcademia,
  FilterChipAcademia,
  SortSelectAcademia,
} from "@/components/academia/filter-row-academia";
import { EmptyStateAcademia } from "@/components/academia/empty-state-academia";
import {
  rankingPeriodoLabel,
  userInitials,
  toRoman,
  type RankingPeriodo,
} from "@/lib/academia-helpers";

// ─── Types ──────────────────────────────────────────────────

interface RankingEntry {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado: number;
  gradoEmoji: string;
  gradoNombre: string;
  score: number;
  desglose: AutorStats;
  totalPublicaciones: number;
}

interface RankingResponse {
  ranking: RankingEntry[];
  total: number;
  miPosicion?: number;
  periodo: string;
}

// ─── Score desglose labels ──────────────────────────────────

const DESGLOSE_LABELS: { key: keyof AutorStats; label: string; pts: number }[] = [
  // Publicaciones — orden por jerarquía editorial (de menor a mayor esfuerzo)
  { key: "obiters", label: "Obiter Dictum", pts: 1 },
  { key: "argumentosExpediente", label: "Argumentos Expediente", pts: 3 },
  { key: "miniAnalisis", label: "Mini Análisis", pts: 4 },
  { key: "reviewsCompletados", label: "Peer Reviews", pts: 2 },
  { key: "debatesParticipados", label: "Debates participados", pts: 6 },
  { key: "analisisCompletos", label: "Análisis completos", pts: 8 },
  { key: "debatesGanados", label: "Debates ganados", pts: 12 },
  { key: "ensayos", label: "Ensayos", pts: 15 },
  { key: "investigaciones", label: "Investigaciones", pts: 30 },
  // Reconocimiento de comunidad
  { key: "apoyosRecibidos", label: "Apoyos recibidos", pts: 0.5 },
  { key: "citasRecibidas", label: "Citas recibidas", pts: 3 },
  // Premios editoriales
  { key: "mejorAnalisisSemana", label: "Mejor análisis semanal", pts: 25 },
  { key: "mejorAlegatoExpediente", label: "Mejor alegato Expediente", pts: 25 },
];

// Tipos de publicación — el primer rail. Los buckets de menor importancia
// (Obiter) van primero por convención editorial y los más rigurosos
// (Investigación) cierran. `investigacion` aparece bloqueado como
// "Próximamente": el modelo aún no existe.
const TIPO_GLYPHS: Record<RankingTipo, string> = {
  TODOS: "✶",
  obiter: "❡",
  analisis: "✦",
  ensayo: "❦",
  argumento: "⚖",
  debate: "⚔",
  investigacion: "☉",
};

// Ramas — mismo set que la API pública admite. Usamos glifos editoriales
// distintos por rama para el chip rail.
const RAMAS = [
  { value: "civil", label: "Civil", glyph: "§" },
  { value: "penal", label: "Penal", glyph: "¶" },
  { value: "constitucional", label: "Constitucional", glyph: "‡" },
  { value: "laboral", label: "Laboral", glyph: "⚖" },
  { value: "comercial", label: "Comercial", glyph: "ℛ" },
  { value: "administrativo", label: "Administrativo", glyph: "Ⓞ" },
  { value: "procesal", label: "Procesal", glyph: "†" },
  { value: "tributario", label: "Tributario", glyph: "℥" },
  { value: "internacional", label: "Internacional", glyph: "∴" },
] as const;

type Sort = "score" | "publicaciones";

// Gradientes de podio — heredamos la paleta cálida editorial.
const PODIO_GRADIENTS: Record<1 | 2 | 3, string> = {
  1: "linear-gradient(135deg, #d8b66a 0%, #b89544 55%, #8a6f24 100%)", // oro
  2: "linear-gradient(135deg, #b8b3a4 0%, #948f80 55%, #5d5a52 100%)", // plata
  3: "linear-gradient(135deg, #b87333 0%, #8d5722 55%, #5a3614 100%)", // bronce
};

const TILE_GRADIENT = "linear-gradient(135deg, #5f5245 0%, #463b30 55%, #28211a 100%)";

// ─── Component ──────────────────────────────────────────────

export function RankingV4Client() {
  const [periodo, setPeriodo] = useState<RankingPeriodo>("mes");
  const [rama, setRama] = useState<string | null>(null);
  const [tipo, setTipo] = useState<RankingTipo>("TODOS");
  const [sort, setSort] = useState<Sort>("score");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [openEntry, setOpenEntry] = useState<RankingEntry | null>(null);

  const limit = 30;

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        periodo,
        page: String(page),
        limit: String(limit),
      });
      if (rama) params.set("rama", rama);
      if (tipo !== "TODOS") params.set("tipo", tipo);

      const res = await fetch(`/api/diario/ranking-autores?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const json: RankingResponse = await res.json();
      setData(json);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, [periodo, rama, tipo, page]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  useEffect(() => {
    setPage(1);
  }, [periodo, rama, tipo]);

  // Lock body scroll cuando el drawer está abierto
  useEffect(() => {
    if (openEntry) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [openEntry]);

  const filteredAndSorted = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    let list = data.ranking;
    if (q) {
      list = list.filter((e) =>
        `${e.firstName} ${e.lastName} ${e.gradoNombre}`.toLowerCase().includes(q),
      );
    }
    if (sort === "publicaciones") {
      list = [...list].sort((a, b) => b.totalPublicaciones - a.totalPublicaciones);
    }
    return list;
  }, [data, query, sort]);

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  // Para el podio: top 3 globales (no afectados por search/sort secundario,
  // siempre por score). El podio sólo tiene sentido en page === 1.
  const podio = useMemo(() => {
    if (!data || page !== 1) return [];
    return data.ranking.slice(0, 3);
  }, [data, page]);

  // Resto del listado a mostrar como tiles regulares
  const restantes = useMemo(() => {
    if (page === 1) {
      // En la primera página separamos top 3 del resto
      return filteredAndSorted.filter(
        (e) => !podio.find((p) => p.userId === e.userId),
      );
    }
    return filteredAndSorted;
  }, [filteredAndSorted, podio, page]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/diario" className="hover:text-gz-gold transition-colors">
          ← Publicaciones
        </Link>
        <nav className="flex items-center gap-5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase">
          <Link
            href="/dashboard/diario/debates"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Debates
          </Link>
          <Link
            href="/dashboard/diario/expediente"
            className="text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Expediente
          </Link>
        </nav>
      </div>

      <MastheadAcademia
        seccion="Ranking de Autores"
        glyph="✶"
        subtitulo="Las plumas más activas de la comunidad — actualizado en vivo"
        resultCount={data?.total}
        resultLabel="autores"
        eyebrowExtra={rankingPeriodoLabel(periodo)}
      />

      <FilterShellAcademia
        searchLabel="Buscar autor"
        searchPlaceholder="ej. María González, Grado V…"
        query={query}
        onQueryChange={setQuery}
        segmentedSlot={
          <SegmentedControlAcademia<RankingPeriodo>
            value={periodo}
            onChange={setPeriodo}
            options={[
              { value: "semana", label: "Esta semana" },
              { value: "mes", label: "Este mes" },
              { value: "todo", label: "Todo el tiempo" },
            ]}
          />
        }
        chipsSlot={
          <>
            <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light pr-1 self-center">
              Tipo
            </span>
            {RANKING_TIPOS.map((t) => {
              const isInvest = t === "investigacion";
              return (
                <FilterChipAcademia
                  key={t}
                  active={tipo === t}
                  onClick={() => setTipo(t)}
                  label={RANKING_TIPO_LABELS[t]}
                  glyph={TIPO_GLYPHS[t]}
                  disabled={isInvest}
                  badge={isInvest ? "Próximamente" : undefined}
                />
              );
            })}
            <span className="px-2 text-gz-ink-light/40 self-center" aria-hidden="true">
              |
            </span>
            <span className="font-ibm-mono text-[9px] tracking-[1.5px] uppercase text-gz-ink-light pr-1 self-center">
              Rama
            </span>
            <FilterChipAcademia
              active={rama === null}
              onClick={() => setRama(null)}
              label="Todas"
            />
            {RAMAS.map((r) => (
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
              { value: "score", label: "Mayor puntaje" },
              { value: "publicaciones", label: "Más publicaciones" },
            ]}
          />
        }
      />

      <main className="max-w-[1400px] mx-auto px-7 py-8">
        {/* Mi posición — sticky banner editorial */}
        {data?.miPosicion && (
          <div className="mb-6 flex items-center justify-between border border-gz-gold/40 bg-gz-gold/[0.06] px-5 py-3 rounded-[3px]">
            <p className="font-cormorant italic text-[16px] text-gz-ink-mid m-0">
              Tu posición actual en el ranking
            </p>
            <p className="font-ibm-mono text-[12px] tracking-[1.5px] uppercase text-gz-ink m-0">
              <span className="font-bold text-gz-gold text-[14px]">#{data.miPosicion}</span>
              <span className="ml-2 text-gz-ink-light">de {data.total}</span>
            </p>
          </div>
        )}

        {loading && <SkeletonGrid />}

        {!loading && data && data.ranking.length === 0 && (
          <EmptyStateAcademia
            glyph="✶"
            titulo="Sin autores en este período."
            descripcion="Cambia de período o de rama, o publica tú mismo para aparecer en el ranking."
            ctaLabel="Ir a publicaciones"
            ctaHref="/dashboard/diario"
          />
        )}

        {!loading && data && data.ranking.length > 0 && (
          <>
            {/* Podio Top 3 */}
            {podio.length > 0 && (
              <div className="mb-10">
                <div className="font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-light pb-2 mb-4 border-b border-gz-rule">
                  Podio · Top 3 · {rankingPeriodoLabel(periodo)}
                </div>
                <div
                  className="grid gap-0 border-t border-l border-gz-rule bg-white"
                  style={{
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  }}
                >
                  {podio.map((entry, i) => (
                    <PodioTile
                      key={entry.userId}
                      entry={entry}
                      pos={(i + 1) as 1 | 2 | 3}
                      isMe={data.miPosicion === i + 1}
                      onOpen={() => setOpenEntry(entry)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Resto */}
            {restantes.length > 0 && (
              <>
                {podio.length > 0 && (
                  <div className="font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-light pb-2 mb-4 border-b border-gz-rule">
                    Resto del listado
                  </div>
                )}
                <div
                  className="grid gap-0 border-t border-l border-gz-rule bg-white"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {restantes.map((entry, i) => {
                    const pos = (page - 1) * limit + (page === 1 ? podio.length + i + 1 : i + 1);
                    const isMe = data.miPosicion === pos;
                    return (
                      <RankingTile
                        key={entry.userId}
                        entry={entry}
                        pos={pos}
                        isMe={isMe}
                        onOpen={() => setOpenEntry(entry)}
                      />
                    );
                  })}
                </div>
              </>
            )}

            {restantes.length === 0 && podio.length === 0 && query && (
              <EmptyStateAcademia
                glyph="✶"
                titulo="No hay autores que coincidan."
                descripcion="Prueba con otro nombre o quita filtros."
              />
            )}

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border border-gz-rule text-gz-ink-mid rounded-[3px] hover:border-gz-ink hover:text-gz-ink disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  ← Anterior
                </button>
                <span className="font-cormorant italic text-[14px] text-gz-ink-mid">
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border border-gz-rule text-gz-ink-mid rounded-[3px] hover:border-gz-ink hover:text-gz-ink disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Drawer de desglose */}
      {openEntry && (
        <DesgloseDrawer entry={openEntry} onClose={() => setOpenEntry(null)} />
      )}
    </div>
  );
}

// ─── Podio Tile (top 3) ────────────────────────────────────

function PodioTile({
  entry,
  pos,
  isMe,
  onOpen,
}: {
  entry: RankingEntry;
  pos: 1 | 2 | 3;
  isMe: boolean;
  onOpen: () => void;
}) {
  const initials = userInitials(entry.firstName, entry.lastName);
  const fullName = `${entry.firstName} ${entry.lastName}`.trim();
  const gradient = PODIO_GRADIENTS[pos];
  const posLabel = pos === 1 ? "Primer lugar" : pos === 2 ? "Segundo lugar" : "Tercer lugar";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col bg-white text-left
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2] cursor-pointer"
    >
      {/* Cover */}
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: gradient }}
      >
        <span className="absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-ink/90 text-gz-cream font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
          #{pos} · {posLabel}
        </span>
        {isMe && (
          <span className="absolute top-3 right-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-cream text-gz-ink font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
            Tú
          </span>
        )}

        {entry.avatarUrl ? (
          <div className="relative z-[1] w-[100px] h-[100px] rounded-full overflow-hidden border-[3px] border-gz-cream/85 shadow-[0_2px_12px_rgba(28,24,20,0.22)] transition-transform duration-200 group-hover:scale-[1.04]">
            <Image src={entry.avatarUrl} alt={fullName} fill sizes="100px" className="object-cover" />
          </div>
        ) : (
          <div
            className="relative z-[1] font-cormorant font-bold text-[78px] leading-none tracking-[-2px] text-gz-cream/92 transition-transform duration-200 group-hover:scale-[1.04]"
            style={{ textShadow: "0 2px 12px rgba(28,24,20,0.22)" }}
          >
            {initials}
          </div>
        )}

        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88">
          {entry.gradoNombre} · Grado {toRoman(entry.grado) || entry.grado}
        </span>
        <span className="absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink">
          {Math.round(entry.score)} pts
        </span>
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <span className="font-ibm-mono text-[10px] tracking-[1.6px] uppercase font-medium text-gz-ink-mid">
          {entry.totalPublicaciones} publicacion{entry.totalPublicaciones === 1 ? "" : "es"}
        </span>
        <h3 className="font-cormorant font-semibold text-[24px] leading-[1.15] text-gz-ink m-0">
          {fullName}
        </h3>
        <div className="h-px w-10 bg-gz-gold mb-1" />
        <p className="text-[12.5px] text-gz-ink-light m-0 leading-[1.45]">
          {desgloseTopTres(entry.desglose)}
        </p>
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span className="font-cormorant italic text-[13px] text-gz-ink-mid">
            {entry.desglose.apoyosRecibidos} apoyos
          </span>
          <span className="px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] group-hover:bg-gz-ink group-hover:text-gz-cream transition">
            Ver desglose →
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Tile estándar ─────────────────────────────────────────

function RankingTile({
  entry,
  pos,
  isMe,
  onOpen,
}: {
  entry: RankingEntry;
  pos: number;
  isMe: boolean;
  onOpen: () => void;
}) {
  const initials = userInitials(entry.firstName, entry.lastName);
  const fullName = `${entry.firstName} ${entry.lastName}`.trim();

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col bg-white text-left
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2] cursor-pointer"
    >
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: TILE_GRADIENT }}
      >
        <span className="absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-ink/90 text-gz-cream font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
          #{pos}
        </span>
        {isMe && (
          <span className="absolute top-3 right-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-gold text-gz-ink font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
            Tú
          </span>
        )}

        {entry.avatarUrl ? (
          <div className="relative z-[1] w-[78px] h-[78px] rounded-full overflow-hidden border-[2px] border-gz-cream/85 shadow-[0_2px_10px_rgba(28,24,20,0.22)] transition-transform duration-200 group-hover:scale-[1.04]">
            <Image src={entry.avatarUrl} alt={fullName} fill sizes="78px" className="object-cover" />
          </div>
        ) : (
          <div
            className="relative z-[1] font-cormorant font-bold text-[58px] leading-none tracking-[-1px] text-gz-cream/92 transition-transform duration-200 group-hover:scale-[1.04]"
            style={{ textShadow: "0 2px 10px rgba(28,24,20,0.22)" }}
          >
            {initials}
          </div>
        )}

        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88">
          Grado {toRoman(entry.grado) || entry.grado}
        </span>
        <span className="absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink">
          {Math.round(entry.score)} pts
        </span>
      </div>

      <div className="p-[16px_18px_18px] flex flex-col gap-[8px] flex-1">
        <span className="font-ibm-mono text-[9.5px] tracking-[1.6px] uppercase font-medium text-gz-ink-mid">
          {entry.gradoNombre}
        </span>
        <h3 className="font-cormorant font-semibold text-[18px] leading-[1.15] text-gz-ink m-0">
          {fullName}
        </h3>
        <div className="h-px w-8 bg-gz-gold" />
        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span className="font-cormorant italic text-[12.5px] text-gz-ink-mid">
            {entry.totalPublicaciones} publicacion{entry.totalPublicaciones === 1 ? "" : "es"}
          </span>
          <span className="font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase text-gz-ink-mid group-hover:text-gz-gold transition">
            Desglose →
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Drawer de desglose ────────────────────────────────────

function DesgloseDrawer({
  entry,
  onClose,
}: {
  entry: RankingEntry;
  onClose: () => void;
}) {
  const fullName = `${entry.firstName} ${entry.lastName}`.trim();
  const initials = userInitials(entry.firstName, entry.lastName);
  const items = DESGLOSE_LABELS.filter((it) => entry.desglose[it.key] > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-gz-ink/40" />
      <aside
        className="relative w-full max-w-[460px] h-full bg-gz-cream border-l border-gz-rule shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del drawer */}
        <div className="px-7 pt-6 pb-4 border-b border-gz-rule flex items-start gap-4">
          {entry.avatarUrl ? (
            <div className="w-14 h-14 rounded-full overflow-hidden border border-gz-rule shrink-0">
              <Image src={entry.avatarUrl} alt={fullName} width={56} height={56} className="object-cover w-full h-full" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-gz-ink text-gz-cream flex items-center justify-center font-cormorant font-bold text-[22px] shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase text-gz-ink-light">
              Desglose de puntuación
            </p>
            <h2 className="font-cormorant font-semibold text-[24px] leading-[1.1] text-gz-ink m-0 mt-1">
              {fullName}
            </h2>
            <p className="font-cormorant italic text-[13px] text-gz-ink-mid mt-0.5">
              {entry.gradoNombre} · Grado {toRoman(entry.grado) || entry.grado}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-mid hover:text-gz-ink transition cursor-pointer"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Score destacado */}
        <div className="px-7 py-6 bg-white border-b border-gz-rule">
          <div className="flex items-end gap-3">
            <span className="font-cormorant font-bold text-[56px] leading-none text-gz-gold">
              {Math.round(entry.score)}
            </span>
            <span className="font-ibm-mono text-[11px] tracking-[1.5px] uppercase text-gz-ink-light pb-2">
              puntos totales
            </span>
          </div>
          <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid">
            {entry.totalPublicaciones} publicacion{entry.totalPublicaciones === 1 ? "" : "es"} · {entry.desglose.apoyosRecibidos} apoyos · {entry.desglose.citasRecibidas} citas
          </p>
        </div>

        {/* Tabla de desglose */}
        <div className="px-7 py-6">
          {items.length === 0 ? (
            <p className="font-cormorant italic text-[15px] text-gz-ink-light text-center py-6">
              Sin actividad registrada en este período.
            </p>
          ) : (
            <ul className="space-y-0">
              {items.map((it) => {
                const cantidad = entry.desglose[it.key];
                const puntos = Math.round(cantidad * it.pts);
                return (
                  <li
                    key={it.key}
                    className="flex items-baseline justify-between py-2.5 border-b border-gz-rule/60 last:border-b-0"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-archivo text-[13px] text-gz-ink">
                        {it.label}
                      </span>
                      <span className="ml-2 font-ibm-mono text-[10px] tracking-[1px] uppercase text-gz-ink-light">
                        ×{it.pts}
                      </span>
                    </div>
                    <span className="font-ibm-mono text-[12px] text-gz-ink-mid mr-3">
                      {cantidad}
                    </span>
                    <span className="font-cormorant font-semibold text-[16px] text-gz-ink w-14 text-right">
                      {puntos}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Link a perfil */}
        <div className="px-7 pb-8">
          <Link
            href={`/dashboard/perfil/${entry.userId}`}
            className="block text-center py-2.5 font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
          >
            Ver perfil completo →
          </Link>
        </div>
      </aside>
    </div>
  );
}

// ─── Helpers internos ──────────────────────────────────────

/** Construye una frase corta con las 3 contribuciones más fuertes del autor. */
function desgloseTopTres(d: AutorStats): string {
  // Priorizamos los aportes de mayor jerarquía editorial.
  const piezas: string[] = [];
  if (d.investigaciones > 0) piezas.push(`${d.investigaciones} investigación${d.investigaciones === 1 ? "" : "es"}`);
  if (d.ensayos > 0) piezas.push(`${d.ensayos} ensayo${d.ensayos === 1 ? "" : "s"}`);
  if (d.analisisCompletos > 0) piezas.push(`${d.analisisCompletos} análisis`);
  if (d.debatesGanados > 0) piezas.push(`${d.debatesGanados} debate${d.debatesGanados === 1 ? "" : "s"} ganado${d.debatesGanados === 1 ? "" : "s"}`);
  if (d.argumentosExpediente > 0) piezas.push(`${d.argumentosExpediente} alegato${d.argumentosExpediente === 1 ? "" : "s"}`);
  if (d.obiters > 0) piezas.push(`${d.obiters} obiter`);
  if (piezas.length === 0) return "Aún sin contribuciones registradas en el período.";
  return piezas.slice(0, 3).join(" · ");
}

// ─── Skeleton ──────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="grid gap-0 border-t border-l border-gz-rule" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white border-r border-b border-gz-rule">
          <div className="aspect-[16/10] bg-gz-cream-dark animate-pulse border-b border-gz-rule" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-gz-cream-dark animate-pulse rounded w-1/2" />
            <div className="h-5 bg-gz-cream-dark animate-pulse rounded w-3/4" />
            <div className="h-3 bg-gz-cream-dark animate-pulse rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
