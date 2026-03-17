"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { ObiterFeed } from "./components/obiter-feed";
import { ObiterTrending } from "./components/obiter-trending";
import { ContactSuggestions } from "./components/contact-suggestions";

// ─── Types ──────────────────────────────────────────────────

type DiarioPageClientProps = {
  userId: string | null;
  userFirstName?: string;
  userAvatarUrl?: string | null;
  // Existing DiarioFeed props
  diarioFeedElement: React.ReactNode;
};

type MainTab = "feed" | "analisis" | "ensayos" | "mis";

const TABS: { key: MainTab; label: string; requiresAuth?: boolean }[] = [
  { key: "feed", label: "Obiter Dictum" },
  { key: "analisis", label: "Análisis de Sentencia" },
  { key: "ensayos", label: "Ensayos" },
  { key: "mis", label: "Mis Publicaciones", requiresAuth: true },
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
          url = `/api/obiter?feed=recientes&userId=${userId}&limit=20`;
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
        url = `/api/obiter?feed=recientes&userId=${userId}&limit=20&cursor=${nextCursor}`;
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
              return (
                <div
                  key={item.id}
                  className="rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
                >
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
                  </div>
                </div>
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

function AnalisisListing() {
  return (
    <div>
      {/* Render a lightweight iframe-like inline listing */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-burgundy font-semibold">
          Análisis de Sentencias
        </p>
        <div className="flex gap-2">
          <Link
            href="/dashboard/diario/analisis"
            className="font-archivo text-[12px] text-gz-gold hover:underline"
          >
            Ver todos →
          </Link>
          <Link
            href="/dashboard/diario/analisis/nuevo"
            className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            + Nuevo Análisis
          </Link>
        </div>
      </div>
      <AnalisisListingContent />
    </div>
  );
}

function AnalisisListingContent() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/analisis?limit=10", {
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
        `/api/diario/analisis?limit=10&cursor=${nextCursor}`,
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
          Aún no hay análisis publicados.
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
          </div>
          <h4 className="mb-1 font-cormorant text-[17px] font-bold leading-tight text-gz-ink">
            {item.titulo}
          </h4>
          <p className="mb-2 font-ibm-mono text-[10px] text-gz-ink-mid">
            {item.tribunal} · Rol {item.numeroRol}
          </p>
          <p className="line-clamp-2 font-cormorant text-[14px] leading-relaxed text-gz-ink-mid">
            {item.resumen}
          </p>
          <div className="mt-2 flex items-center gap-2 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
            <span>Apoyar {item.apoyosCount ?? 0}</span>
            <span className="text-gz-ink-light/30">·</span>
            <span>Citar {item.citasCount ?? 0}</span>
            <span className="text-gz-ink-light/30">·</span>
            <span>{item.tiempoLectura ?? 5} min</span>
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
}: DiarioPageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(() => {
    if (tabParam === "analisis") return "analisis";
    if (tabParam === "ensayos") return "ensayos";
    if (tabParam === "mis") return "mis";
    return "feed";
  });

  // React to query param changes
  useEffect(() => {
    if (tabParam === "analisis") setActiveMainTab("analisis");
    else if (tabParam === "ensayos") setActiveMainTab("ensayos");
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

  return (
    <div>
      {/* ── Header: Title + Tabs + Publish in one line ────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-0 overflow-x-auto">
          {/* Title — hidden on mobile (kicker already identifies the page) */}
          <div className="mr-1 hidden flex-shrink-0 items-center gap-3 border-r border-gz-rule pr-4 sm:flex">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <span className="font-cormorant text-[38px] lg:text-[44px] font-bold leading-none text-gz-ink">
              El Diario
            </span>
          </div>

          {/* Tabs */}
          {TABS.filter((t) => !t.requiresAuth || userId).map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex-shrink-0 whitespace-nowrap px-3 py-2 font-archivo text-[13px] font-semibold transition-colors lg:px-4 ${
                activeMainTab === tab.key
                  ? "border-b-2 border-gz-gold text-gz-ink"
                  : "text-gz-ink-light hover:text-gz-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Publish dropdown — pushed to the right */}
          {userId && (
            <div className="ml-auto flex-shrink-0">
              <PublishDropdown />
            </div>
          )}
        </div>
        <div className="mt-1 h-[2px] bg-gz-rule-dark" />
      </div>

      {/* ── Tab content ──────────────────────────────────────── */}
      {activeMainTab === "feed" && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr] lg:grid-cols-[240px_1fr_240px]">
          {/* Contingencia sidebar — left, hidden on mobile */}
          <aside className="hidden md:block">
            <div className="sticky top-[72px]">
              <ObiterTrending />
            </div>
          </aside>

          {/* Feed column */}
          <div className="min-w-0">
            <ObiterFeed
              userId={userId}
              userFirstName={userFirstName}
              userAvatarUrl={userAvatarUrl}
            />
          </div>

          {/* Sugerencias sidebar — right, hidden on tablet and mobile */}
          {userId && (
            <aside className="hidden lg:block">
              <div className="sticky top-[72px]">
                <ContactSuggestions />
              </div>
            </aside>
          )}
        </div>
      )}

      {activeMainTab === "analisis" && <AnalisisListing />}

      {activeMainTab === "ensayos" && <EnsayosListing />}

      {activeMainTab === "mis" && userId && (
        <MisPublicaciones userId={userId} />
      )}
    </div>
  );
}
