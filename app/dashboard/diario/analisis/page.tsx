"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Constants ────────────────────────────────────────────

const MATERIA_LABELS: Record<string, string> = {
  acto_juridico: "Acto Jurídico",
  obligaciones: "Obligaciones",
  contratos: "Contratos",
  procesal_civil: "Procesal Civil",
  bienes: "Bienes",
  familia: "Familia",
  sucesiones: "Sucesiones",
  otro: "Otro",
};

// ─── Types ────────────────────────────────────────────────

interface AnalisisUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

interface AnalisisPreview {
  id: string;
  titulo: string;
  resumen: string;
  tribunal: string;
  numeroRol: string;
  materia: string;
  formato?: string | null;
  tiempoLectura: number;
  user: AnalisisUser;
  apoyosCount: number;
  citasCount: number;
  guardadosCount: number;
  comuniqueseCount: number;
  hasApoyado: boolean;
  hasGuardado: boolean;
  hasComunicado: boolean;
  createdAt: string;
}

interface FetchResult {
  items: AnalisisPreview[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ─── Helpers ──────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

// ─── Component ────────────────────────────────────────────

export default function AnalisisListingPage() {
  const [items, setItems] = useState<AnalisisPreview[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [materia, setMateria] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Fetch on filter change
  const fetchItems = useCallback(
    async (cursor?: string) => {
      const params = new URLSearchParams();
      if (materia) params.set("materia", materia);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (cursor) params.set("cursor", cursor);
      params.set("limit", "10");

      const res = await fetch(`/api/diario/analisis?${params.toString()}`);
      if (!res.ok) return null;
      return (await res.json()) as FetchResult;
    },
    [materia, debouncedSearch]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchItems().then((data) => {
      if (cancelled || !data) return;
      setItems(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchItems]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchItems(nextCursor);
    if (data) {
      setItems((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    }
    setLoadingMore(false);
  };

  // Featured: top apoyado de la lista actual (para spotlight)
  const featured = useMemo(() => {
    if (items.length === 0) return null;
    return [...items].sort((a, b) => b.apoyosCount - a.apoyosCount)[0];
  }, [items]);

  // Materias con count para el sidebar
  const materiasCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of items) {
      if (it.materia) counts[it.materia] = (counts[it.materia] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const fechaHoy = new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totalCount = items.length;

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 pt-7 pb-16">
        {/* ═══ MASTHEAD EDITORIAL ═══════════════════════════════ */}
        <div className="gz-section-header relative mb-7">
          {/* Línea editorial superior */}
          <div className="h-px bg-gz-ink/35 mb-3" />

          {/* Fila superior: fecha + sección + count */}
          <div className="hidden sm:flex items-center justify-between font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-mid mb-3 gap-3">
            <span className="capitalize shrink-0">{fechaHoy}</span>
            <span className="text-gz-burgundy shrink-0">— Sección II · Análisis de Sentencia —</span>
            <Link
              href="/dashboard/diario"
              className="font-archivo text-[12px] font-semibold text-gz-ink-light hover:text-gz-burgundy transition-colors normal-case tracking-normal cursor-pointer"
            >
              ← Volver al Diario
            </Link>
          </div>

          {/* Bloque principal */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center justify-center gap-4">
              <Image
                src="/brand/logo-sello.svg"
                alt="Studio Iuris"
                width={80}
                height={80}
                className="h-[56px] w-[56px] sm:h-[72px] sm:w-[72px] shrink-0"
              />
              <h1 className="font-cormorant text-[40px] sm:text-[58px] lg:text-[68px] font-bold text-gz-ink leading-[0.92] tracking-tight">
                Análisis de <span className="text-gz-burgundy italic">Sentencia</span>
              </h1>
            </div>
            <p className="font-cormorant italic text-[15px] sm:text-[17px] text-gz-ink-mid max-w-[640px]">
              Fallos diseccionados — el aula viva donde la jurisprudencia se
              comenta, se contradice y se aprende.
            </p>
          </div>

          {/* Triple regla editorial */}
          <div className="mt-5 h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
        </div>

        {/* ═══ Layout grid: sidebar + listado ═══════════════════ */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px]">
          {/* ─── COLUMNA PRINCIPAL ─── */}
          <main className="min-w-0">
            {/* Filter bar editorial */}
            <FilterBar
              materia={materia}
              setMateria={setMateria}
              search={search}
              setSearch={setSearch}
            />

            {/* Featured spotlight */}
            {!loading && featured && totalCount > 1 && (
              <FeaturedCard item={featured} />
            )}

            {/* Listado */}
            <div className="space-y-3">
              {loading ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-32 animate-pulse rounded-[4px] border border-gz-rule bg-white/40"
                    />
                  ))}
                </>
              ) : items.length === 0 ? (
                <EmptyState />
              ) : (
                items
                  .filter((i) => featured && i.id !== featured.id) // skip featured
                  .map((item) => <AnalisisCard key={item.id} item={item} />)
              )}
            </div>

            {/* Load more */}
            {hasMore && !loading && (
              <div className="mt-7 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full border border-gz-rule bg-white px-7 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink hover:border-gz-burgundy hover:bg-gz-burgundy hover:text-white transition-all duration-200 cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? "Cargando..." : "Cargar más fallos →"}
                </button>
              </div>
            )}
          </main>

          {/* ─── SIDEBAR ─── */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] space-y-5">
              <SidebarMaterias
                counts={materiasCount}
                activeMateria={materia}
                onSelect={(m) => setMateria(m)}
                total={totalCount}
              />
              <SidebarTopAutores items={items} />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── FilterBar editorial ─────────────────────────────────

function FilterBar({
  materia,
  setMateria,
  search,
  setSearch,
}: {
  materia: string;
  setMateria: (s: string) => void;
  search: string;
  setSearch: (s: string) => void;
}) {
  return (
    <div className="mb-5 rounded-[4px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-burgundy" />
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, tribunal o rol..."
            className="h-10 w-full rounded-full border border-gz-rule bg-white pl-10 pr-4 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/70 focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/20 transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gz-ink-light"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="7" strokeWidth={2} />
            <path d="M21 21l-4-4" strokeWidth={2} strokeLinecap="round" />
          </svg>
        </div>

        {/* Materia */}
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="h-10 rounded-full border border-gz-rule bg-white px-4 font-archivo text-[13px] text-gz-ink focus:border-gz-burgundy focus:outline-none focus:ring-1 focus:ring-gz-burgundy/20 transition-colors cursor-pointer"
        >
          <option value="">Todas las materias</option>
          {Object.entries(MATERIA_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Nuevo */}
        <Link
          href="/dashboard/diario/analisis/nuevo"
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-gz-burgundy px-5 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-white hover:bg-gz-ink transition-colors whitespace-nowrap cursor-pointer"
        >
          <span className="font-cormorant text-[18px] leading-none -mt-px">+</span>
          Nuevo análisis
        </Link>
      </div>
    </div>
  );
}

// ─── FeaturedCard (spotlight) ────────────────────────────

function FeaturedCard({ item }: { item: AnalisisPreview }) {
  const initials = `${item.user.firstName[0] ?? ""}${item.user.lastName[0] ?? ""}`.toUpperCase();
  return (
    <article className="relative mb-5">
      {/* Sombras paper-stack */}
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-gz-rule/40 bg-white/40" aria-hidden />
      <div className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[3px] border border-gz-rule/60 bg-white/60" aria-hidden />

      <div className="relative rounded-[3px] border border-gz-rule bg-white overflow-hidden">
        <div className="h-[3px] bg-gradient-to-r from-gz-burgundy via-gz-gold to-gz-burgundy" />
        <Link href={`/dashboard/diario/analisis/${item.id}`} className="block p-5 sm:p-6 group cursor-pointer">
          {/* Kicker */}
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
            <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-burgundy">
              Destacado · Más apoyado
            </span>
          </div>

          {/* Título grande */}
          <h2 className="font-cormorant text-[26px] sm:text-[30px] !font-bold text-gz-ink leading-[1.1] mb-2 group-hover:text-gz-burgundy transition-colors">
            {item.titulo}
          </h2>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-3">
            {item.tribunal && <span>{item.tribunal}</span>}
            {item.numeroRol && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span>Rol {item.numeroRol}</span>
              </>
            )}
            {item.materia && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span className="text-gz-gold font-semibold">
                  {MATERIA_LABELS[item.materia] ?? item.materia}
                </span>
              </>
            )}
            {item.tiempoLectura > 0 && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span>{item.tiempoLectura} min de lectura</span>
              </>
            )}
          </div>

          {/* Resumen */}
          {item.resumen && (
            <p className="font-cormorant italic text-[16px] leading-[1.6] text-gz-ink-mid line-clamp-3 mb-4">
              {item.resumen}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-gz-rule/60">
            <div className="flex items-center gap-2.5 min-w-0">
              {item.user.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-gz-rule/60 shrink-0" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/60 shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate leading-tight">
                  {item.user.firstName} {item.user.lastName}
                </p>
                <p className="font-ibm-mono text-[10px] text-gz-ink-light">{timeAgo(item.createdAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-ibm-mono text-[11px] text-gz-ink-light shrink-0">
              <Stat icon="♥" value={item.apoyosCount} color="text-gz-burgundy" />
              <Stat icon="❝" value={item.citasCount} />
              <Stat icon="🔖" value={item.guardadosCount} />
            </div>
          </div>
        </Link>
      </div>
    </article>
  );
}

// ─── AnalisisCard (regular) ──────────────────────────────

function AnalisisCard({ item }: { item: AnalisisPreview }) {
  const initials = `${item.user.firstName[0] ?? ""}${item.user.lastName[0] ?? ""}`.toUpperCase();
  const formatoLabel = item.formato === "mini" ? "Mini" : item.formato === "completo" ? "Completo" : null;

  return (
    <article className="relative">
      <div className="absolute inset-0 translate-x-[2px] translate-y-[2px] rounded-[3px] border border-gz-rule/30 bg-white/30" aria-hidden />
      <div className="relative rounded-[3px] border border-gz-rule bg-white p-4 sm:p-5 hover:border-gz-burgundy/50 transition-colors">
        <Link href={`/dashboard/diario/analisis/${item.id}`} className="block group cursor-pointer">
          {/* Format chip */}
          {formatoLabel && (
            <span className="inline-block mb-1.5 font-ibm-mono text-[9px] uppercase tracking-[1.5px] font-semibold text-gz-burgundy">
              {formatoLabel === "Mini" ? "✦ Mini-análisis" : "⚖ Análisis completo"}
            </span>
          )}

          <h2 className="font-cormorant text-[20px] sm:text-[22px] font-bold text-gz-ink leading-[1.2] group-hover:text-gz-burgundy transition-colors mb-1.5">
            {item.titulo}
          </h2>

          {/* Meta line */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
            {item.tribunal && <span>{item.tribunal}</span>}
            {item.numeroRol && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span>Rol {item.numeroRol}</span>
              </>
            )}
            {item.materia && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span className="text-gz-gold font-semibold">
                  {MATERIA_LABELS[item.materia] ?? item.materia}
                </span>
              </>
            )}
            {item.tiempoLectura > 0 && (
              <>
                <span className="text-gz-rule-dark">·</span>
                <span>{item.tiempoLectura} min</span>
              </>
            )}
          </div>

          {/* Resumen */}
          {item.resumen && (
            <p className="mt-2 font-cormorant text-[15px] leading-[1.55] text-gz-ink-mid line-clamp-2">
              {item.resumen}
            </p>
          )}
        </Link>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-gz-rule/40">
          <Link href={`/dashboard/perfil/${item.user.id}`} className="flex items-center gap-2 min-w-0 group/author cursor-pointer">
            {item.user.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={item.user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-gz-rule/50 shrink-0" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gz-navy font-archivo text-[8px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/50 shrink-0">
                {initials}
              </div>
            )}
            <span className="font-archivo text-[12px] font-medium text-gz-ink group-hover/author:text-gz-burgundy transition-colors truncate">
              {item.user.firstName} {item.user.lastName}
            </span>
            <span className="font-ibm-mono text-[10px] text-gz-ink-light shrink-0">
              {timeAgo(item.createdAt)}
            </span>
          </Link>
          <div className="flex items-center gap-2.5 font-ibm-mono text-[11px] text-gz-ink-light shrink-0">
            <Stat icon="♥" value={item.apoyosCount} color={item.hasApoyado ? "text-gz-burgundy" : ""} />
            <Stat icon="❝" value={item.citasCount} />
            <Stat icon="🔖" value={item.guardadosCount} />
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Stat ─────────────────────────────────────────────────

function Stat({ icon, value, color = "" }: { icon: string; value: number; color?: string }) {
  if (value === 0) return null;
  return (
    <span className={`flex items-center gap-0.5 tabular-nums ${color}`}>
      <span aria-hidden>{icon}</span> {value}
    </span>
  );
}

// ─── EmptyState ──────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white py-16 px-6 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gz-burgundy/10">
        <span className="font-cormorant text-[28px] !font-bold text-gz-burgundy">⚖</span>
      </div>
      <p className="font-cormorant italic text-[18px] text-gz-ink-mid mb-1">
        No se encontraron análisis.
      </p>
      <p className="font-archivo text-[13px] text-gz-ink-light mb-5">
        Ajusta los filtros o publica el primero.
      </p>
      <Link
        href="/dashboard/diario/analisis/nuevo"
        className="inline-flex items-center gap-1.5 rounded-full bg-gz-burgundy px-6 py-2 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-white hover:bg-gz-ink transition-colors cursor-pointer"
      >
        + Nuevo análisis
      </Link>
    </div>
  );
}

// ─── Sidebar Materias ────────────────────────────────────

function SidebarMaterias({
  counts,
  activeMateria,
  onSelect,
  total,
}: {
  counts: [string, number][];
  activeMateria: string;
  onSelect: (m: string) => void;
  total: number;
}) {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-burgundy" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-burgundy">
            Por materia
          </span>
        </div>
        <ul className="-mx-1">
          <li>
            <button
              onClick={() => onSelect("")}
              className={`flex w-full items-center justify-between px-1 py-1.5 transition-colors cursor-pointer rounded-[2px] ${
                activeMateria === "" ? "bg-gz-burgundy/10" : "hover:bg-gz-cream-dark/30"
              }`}
            >
              <span
                className={`font-archivo text-[13px] ${
                  activeMateria === "" ? "font-bold text-gz-burgundy" : "text-gz-ink"
                }`}
              >
                Todas
              </span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">{total}</span>
            </button>
          </li>
          {counts.map(([key, count]) => (
            <li key={key}>
              <button
                onClick={() => onSelect(key)}
                className={`flex w-full items-center justify-between px-1 py-1.5 transition-colors cursor-pointer rounded-[2px] ${
                  activeMateria === key ? "bg-gz-burgundy/10" : "hover:bg-gz-cream-dark/30"
                }`}
              >
                <span
                  className={`font-archivo text-[13px] ${
                    activeMateria === key ? "font-bold text-gz-burgundy" : "text-gz-ink"
                  }`}
                >
                  {MATERIA_LABELS[key] ?? key}
                </span>
                <span className="font-ibm-mono text-[10px] text-gz-ink-light">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Sidebar Top Autores ─────────────────────────────────

function SidebarTopAutores({ items }: { items: AnalisisPreview[] }) {
  // Top 3 autores por cantidad de análisis en el listado actual
  const counts = useMemo(() => {
    const map = new Map<string, { user: AnalisisUser; count: number; apoyos: number }>();
    for (const it of items) {
      const existing = map.get(it.user.id);
      if (existing) {
        existing.count += 1;
        existing.apoyos += it.apoyosCount;
      } else {
        map.set(it.user.id, { user: it.user, count: 1, apoyos: it.apoyosCount });
      }
    }
    return Array.from(map.values())
      .sort((a, b) => b.apoyos - a.apoyos || b.count - a.count)
      .slice(0, 5);
  }, [items]);

  if (counts.length === 0) return null;

  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-gold" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-gold">
            Voces destacadas
          </span>
        </div>
        <ol className="space-y-2">
          {counts.map((c, i) => {
            const initials = `${c.user.firstName[0] ?? ""}${c.user.lastName[0] ?? ""}`.toUpperCase();
            const medalColor =
              i === 0 ? "text-gz-burgundy" : i === 1 ? "text-gz-gold" : i === 2 ? "text-[#b87333]" : "text-gz-ink-light";
            return (
              <li key={c.user.id}>
                <Link
                  href={`/dashboard/perfil/${c.user.id}`}
                  className="flex items-center gap-2.5 group cursor-pointer rounded-[2px] -mx-1 px-1 py-0.5 transition-colors hover:bg-gz-cream-dark/30"
                >
                  <span className={`font-cormorant text-[16px] !font-bold leading-none w-4 text-right shrink-0 ${medalColor}`}>
                    {i + 1}
                  </span>
                  {c.user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={c.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-gz-rule/50 shrink-0" />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy font-archivo text-[9px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/50 shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-archivo text-[12px] font-semibold text-gz-ink truncate leading-tight group-hover:text-gz-burgundy transition-colors">
                      {c.user.firstName} {c.user.lastName.charAt(0)}.
                    </p>
                    <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light">
                      {c.count} {c.count === 1 ? "análisis" : "análisis"} · ♥ {c.apoyos}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
