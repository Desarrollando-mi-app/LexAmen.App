"use client";

import { useState, useMemo } from "react";

/* ─── Types ─── */

interface NoticiaItem {
  id: string;
  titulo: string;
  resumen: string | null;
  urlFuente: string;
  fuente: string;
  fuenteNombre: string;
  categoria: string | null;
  rama: string | null;
  imagenUrl: string | null;
  destacada: boolean;
  fechaAprobacion: string | null;
  fechaPublicacionFuente: string | null;
}

interface FuenteOption {
  value: string;
  label: string;
}

interface Props {
  initialNoticias: NoticiaItem[];
  fuentes: FuenteOption[];
  categorias: string[];
}

/* ─── Constants ─── */

const SOURCE_COLORS: Record<string, string> = {
  BCN: "bg-gz-navy/10 text-gz-navy",
  BCN_BOLETIN: "bg-gz-navy/10 text-gz-navy",
  PODER_JUDICIAL: "bg-gz-sage/10 text-gz-sage",
  TC: "bg-gz-burgundy/10 text-gz-burgundy",
  DIARIO_OFICIAL: "bg-gz-ink-light/10 text-gz-ink-mid",
  COLEGIO_ABOGADOS: "bg-gz-gold/10 text-gz-gold",
};

const CATEGORIA_LABELS: Record<string, string> = {
  nueva_ley: "Nueva Ley",
  sentencia: "Sentencia",
  normativa: "Normativa",
  institucional: "Institucional",
  gremial: "Gremial",
};

/* ─── Helpers ─── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} d\u00edas`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} semana${weeks > 1 ? "s" : ""}`;
}

function getDateGroup(dateStr: string | null): string {
  if (!dateStr) return "Anteriores";
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  if (date >= today) return "Hoy";
  if (date >= yesterday) return "Ayer";
  if (date >= weekAgo) return "Esta Semana";
  return "Anteriores";
}

/* ─── Component ─── */

export function NoticiasClient({ initialNoticias, fuentes, categorias }: Props) {
  const [noticias, setNoticias] = useState<NoticiaItem[]>(initialNoticias);
  const [fuenteFilter, setFuenteFilter] = useState<string>("todas");
  const [categoriaFilter, setCategoriaFilter] = useState<string>("todas");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialNoticias.length >= 20);

  // Filter noticias client-side
  const filtered = useMemo(() => {
    return noticias.filter((n) => {
      if (fuenteFilter !== "todas" && n.fuente !== fuenteFilter) return false;
      if (categoriaFilter !== "todas" && n.categoria !== categoriaFilter) return false;
      return true;
    });
  }, [noticias, fuenteFilter, categoriaFilter]);

  // Group by day
  const grouped = useMemo(() => {
    const groups: Record<string, NoticiaItem[]> = {};
    const order = ["Hoy", "Ayer", "Esta Semana", "Anteriores"];
    for (const label of order) groups[label] = [];

    for (const n of filtered) {
      const group = getDateGroup(n.fechaAprobacion);
      groups[group].push(n);
    }

    return order
      .filter((label) => groups[label].length > 0)
      .map((label) => ({ label, items: groups[label] }));
  }, [filtered]);

  // Load more
  async function loadMore() {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/noticias?page=${nextPage}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (data.noticias && data.noticias.length > 0) {
          setNoticias((prev) => [...prev, ...data.noticias]);
          setPage(nextPage);
          if (nextPage >= data.totalPages) setHasMore(false);
        } else {
          setHasMore(false);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 lg:px-10 pb-20">
      {/* ─── Filters ─── */}
      <div className="flex flex-wrap items-center gap-3 py-4 border-b border-gz-rule mb-6">
        <label className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">
          Fuente
        </label>
        <select
          value={fuenteFilter}
          onChange={(e) => setFuenteFilter(e.target.value)}
          className="font-archivo text-[13px] text-gz-ink bg-transparent border border-gz-rule rounded-sm px-3 py-1.5 focus:outline-none focus:border-gz-gold"
        >
          <option value="todas">Todas las fuentes</option>
          {fuentes.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <label className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light ml-4">
          Categor&iacute;a
        </label>
        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          className="font-archivo text-[13px] text-gz-ink bg-transparent border border-gz-rule rounded-sm px-3 py-1.5 focus:outline-none focus:border-gz-gold"
        >
          <option value="todas">Todas las categor&iacute;as</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {CATEGORIA_LABELS[c] ?? c}
            </option>
          ))}
        </select>
      </div>

      {/* ─── Grouped noticias ─── */}
      {grouped.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-cormorant italic text-[18px] text-gz-ink-light">
            No hay noticias jur&iacute;dicas disponibles.
          </p>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label} className="mb-8">
            {/* Group header */}
            <div className="flex items-center gap-3 mb-4">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium whitespace-nowrap">
                {group.label}
              </p>
              <div className="flex-1 h-px bg-gz-rule" />
            </div>

            {/* Noticias list */}
            <div className="divide-y divide-gz-rule">
              {group.items.map((noticia) => (
                <article key={noticia.id} className="py-5 first:pt-0">
                  <div className="flex items-start gap-3">
                    {/* Star for destacada */}
                    {noticia.destacada && (
                      <span className="text-gz-gold text-[16px] mt-0.5 shrink-0" title="Destacada">
                        &#9733;
                      </span>
                    )}

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3 className="font-cormorant text-[18px] font-bold text-gz-ink leading-snug mb-2">
                        {noticia.titulo}
                      </h3>

                      {/* Meta row: source badge + categoria + rama + time */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`inline-block font-ibm-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm font-medium ${
                            SOURCE_COLORS[noticia.fuente] ?? "bg-gz-ink-light/10 text-gz-ink-mid"
                          }`}
                        >
                          {noticia.fuenteNombre}
                        </span>

                        {noticia.categoria && (
                          <span className="font-ibm-mono text-[9px] uppercase tracking-[0.5px] text-gz-ink-light px-1.5 py-0.5 bg-gz-cream-dark rounded-sm">
                            {CATEGORIA_LABELS[noticia.categoria] ?? noticia.categoria}
                          </span>
                        )}

                        {noticia.rama && (
                          <span className="font-ibm-mono text-[9px] uppercase tracking-[0.5px] text-gz-ink-light px-1.5 py-0.5 bg-gz-cream-dark rounded-sm">
                            {noticia.rama}
                          </span>
                        )}

                        <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                          {timeAgo(noticia.fechaAprobacion)}
                        </span>
                      </div>

                      {/* Resumen preview */}
                      {noticia.resumen && (
                        <p className="font-archivo text-[14px] text-gz-ink-mid leading-relaxed line-clamp-2 mb-3">
                          {noticia.resumen}
                        </p>
                      )}

                      {/* Link to original source */}
                      <a
                        href={noticia.urlFuente}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                      >
                        Leer en fuente original &rarr;
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ─── Load more ─── */}
      {hasMore && filtered.length > 0 && (
        <div className="text-center pt-4 border-t border-gz-rule">
          <button
            onClick={loadMore}
            disabled={loading}
            className="font-archivo text-[13px] font-semibold text-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50 px-6 py-2.5 border border-gz-rule rounded-sm hover:border-gz-gold"
          >
            {loading ? "Cargando..." : "Cargar m\u00e1s"}
          </button>
        </div>
      )}
    </div>
  );
}
