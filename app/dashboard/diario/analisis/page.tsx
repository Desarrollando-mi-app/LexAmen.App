"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// ─── Constants ────────────────────────────────────────────

const MATERIA_LABELS: Record<string, string> = {
  acto_juridico: "Acto Juridico",
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

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-16">
      {/* ── Header ──────────────────────────────────────────── */}
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1">
        El Diario
      </p>
      <div className="flex items-center gap-3 mb-1">
        <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={56} height={56} className="h-[48px] w-[48px] lg:h-[56px] lg:w-[56px]" />
        <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-none">
          Analisis de Sentencias
        </h1>
      </div>
      <div className="mt-3 h-[2px] bg-gz-rule-dark" />

      {/* ── Filter bar ──────────────────────────────────────── */}
      <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <select
          value={materia}
          onChange={(e) => setMateria(e.target.value)}
          className="h-9 rounded-sm border border-gz-rule bg-white px-3 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
        >
          <option value="">Todas las materias</option>
          {Object.entries(MATERIA_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <div className="relative flex-1 w-full sm:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por titulo, tribunal o rol..."
            className="h-9 w-full rounded-sm border border-gz-rule bg-white pl-9 pr-3 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gz-ink-light"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
        </div>

        <Link
          href="/dashboard/diario/analisis/nuevo"
          className="inline-flex h-9 items-center gap-1.5 rounded-sm bg-gz-ink px-4 font-archivo text-[13px] font-medium text-white hover:bg-gz-ink/90 transition-colors whitespace-nowrap"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          Nuevo Analisis
        </Link>
      </div>

      {/* ── Results ─────────────────────────────────────────── */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-[4px] border border-gz-rule bg-gz-cream-dark/40"
              />
            ))}
          </>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-cormorant text-[20px] text-gz-ink-mid">
              No se encontraron analisis
            </p>
            <p className="mt-1 font-archivo text-[13px] text-gz-ink-light">
              Intenta ajustar los filtros o crea el primero.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <AnalisisCard key={item.id} item={item} />
          ))
        )}
      </div>

      {/* ── Load more ───────────────────────────────────────── */}
      {hasMore && !loading && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex h-9 items-center rounded-sm border border-gz-rule bg-white px-6 font-archivo text-[13px] font-medium text-gz-ink hover:border-gz-gold transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Cargando..." : "Cargar mas"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────

function AnalisisCard({ item }: { item: AnalisisPreview }) {
  const initials = `${item.user.firstName[0] ?? ""}${item.user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <article className="rounded-[4px] border border-gz-rule bg-white p-5 hover:border-gz-gold transition-colors">
      <Link
        href={`/dashboard/diario/analisis/${item.id}`}
        className="block"
      >
        <h2 className="font-cormorant text-[18px] font-bold text-gz-ink leading-snug hover:text-gz-gold transition-colors">
          {item.titulo}
        </h2>
      </Link>

      {/* Meta line */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-ibm-mono text-[11px] text-gz-ink-light">
        {item.tribunal && <span>{item.tribunal}</span>}
        {item.tribunal && item.numeroRol && (
          <span className="text-gz-rule-dark">&middot;</span>
        )}
        {item.numeroRol && <span>Rol {item.numeroRol}</span>}
        {item.materia && (
          <>
            <span className="text-gz-rule-dark">&middot;</span>
            <span className="inline-flex rounded-sm bg-gz-gold/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.5px] font-medium text-gz-gold">
              {MATERIA_LABELS[item.materia] ?? item.materia}
            </span>
          </>
        )}
        {item.tiempoLectura > 0 && (
          <>
            <span className="text-gz-rule-dark">&middot;</span>
            <span>{item.tiempoLectura} min lectura</span>
          </>
        )}
      </div>

      {/* Resumen */}
      {item.resumen && (
        <p className="mt-2.5 font-cormorant text-[15px] leading-relaxed text-gz-ink-mid line-clamp-2">
          {item.resumen}
        </p>
      )}

      {/* Footer: author + stats */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/perfil/${item.user.id}`}>
            {item.user.avatarUrl ? (
              <img
                src={item.user.avatarUrl}
                alt=""
                className="h-6 w-6 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[8px] font-bold text-gz-gold">
                {initials}
              </div>
            )}
          </Link>
          <Link
            href={`/dashboard/perfil/${item.user.id}`}
            className="font-archivo text-[12px] font-medium text-gz-ink hover:underline"
          >
            {item.user.firstName} {item.user.lastName}
          </Link>
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            {timeAgo(item.createdAt)}
          </span>
        </div>

        <div className="flex items-center gap-3 font-ibm-mono text-[11px] text-gz-ink-light">
          <span title="Apoyos" className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H14.23c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m.729-14.61H5.904c-.899 0-1.627.764-1.54 1.658.404 4.168.404 8.394 0 12.562-.087.894.641 1.658 1.54 1.658h.729m0-15.878v15.878" />
            </svg>
            {item.apoyosCount}
          </span>
          <span title="Citas" className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
            </svg>
            {item.citasCount}
          </span>
          <span title="Guardados" className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
            </svg>
            {item.guardadosCount}
          </span>
        </div>
      </div>
    </article>
  );
}
