"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ObiterFeed } from "./components/obiter-feed";
import { ObiterTrending } from "./components/obiter-trending";
import { ContactSuggestions } from "./components/contact-suggestions";
import { RankingSidebar } from "./components/ranking-sidebar";

// ─── Types ──────────────────────────────────────────────────

type DiarioPageClientProps = {
  userId: string | null;
  userFirstName?: string;
  userAvatarUrl?: string | null;
  // Existing DiarioFeed props
  diarioFeedElement: React.ReactNode;
  prefillText?: string;
};

type MainTab = "feed" | "analisis" | "ensayos" | "expediente" | "debates" | "mis";

// Mapa de clases por acento (Tailwind no resuelve strings dinámicos en JIT
// — cada combinación debe aparecer literalmente).
const ACCENT_CLASSES = {
  gold:     { text: "text-gz-gold",     bg: "bg-gz-gold/[0.10]",     border: "border-gz-gold",     rail: "bg-gz-gold" },
  burgundy: { text: "text-gz-burgundy", bg: "bg-gz-burgundy/[0.08]", border: "border-gz-burgundy", rail: "bg-gz-burgundy" },
  sage:     { text: "text-gz-sage",     bg: "bg-gz-sage/[0.10]",     border: "border-gz-sage",     rail: "bg-gz-sage" },
  navy:     { text: "text-gz-navy",     bg: "bg-gz-navy/[0.08]",     border: "border-gz-navy",     rail: "bg-gz-navy" },
  ink:      { text: "text-gz-ink",      bg: "bg-gz-ink/[0.06]",      border: "border-gz-ink",      rail: "bg-gz-ink" },
} as const;

type Accent = keyof typeof ACCENT_CLASSES;

// Cada tab lleva un glifo (numeración romana) + acento de color editorial
// que la distingue. Mantiene la estética periodística.
const TABS: {
  key: MainTab;
  label: string;
  short: string;
  glyph: string;
  accent: Accent;
  requiresAuth?: boolean;
  // Si la tab apunta a otra ruta (no se renderiza inline), usar href en vez
  // de cambiar activeMainTab. Útil para Investigaciones que vive en
  // /dashboard/diario/investigaciones.
  href?: string;
}[] = [
  { key: "feed",       label: "Obiter Dictum",         short: "Obiter",     glyph: "I",   accent: "gold" },
  { key: "analisis",   label: "Análisis de Sentencia", short: "Análisis",   glyph: "II",  accent: "burgundy" },
  { key: "ensayos",    label: "Ensayos",               short: "Ensayos",    glyph: "III", accent: "sage" },
  { key: "expediente", label: "Expediente Abierto",    short: "Expediente", glyph: "IV",  accent: "navy" },
  { key: "debates",    label: "Debates",               short: "Debates",    glyph: "V",   accent: "burgundy" },
  { key: "mis",        label: "Mis Publicaciones",     short: "Mías",       glyph: "VI",  accent: "ink", requiresAuth: true },
];

// ─── Mis Publicaciones Tab ──────────────────────────────────

function MisPublicaciones({ userId }: { userId: string }) {
  const [subTab, setSubTab] = useState<"obiters" | "analisis" | "ensayos">(
    "obiters"
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    setHasMore(false);

    async function load() {
      try {
        let url = "";
        if (subTab === "obiters") {
          // includeReplies=true: en "Mis Publicaciones" mostramos toda la
          // actividad del usuario (raíz + respuestas), no solo OD raíz.
          url = `/api/obiter?feed=recientes&userId=${userId}&limit=20&includeReplies=true`;
        } else if (subTab === "analisis") {
          url = `/api/diario/analisis?userId=${userId}&limit=10`;
        } else {
          url = `/api/diario/ensayos?userId=${userId}&limit=10`;
        }
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (!cancelled) {
          if (subTab === "obiters") {
            setItems(data.obiters ?? []);
          } else {
            setItems(data.items ?? []);
          }
          setNextCursor(data.nextCursor ?? null);
          setHasMore(data.hasMore ?? false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [subTab, userId]);

  async function handleLoadMore() {
    if (!nextCursor) return;
    try {
      let url = "";
      if (subTab === "obiters") {
        url = `/api/obiter?feed=recientes&userId=${userId}&limit=20&includeReplies=true&cursor=${nextCursor}`;
      } else if (subTab === "analisis") {
        url = `/api/diario/analisis?userId=${userId}&limit=10&cursor=${nextCursor}`;
      } else {
        url = `/api/diario/ensayos?userId=${userId}&limit=10&cursor=${nextCursor}`;
      }
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (subTab === "obiters") {
        setItems((prev) => [...prev, ...(data.obiters ?? [])]);
      } else {
        setItems((prev) => [...prev, ...(data.items ?? [])]);
      }
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch {
      /* silent */
    }
  }

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

  const SUB_TABS = [
    { key: "obiters" as const, label: "Obiter Dictum" },
    { key: "analisis" as const, label: "Análisis" },
    { key: "ensayos" as const, label: "Ensayos" },
  ];

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-4 flex gap-1 rounded-[4px] border border-gz-rule p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`flex-1 rounded-[3px] px-3 py-1.5 font-ibm-mono text-[11px] font-semibold transition-colors ${
              subTab === tab.key
                ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-[4px] bg-gz-cream-dark"
            />
          ))}
        </div>
      )}

      {/* Items */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            if (subTab === "obiters") {
              const isReply = !!item.parentObiterId;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/diario/obiter/${item.id}`}
                  className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40 cursor-pointer"
                >
                  {isReply && (
                    <p className="mb-1.5 font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path d="M9 14L4 9l5-5M4 9h11a4 4 0 014 4v6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Respuesta
                    </p>
                  )}
                  <p
                    className="mb-2 line-clamp-3 font-cormorant text-[16px] leading-[1.7] text-gz-ink"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {item.content}
                  </p>
                  <div className="flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                    <span>{timeAgo(item.createdAt)}</span>
                    <span className="text-gz-ink-light/30">·</span>
                    <span>Apoyar {item.apoyosCount ?? 0}</span>
                    <span className="text-gz-ink-light/30">·</span>
                    <span>Citar {item.citasCount ?? 0}</span>
                    {item.replyCount > 0 && (
                      <>
                        <span className="text-gz-ink-light/30">·</span>
                        <span>{item.replyCount} {item.replyCount === 1 ? "respuesta" : "respuestas"}</span>
                      </>
                    )}
                  </div>
                </Link>
              );
            }
            if (subTab === "analisis") {
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/diario/analisis/${item.id}`}
                  className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
                >
                  <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-burgundy">
                    Análisis de Sentencia
                  </p>
                  <h4 className="mb-1 font-cormorant text-[17px] font-bold text-gz-ink">
                    {item.titulo}
                  </h4>
                  <p className="line-clamp-2 font-cormorant text-[14px] text-gz-ink-mid">
                    {item.resumen}
                  </p>
                  <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                    <span>{timeAgo(item.createdAt)}</span>
                    <span className="text-gz-ink-light/30">·</span>
                    <span>Apoyar {item.apoyosCount ?? 0}</span>
                    <span className="text-gz-ink-light/30">·</span>
                    <span>{item.viewsCount ?? 0} vistas</span>
                  </div>
                </Link>
              );
            }
            // ensayos
            return (
              <Link
                key={item.id}
                href={`/dashboard/diario/ensayos/${item.id}`}
                className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
              >
                <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-sage">
                  Ensayo
                </p>
                <h4 className="mb-1 font-cormorant text-[17px] font-bold text-gz-ink">
                  {item.titulo}
                </h4>
                {item.resumen && (
                  <p className="line-clamp-2 font-cormorant text-[14px] text-gz-ink-mid">
                    {item.resumen}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                  <span>{timeAgo(item.createdAt)}</span>
                  <span className="text-gz-ink-light/30">·</span>
                  <span>Apoyar {item.apoyosCount ?? 0}</span>
                  <span className="text-gz-ink-light/30">·</span>
                  <span>{item.downloadsCount ?? 0} descargas</span>
                </div>
              </Link>
            );
          })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="mt-2 w-full rounded-[3px] border border-gz-rule py-3 text-center font-archivo text-[13px] text-gz-gold transition-colors hover:border-gz-gold hover:bg-gz-gold/[0.04]"
            >
              Cargar más
            </button>
          )}
        </div>
      )}

      {/* Empty */}
      {!loading && items.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-4 font-cormorant text-[17px] italic text-gz-ink-light">
            {subTab === "obiters"
              ? "No has publicado ningún Obiter aún."
              : subTab === "analisis"
                ? "No has publicado ningún Análisis aún."
                : "No has publicado ningún Ensayo aún."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Embedded Listing Components ────────────────────────────

type AnalisisSubFilter = "todos" | "mini" | "completo" | "fallo";

function AnalisisListing() {
  const [subFilter, setSubFilter] = useState<AnalisisSubFilter>("todos");

  const SUB_FILTERS: { key: AnalisisSubFilter; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "mini", label: "Mini-Analisis" },
    { key: "completo", label: "Completos" },
    { key: "fallo", label: "Fallo de la Semana" },
  ];

  return (
    <div>
      {/* Render a lightweight iframe-like inline listing */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold">
          Analisis de Sentencias
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/diario/analisis"
            className="font-archivo text-[12px] text-gz-gold hover:underline"
          >
            Ver todos &rarr;
          </Link>
          <Link
            href="/dashboard/diario/analisis/nuevo"
            className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            + Nuevo Analisis
          </Link>
        </div>
      </div>

      {/* Sub-filter buttons */}
      <div className="mb-4 flex gap-1 rounded-[4px] border border-gz-rule p-1 overflow-x-auto">
        {SUB_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setSubFilter(f.key)}
            className={`flex-shrink-0 rounded-[3px] px-3 py-1.5 font-ibm-mono text-[11px] font-semibold transition-colors ${
              subFilter === f.key
                ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Fallo de la Semana banner (shown when filter active OR always as teaser) */}
      {subFilter === "fallo" && <FalloDeLaSemanaBanner />}

      <AnalisisListingContent subFilter={subFilter} />
    </div>
  );
}

// ─── Fallo de la Semana Banner ──────────────────────────────

function FalloDeLaSemanaBanner() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [fallo, setFallo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/fallo-semana", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setFallo(data.fallo ?? null);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="mb-4 h-[140px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
    );
  }

  if (!fallo) {
    return (
      <div className="mb-4 rounded-[4px] border border-gz-rule bg-white p-5 text-center">
        <p className="font-cormorant text-[16px] italic text-gz-ink-light">
          No hay un Fallo de la Semana activo en este momento.
        </p>
      </div>
    );
  }

  // Countdown calculation
  const endDate = fallo.fechaCierre ? new Date(fallo.fechaCierre) : null;
  const now = new Date();
  const diffMs = endDate ? endDate.getTime() - now.getTime() : 0;
  const daysLeft = Math.max(0, Math.ceil(diffMs / 86400000));

  return (
    <div className="mb-4 rounded-[4px] border-2 border-gz-gold bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[2px] text-gz-gold">
          Fallo de la Semana
        </span>
        {daysLeft > 0 && (
          <span className="font-ibm-mono text-[10px] text-gz-ink-light">
            {daysLeft} dia{daysLeft !== 1 ? "s" : ""} restante{daysLeft !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <h4 className="font-cormorant text-[20px] font-bold text-gz-ink mb-2">
        {fallo.titulo}
      </h4>
      {fallo.tribunal && (
        <p className="font-ibm-mono text-[10px] text-gz-ink-mid mb-2">
          {fallo.tribunal} {fallo.rol ? `· Rol ${fallo.rol}` : ""}
        </p>
      )}
      {fallo.resumen && (
        <p className="font-cormorant text-[14px] leading-relaxed text-gz-ink-mid mb-3 line-clamp-3">
          {fallo.resumen}
        </p>
      )}
      {fallo.preguntaGuia && (
        <p className="font-archivo text-[13px] italic text-gz-ink-mid mb-3">
          &ldquo;{fallo.preguntaGuia}&rdquo;
        </p>
      )}
      <div className="flex items-center gap-4">
        {fallo.analisisCount != null && (
          <span className="font-ibm-mono text-[10px] text-gz-ink-light">
            {fallo.analisisCount} analisis publicados
          </span>
        )}
        <Link
          href={`/dashboard/diario/analisis/nuevo?fallo=${fallo.id}`}
          className="rounded-[3px] bg-gz-gold px-4 py-1.5 font-archivo text-[11px] font-semibold text-gz-navy transition-colors hover:bg-gz-navy hover:text-white"
        >
          Publicar mi analisis del fallo &rarr;
        </Link>
      </div>
    </div>
  );
}

function AnalisisListingContent({ subFilter }: { subFilter: AnalisisSubFilter }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setItems([]);
    setNextCursor(null);
    setHasMore(false);

    async function load() {
      try {
        let url = "/api/diario/analisis?limit=10";
        if (subFilter === "mini") url += "&formato=mini";
        else if (subFilter === "completo") url += "&formato=completo";
        // "fallo" filter: we show all fallo-related analisis (those with falloDeLaSemanaId)
        // The API doesn't have a "has falloDeLaSemanaId" filter, so we fetch all and filter client-side
        // Or we could pass a special param — for now we use client-side filtering

        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        let fetched = data.items ?? [];
        if (subFilter === "fallo") {
          fetched = fetched.filter((a: { falloDeLaSemanaId?: string | null }) => !!a.falloDeLaSemanaId);
        }
        if (!cancelled) {
          setItems(fetched);
          setNextCursor(data.nextCursor ?? null);
          setHasMore(data.hasMore ?? false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [subFilter]);

  async function loadMore() {
    if (!nextCursor) return;
    try {
      let url = `/api/diario/analisis?limit=10&cursor=${nextCursor}`;
      if (subFilter === "mini") url += "&formato=mini";
      else if (subFilter === "completo") url += "&formato=completo";

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      let fetched = data.items ?? [];
      if (subFilter === "fallo") {
        fetched = fetched.filter((a: { falloDeLaSemanaId?: string | null }) => !!a.falloDeLaSemanaId);
      }
      setItems((prev) => [...prev, ...fetched]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch {
      /* silent */
    }
  }

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-[4px] bg-gz-cream-dark"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-cormorant text-[17px] italic text-gz-ink-light">
          {subFilter === "fallo"
            ? "No hay analisis del Fallo de la Semana aun."
            : subFilter === "mini"
              ? "No hay mini-analisis publicados aun."
              : subFilter === "completo"
                ? "No hay analisis completos publicados aun."
                : "Aun no hay analisis publicados."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/dashboard/diario/analisis/${item.id}`}
          className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
        >
          <div className="mb-2 flex items-center gap-3">
            {item.user?.avatarUrl ? (
              <img
                src={item.user.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full border border-gz-gold object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-semibold text-gz-gold-bright">
                {(item.user?.firstName?.[0] ?? "") +
                  (item.user?.lastName?.[0] ?? "")}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-archivo text-[12px] font-semibold text-gz-ink">
                {item.user?.firstName} {item.user?.lastName}
              </span>
              <span className="ml-2 font-ibm-mono text-[10px] text-gz-ink-light">
                {timeAgo(item.createdAt)}
              </span>
            </div>
            {/* Format badge */}
            {item.formato && (
              <span
                className={`flex-shrink-0 rounded-full px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[0.5px] ${
                  item.formato === "mini"
                    ? "bg-gz-gold/15 text-gz-gold"
                    : "bg-gz-navy/15 text-gz-navy"
                }`}
              >
                {item.formato === "mini" ? "Mini" : "Completo"}
              </span>
            )}
          </div>
          <h4 className="mb-1 font-cormorant text-[17px] font-bold leading-tight text-gz-ink">
            {item.titulo}
          </h4>
          <p className="mb-2 font-ibm-mono text-[10px] text-gz-ink-mid">
            {item.tribunal} &middot; Rol {item.numeroRol}
          </p>
          <p className="line-clamp-2 font-cormorant text-[14px] leading-relaxed text-gz-ink-mid">
            {item.resumen}
          </p>
          <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
            <span>Apoyar {item.apoyosCount ?? 0}</span>
            <span className="text-gz-ink-light/30">&middot;</span>
            <span>Citar {item.citasCount ?? 0}</span>
            <span className="text-gz-ink-light/30">&middot;</span>
            <span>{item.tiempoLectura ?? 5} min</span>
          </div>
        </Link>
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-2 w-full rounded-[3px] border border-gz-rule py-3 text-center font-archivo text-[13px] text-gz-gold transition-colors hover:border-gz-gold hover:bg-gz-gold/[0.04]"
        >
          Cargar mas
        </button>
      )}
    </div>
  );
}

function EnsayosListing() {
  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-sage font-semibold">
          Ensayos y Documentos
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/diario/ensayos"
            className="font-archivo text-[12px] text-gz-gold hover:underline"
          >
            Ver todos →
          </Link>
          <Link
            href="/dashboard/diario/ensayos/nuevo"
            className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            + Nuevo Ensayo
          </Link>
        </div>
      </div>
      <EnsayosListingContent />
    </div>
  );
}

function EnsayosListingContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const TIPO_LABELS: Record<string, string> = {
    opinion: "Opinión",
    nota_doctrinaria: "Nota doctrinaria",
    comentario_reforma: "Comentario de reforma",
    analisis_comparado: "Análisis comparado",
    tesis: "Tesis / Memoria",
    otro: "Otro",
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/ensayos?limit=10", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    try {
      const res = await fetch(
        `/api/diario/ensayos?limit=10&cursor=${nextCursor}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setNextCursor(data.nextCursor ?? null);
      setHasMore(data.hasMore ?? false);
    } catch {
      /* silent */
    }
  }

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

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-[4px] bg-gz-cream-dark"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-cormorant text-[17px] italic text-gz-ink-light">
          Aún no hay ensayos publicados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/dashboard/diario/ensayos/${item.id}`}
          className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
        >
          <div className="mb-2 flex items-center gap-3">
            {item.user?.avatarUrl ? (
              <img
                src={item.user.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full border border-gz-gold object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-semibold text-gz-gold-bright">
                {(item.user?.firstName?.[0] ?? "") +
                  (item.user?.lastName?.[0] ?? "")}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="font-archivo text-[12px] font-semibold text-gz-ink">
                {item.user?.firstName} {item.user?.lastName}
              </span>
              <span className="ml-2 font-ibm-mono text-[10px] text-gz-ink-light">
                {timeAgo(item.createdAt)}
              </span>
            </div>
          </div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-sage">
              {item.archivoFormato === "pdf" ? "PDF" : "DOCX"} ·{" "}
              {TIPO_LABELS[item.tipo] ?? item.tipo}
            </span>
          </div>
          <h4 className="mb-1 font-cormorant text-[17px] font-bold leading-tight text-gz-ink">
            {item.titulo}
          </h4>
          {item.resumen && (
            <p className="line-clamp-2 font-cormorant text-[14px] leading-relaxed text-gz-ink-mid">
              {item.resumen}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
            <span>Apoyar {item.apoyosCount ?? 0}</span>
            <span className="text-gz-ink-light/30">·</span>
            <span>{item.downloadsCount ?? 0} descargas</span>
          </div>
        </Link>
      ))}
      {hasMore && (
        <button
          onClick={loadMore}
          className="mt-2 w-full rounded-[3px] border border-gz-rule py-3 text-center font-archivo text-[13px] text-gz-gold transition-colors hover:border-gz-gold hover:bg-gz-gold/[0.04]"
        >
          Cargar más
        </button>
      )}
    </div>
  );
}

// ─── Expediente Teaser ──────────────────────────────────────

function ExpedienteTeaser() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activo, setActivo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recientes, setRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/expediente?limit=5", {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.activo) setActivo(data.activo);
        setRecientes(data.recientes ?? []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-[4px] bg-gz-cream-dark"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold">
          Expediente Abierto
        </p>
        <Link
          href="/dashboard/diario/expediente"
          className="font-archivo text-[12px] text-gz-gold hover:underline"
        >
          Ver todos →
        </Link>
      </div>

      {/* Active expediente mini-card */}
      {activo && (
        <Link
          href={`/dashboard/diario/expediente/${activo.id}`}
          className="mb-4 block rounded-[4px] border-2 border-gz-gold bg-white p-5 transition-colors hover:border-gz-gold/80"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[2px] text-gz-gold">
              Expediente N&deg; {activo.numero}
            </span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-green-700">
              Abierto
            </span>
          </div>
          <h4 className="mb-2 font-cormorant text-[20px] font-bold text-gz-ink">
            {activo.titulo}
          </h4>
          <div className="flex items-center gap-3 font-ibm-mono text-[10px] text-gz-ink-light">
            <span>{activo.totalArgumentos ?? 0} argumentos</span>
            <span className="text-gz-rule-dark">|</span>
            <span>Cierra {new Date(activo.fechaCierre).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}</span>
          </div>
          <p className="mt-2 font-archivo text-[12px] font-semibold text-gz-gold">
            Leer caso y argumentar &rarr;
          </p>
        </Link>
      )}

      {/* Recent closed */}
      {recientes.length > 0 && (
        <div className="space-y-2">
          {recientes.map((exp: { id: string; numero: number; titulo: string; fechaCierre: string; totalArgumentos?: number }) => (
            <Link
              key={exp.id}
              href={`/dashboard/diario/expediente/${exp.id}`}
              className="block rounded-[4px] border border-gz-rule bg-white p-3 transition-colors hover:border-gz-gold/40"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="font-ibm-mono text-[9px] text-gz-ink-light">
                    N&deg; {exp.numero}
                  </span>
                  <h5 className="font-cormorant text-[15px] font-bold text-gz-ink truncate">
                    {exp.titulo}
                  </h5>
                </div>
                <span className="ml-2 flex-shrink-0 font-ibm-mono text-[9px] text-gz-ink-light">
                  {new Date(exp.fechaCierre).toLocaleDateString("es-CL", { day: "numeric", month: "short" })}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!activo && recientes.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-cormorant text-[17px] italic text-gz-ink-light">
            Aún no hay expedientes publicados.
          </p>
        </div>
      )}

      {/* Link to propose */}
      <div className="mt-4 text-center">
        <Link
          href="/dashboard/diario/expediente/proponer"
          className="font-archivo text-[12px] font-semibold text-gz-gold hover:underline"
        >
          Proponer un caso →
        </Link>
      </div>
    </div>
  );
}

// ─── Collaboration Invitations Badge ─────────────────────────

function ColaboracionBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/colaboracion/mis-invitaciones", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setCount(data.invitaciones?.length ?? 0);
      } catch { /* silent */ }
    }
    load();
  }, []);

  if (count === 0) return null;

  return (
    <Link
      href="/dashboard/diario/colaboracion"
      className="relative flex items-center gap-1.5 rounded-[3px] border border-gz-gold/40 bg-gz-gold/[0.06] px-3 py-1.5 font-archivo text-[11px] font-semibold text-gz-gold transition-colors hover:bg-gz-gold/[0.12]"
    >
      <span>Invitaciones</span>
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gz-gold font-ibm-mono text-[10px] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}

// ─── Debates Teaser ─────────────────────────────────────────

function DebatesTeaser() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [debates, setDebates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    buscando_oponente: { label: "Buscando oponente", color: "text-amber-700", bg: "bg-amber-50" },
    argumentos: { label: "Argumentos", color: "text-blue-700", bg: "bg-blue-50" },
    replicas: { label: "Replicas", color: "text-purple-700", bg: "bg-purple-50" },
    votacion: { label: "En votacion", color: "text-green-700", bg: "bg-green-50" },
    cerrado: { label: "Cerrado", color: "text-gz-ink-light", bg: "bg-gz-cream-dark/50" },
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/debates", { credentials: "include" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setDebates(data.debates ?? []);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeDebates = debates.filter((d: { estado: string }) => d.estado !== "cerrado").slice(0, 5);
  const closedDebates = debates.filter((d: { estado: string }) => d.estado === "cerrado").slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-[4px] bg-gz-cream-dark" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold">
          Debates Juridicos
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/diario/debates"
            className="font-archivo text-[12px] text-gz-gold hover:underline"
          >
            Ver todos &rarr;
          </Link>
          <Link
            href="/dashboard/diario/debates/proponer"
            className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            + Proponer debate
          </Link>
        </div>
      </div>

      {/* Active debates */}
      {activeDebates.length > 0 && (
        <div className="space-y-3 mb-4">
          {activeDebates.map((d: { id: string; titulo: string; estado: string; rama: string; autor1?: { firstName: string; lastName: string }; autor2?: { firstName: string; lastName: string } | null; votosAutor1: number; votosAutor2: number }) => {
            const cfg = ESTADO_CONFIG[d.estado] ?? ESTADO_CONFIG.cerrado;
            const totalVotos = d.votosAutor1 + d.votosAutor2;
            return (
              <Link
                key={d.id}
                href={`/dashboard/diario/debates/${d.id}`}
                className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`rounded-full px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[0.5px] ${cfg.color} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  <span className="font-ibm-mono text-[9px] text-gz-ink-light uppercase">
                    {d.rama}
                  </span>
                </div>
                <h4 className="font-cormorant text-[17px] font-bold text-gz-ink leading-snug">
                  {d.titulo}
                </h4>
                <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] text-gz-ink-light">
                  <span>{d.autor1?.firstName} {d.autor1?.lastName}</span>
                  <span className="font-bold text-gz-burgundy">VS</span>
                  <span>
                    {d.autor2 ? `${d.autor2.firstName} ${d.autor2.lastName}` : "Esperando..."}
                  </span>
                  {d.estado === "votacion" && totalVotos > 0 && (
                    <>
                      <span className="text-gz-rule-dark">|</span>
                      <span>{totalVotos} voto{totalVotos !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Closed debates */}
      {closedDebates.length > 0 && (
        <div>
          <p className="mb-2 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
            Cerrados
          </p>
          <div className="space-y-2">
            {closedDebates.map((d: { id: string; titulo: string; votosAutor1: number; votosAutor2: number }) => (
              <Link
                key={d.id}
                href={`/dashboard/diario/debates/${d.id}`}
                className="block rounded-[4px] border border-gz-rule bg-white p-3 transition-colors hover:border-gz-gold/40"
              >
                <h5 className="font-cormorant text-[15px] font-bold text-gz-ink truncate">
                  {d.titulo}
                </h5>
                <p className="mt-0.5 font-ibm-mono text-[9px] text-gz-ink-light">
                  {d.votosAutor1} vs {d.votosAutor2} votos
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {debates.length === 0 && (
        <div className="py-12 text-center">
          <p className="font-cormorant text-[17px] italic text-gz-ink-light">
            Aun no hay debates juridicos.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Publish Dropdown ───────────────────────────────────────

function PublishDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
      >
        + Publicar
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[240px] rounded-[4px] border border-gz-rule bg-white py-1 shadow-lg">
          <Link
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setOpen(false);
              // Focus the OD editor by scrolling to it
              const textarea = document.querySelector("textarea");
              if (textarea) {
                textarea.focus();
                textarea.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gz-cream-dark/50"
          >
            <span className="mt-0.5 text-[16px]">💬</span>
            <div>
              <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                Obiter Dictum
              </p>
              <p className="font-archivo text-[11px] text-gz-ink-light">
                Reflexión jurídica breve
              </p>
            </div>
          </Link>
          <div className="mx-4 border-t border-gz-cream-dark" />
          <Link
            href="/dashboard/diario/analisis/nuevo"
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gz-cream-dark/50"
          >
            <span className="mt-0.5 text-[16px]">⚖️</span>
            <div>
              <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                Análisis de Sentencia
              </p>
              <p className="font-archivo text-[11px] text-gz-ink-light">
                Análisis estructurado de un fallo
              </p>
            </div>
          </Link>
          <div className="mx-4 border-t border-gz-cream-dark" />
          <Link
            href="/dashboard/diario/ensayos/nuevo"
            className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gz-cream-dark/50"
          >
            <span className="mt-0.5 text-[16px]">📄</span>
            <div>
              <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                Ensayo
              </p>
              <p className="font-archivo text-[11px] text-gz-ink-light">
                Sube un PDF o DOCX académico
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function DiarioPageClient({
  userId,
  userFirstName,
  userAvatarUrl,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  diarioFeedElement,
  prefillText,
}: DiarioPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const hashtagParam = searchParams.get("hashtag")?.toLowerCase().trim() || null;

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(() => {
    if (tabParam === "analisis") return "analisis";
    if (tabParam === "ensayos") return "ensayos";
    if (tabParam === "expediente") return "expediente";
    if (tabParam === "debates") return "debates";
    if (tabParam === "mis") return "mis";
    return "feed";
  });

  // React to query param changes
  useEffect(() => {
    if (tabParam === "analisis") setActiveMainTab("analisis");
    else if (tabParam === "ensayos") setActiveMainTab("ensayos");
    else if (tabParam === "expediente") setActiveMainTab("expediente");
    else if (tabParam === "debates") setActiveMainTab("debates");
    else if (tabParam === "mis") setActiveMainTab("mis");
    else if (tabParam === "feed" || !tabParam) setActiveMainTab("feed");
  }, [tabParam]);

  function handleTabChange(tab: MainTab) {
    setActiveMainTab(tab);
    // Update URL without full navigation
    const url = new URL(window.location.href);
    if (tab === "feed") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }

  const visibleTabs = TABS.filter((t) => !t.requiresAuth || userId);
  const activeTab = TABS.find((t) => t.key === activeMainTab) ?? TABS[0];

  return (
    <div>
      {/* ════ NAV EDITORIAL — pestañas tipo periódico con glifo + acento ════ */}
      <div className="mb-6 -mx-2 sm:mx-0">
        {/* Etiqueta superior con seccion activa */}
        <div className="hidden sm:flex items-center justify-between mb-2 px-2">
          <div className="flex items-center gap-2.5">
            <span className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
              Sección
            </span>
            <span className={`font-ibm-mono text-[10px] uppercase tracking-[2.5px] font-semibold ${ACCENT_CLASSES[activeTab.accent].text}`}>
              {activeTab.glyph}. {activeTab.label}
            </span>
          </div>

          {userId && (
            <div className="flex items-center gap-2">
              <ColaboracionBadge />
              <PublishDropdown />
            </div>
          )}
        </div>

        {/* Mobile: solo publicar a la derecha */}
        {userId && (
          <div className="sm:hidden flex items-center justify-end gap-2 mb-3 px-2">
            <ColaboracionBadge />
            <PublishDropdown />
          </div>
        )}

        {/* Tira de pestañas — scroll horizontal en mobile, fila en desktop */}
        <div className="relative border-y-2 border-gz-ink/85 bg-white/40">
          <div className="flex items-stretch overflow-x-auto gz-scrollbar-hide">
            {visibleTabs.map((tab) => {
              const active = activeMainTab === tab.key;
              const palette = ACCENT_CLASSES[tab.accent];
              const inner = (
                <>
                  <span
                    className={`absolute top-0 left-0 right-0 h-[3px] transition-opacity duration-200 ${
                      active ? `opacity-100 ${palette.rail}` : "opacity-0"
                    }`}
                  />
                  <span
                    className={`font-cormorant text-[15px] sm:text-[16px] !font-bold leading-none transition-colors ${
                      active ? palette.text : "text-gz-ink-light/70 group-hover:text-gz-ink-mid"
                    }`}
                  >
                    {tab.glyph}.
                  </span>
                  <span
                    className={`font-archivo text-[12px] sm:text-[13px] font-semibold whitespace-nowrap transition-colors ${
                      active ? "text-gz-ink" : "text-gz-ink-light group-hover:text-gz-ink"
                    }`}
                  >
                    <span className="hidden md:inline">{tab.label}</span>
                    <span className="md:hidden">{tab.short}</span>
                  </span>
                </>
              );
              const className = `group relative flex-shrink-0 flex items-center gap-2 px-3.5 sm:px-5 py-2.5 cursor-pointer transition-all duration-200 ease-out border-r border-gz-rule/70 last:border-r-0 ${
                active ? "bg-white" : "bg-transparent hover:bg-white/70"
              }`;

              // Tabs con href navegan a otra ruta (Investigaciones)
              if (tab.href) {
                return (
                  <Link key={tab.key} href={tab.href} className={className}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={className}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtítulo cursivo descriptivo de la sección activa */}
        <p className="mt-2 px-2 font-cormorant italic text-[13px] sm:text-[14px] text-gz-ink-mid">
          {activeTab.key === "feed" && "Reflexiones jurídicas breves — al margen de la doctrina."}
          {activeTab.key === "analisis" && "Sentencias diseccionadas — fallos comentados por colegas."}
          {activeTab.key === "ensayos" && "Ensayos académicos — la tribuna larga del estudio."}
          {activeTab.key === "expediente" && "Casos abiertos — el expediente colectivo del foro."}
          {activeTab.key === "debates" && "Tesis frente a tesis — la disputa intelectual ordenada."}
          {activeTab.key === "mis" && "Tu expediente personal — tus contribuciones al diario."}
        </p>
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      {activeMainTab === "feed" && (
        <div className="grid grid-cols-1 gap-7 md:gap-8 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_280px]">
          {/* Contingencia sidebar — left, hidden on mobile */}
          <aside className="hidden md:block min-w-0">
            <div className="sticky top-[72px]">
              <ObiterTrending />
            </div>
          </aside>

          {/* Feed column */}
          <div className="min-w-0">
            {/* Banner de filtro activo por #hashtag */}
            {hashtagParam && (
              <div className="mb-4 flex items-center justify-between rounded-[4px] border border-gz-burgundy/30 bg-gz-burgundy/[0.04] px-4 py-3">
                <div>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy mb-0.5 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
                    Filtrando por etiqueta
                  </p>
                  <p className="font-cormorant text-[22px] font-bold text-gz-ink leading-none">
                    #{hashtagParam}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.delete("hashtag");
                    router.replace(url.pathname + url.search, { scroll: false });
                  }}
                  className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy hover:text-gz-ink transition-colors cursor-pointer flex items-center gap-1"
                  aria-label="Limpiar filtro"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpiar
                </button>
              </div>
            )}
            <ObiterFeed
              userId={userId}
              userFirstName={userFirstName}
              userAvatarUrl={userAvatarUrl}
              prefillText={prefillText}
              hashtag={hashtagParam}
            />
          </div>

          {/* Right sidebar — hidden on tablet and mobile */}
          <aside className="hidden xl:block min-w-0">
            <div className="sticky top-[72px] space-y-5">
              {userId && <ContactSuggestions />}
              <RankingSidebar />
            </div>
          </aside>
        </div>
      )}

      {activeMainTab === "analisis" && <AnalisisListing />}

      {activeMainTab === "ensayos" && <EnsayosListing />}

      {activeMainTab === "expediente" && <ExpedienteTeaser />}

      {activeMainTab === "debates" && <DebatesTeaser />}

      {activeMainTab === "mis" && userId && (
        <MisPublicaciones userId={userId} />
      )}

      {/* Mobile ranking section (shown below content on small screens, hidden on xl when feed tab has it in sidebar) */}
      <div className={`mt-7 ${activeMainTab === "feed" ? "xl:hidden" : ""}`}>
        <MobileRankingSection />
      </div>
    </div>
  );
}

// ─── Mobile Ranking Collapsible ─────────────────────────────

function MobileRankingSection() {
  const [open, setOpen] = useState(false);

  if (open) {
    // Mostrar la tarjeta completa (ya trae rail + kicker propios)
    return (
      <div>
        <RankingSidebar />
        <button
          onClick={() => setOpen(false)}
          className="mt-2 w-full font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light hover:text-gz-ink transition-colors py-1 cursor-pointer"
        >
          ▲ Ocultar ranking
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setOpen(true)}
      className="w-full rounded-[3px] border border-gz-rule bg-white overflow-hidden cursor-pointer transition-colors hover:bg-gz-cream-dark/30 group"
    >
      <div className="h-[3px] bg-gz-gold" />
      <div className="flex w-full items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] font-semibold text-gz-gold">
            Top autores del diario
          </span>
        </div>
        <svg
          className="h-4 w-4 text-gz-ink-mid group-hover:text-gz-ink transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </button>
  );
}
