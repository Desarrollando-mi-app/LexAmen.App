"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  getRamaColor,
  RAMAS_DERECHO,
  CATEGORIA_NOTICIAS,
  getCategoriaColor,
} from "@/lib/derecho-colors";

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
  pinnedUntil?: string | null;
  pinnedTop?: boolean;
}

/**
 * Devuelve el href correcto para una noticia: las publicadas internamente
 * (cartas al director, columnas, editoriales) abren la página de lectura
 * interna; las externas siguen abriendo la fuente original.
 */
function noticiaHref(n: NoticiaItem): string {
  return n.fuente === "STUDIO_IURIS" ? `/dashboard/noticias/${n.id}` : n.urlFuente;
}

function noticiaIsInternal(n: NoticiaItem): boolean {
  return n.fuente === "STUDIO_IURIS";
}

interface Props {
  initialNoticias: NoticiaItem[];
}

/* ─── Constants ─── */

const SOURCE_COLORS: Record<string, string> = {
  BCN: "bg-gz-navy/10 text-gz-navy",
  BCN_BOLETIN: "bg-gz-navy/10 text-gz-navy",
  PODER_JUDICIAL: "bg-gz-sage/10 text-gz-sage",
  TC: "bg-gz-burgundy/10 text-gz-burgundy",
  DIARIO_OFICIAL: "bg-gz-ink-light/10 text-gz-ink-mid",
  COLEGIO_ABOGADOS: "bg-gz-gold/10 text-gz-gold",
  FISCALIA: "bg-red-100 text-red-800",
  DIRECCION_TRABAJO: "bg-emerald-100 text-emerald-800",
  CONTRALORIA: "bg-slate-100 text-slate-700",
  SII: "bg-amber-100 text-amber-800",
  CMF: "bg-blue-100 text-blue-800",
  DPP: "bg-rose-100 text-rose-700",
  MINREL: "bg-indigo-100 text-indigo-800",
};

/* ─── Helpers ─── */

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days}d`;
  const weeks = Math.floor(days / 7);
  return `hace ${weeks} sem.`;
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

function getCategoriaLabel(cat: string | null): string {
  const found = CATEGORIA_NOTICIAS.find((c) => c.value === cat);
  return found ? found.label : cat ?? "";
}

/* ─── Component ─── */

export function NoticiasClient({ initialNoticias }: Props) {
  const [noticias, setNoticias] = useState<NoticiaItem[]>(initialNoticias);
  const [categoriaFilter, setCategoriaFilter] = useState("");
  const [ramaFilter, setRamaFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialNoticias.length >= 20);

  // Color theming: rama overrides category
  const ramaColor = getRamaColor(ramaFilter || null);
  const catColor = getCategoriaColor(categoriaFilter);
  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-theme") === "dark";
  const pageBg = ramaFilter
    ? isDarkMode ? ramaColor.bgDark : ramaColor.bg
    : catColor
      ? isDarkMode ? catColor.bgDark : catColor.bg
      : undefined;
  const activeAccent = ramaFilter
    ? ramaColor.accent
    : catColor
      ? catColor.accent
      : "var(--gz-gold)";

  // Submit modal
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitCat, setSubmitCat] = useState<"columna_opinion" | "carta_director">("columna_opinion");
  const [submitRama, setSubmitRama] = useState("");
  const [submitCategoria, setSubmitCategoria] = useState("");
  const [submitTitulo, setSubmitTitulo] = useState("");
  const [submitContenido, setSubmitContenido] = useState("");
  const [submitSending, setSubmitSending] = useState(false);
  const [submitSent, setSubmitSent] = useState(false);

  // Detect if user is in columna_opinion or carta_director category
  const showSubmitButton = categoriaFilter === "columna_opinion" || categoriaFilter === "carta_director";
  const submitLabel = categoriaFilter === "carta_director" ? "Enviar Carta al Director" : "Enviar Columna de Opinión";

  async function handleSubmit() {
    if (!submitTitulo.trim() || !submitContenido.trim() || submitSending) return;
    setSubmitSending(true);
    try {
      // Create as pendiente noticia (admin will approve)
      const res = await fetch("/api/noticias/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: submitTitulo.trim(),
          contenido: submitContenido.trim(),
          categoria: submitCat,
          rama: submitRama || null,
          categoriaSecundaria: submitCategoria || null,
        }),
      });
      if (res.ok) {
        setSubmitSent(true);
        setTimeout(() => {
          setSubmitOpen(false);
          setSubmitSent(false);
          setSubmitTitulo("");
          setSubmitContenido("");
        }, 2500);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitSending(false);
    }
  }

  // Filtered noticias (client-side)
  const filtered = useMemo(() => {
    return noticias.filter((n) => {
      if (categoriaFilter && n.categoria !== categoriaFilter) return false;
      if (ramaFilter && n.rama !== ramaFilter) return false;
      return true;
    });
  }, [noticias, categoriaFilter, ramaFilter]);

  // Editorial fija (admin pinneó una editorial — arriba hasta retiro/reemplazo)
  const editorialPinneada =
    filtered.find((n) => n.pinnedTop && n.categoria === "editorial") ?? null;

  // Cartas / columnas vigentes (pinneadas por 1 semana). Se elevan al hero
  // junto con las destacadas regulares.
  const ahora = Date.now();
  const cartasYColumnasFijas = filtered.filter(
    (n) =>
      n.id !== editorialPinneada?.id &&
      n.pinnedUntil != null &&
      new Date(n.pinnedUntil).getTime() > ahora &&
      (n.categoria === "carta_director" || n.categoria === "columna_opinion"),
  );

  // Hero: pinned cartas/columnas primero, luego destacadas tradicionales,
  // hasta 3 en total. La editorial fija no entra al hero (tiene su propio slot).
  const heroPool = [
    ...cartasYColumnasFijas,
    ...filtered.filter(
      (n) =>
        n.destacada &&
        n.id !== editorialPinneada?.id &&
        !cartasYColumnasFijas.includes(n),
    ),
  ];
  const allFeatured = heroPool.slice(0, 3);
  const heroMain = allFeatured[0] ?? null;
  const heroSecondary = allFeatured.slice(1);
  const consumido = new Set([
    ...(editorialPinneada ? [editorialPinneada.id] : []),
    ...allFeatured.map((n) => n.id),
  ]);
  const nonFeatured = filtered.filter((n) => !consumido.has(n.id));

  // Group non-featured by date
  const groups = useMemo(() => {
    const map = new Map<string, NoticiaItem[]>();
    const order = ["Hoy", "Ayer", "Esta Semana", "Anteriores"];
    for (const o of order) map.set(o, []);
    for (const n of nonFeatured) {
      const g = getDateGroup(n.fechaAprobacion);
      map.get(g)!.push(n);
    }
    return order.filter((g) => (map.get(g)?.length ?? 0) > 0).map((g) => ({ label: g, items: map.get(g)! }));
  }, [nonFeatured]);

  // First group gets grid display, rest get dense list
  const gridGroup = groups[0];
  const listGroups = groups.slice(1);

  async function loadMore() {
    setLoading(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: "20" });
      const res = await fetch(`/api/noticias?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNoticias((prev) => [...prev, ...data.noticias]);
        setPage(nextPage);
        setHasMore(nextPage < data.totalPages);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen transition-colors duration-500"
      style={{ backgroundColor: pageBg }}
    >
      {/* ─── FULL-WIDTH HEADER ─── */}
      <div className="gz-section-header pt-8 pb-4">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-1">
          La Gaceta Jur&iacute;dica
        </p>
        <div className="flex items-center gap-3 mb-1">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={80}
            height={80}
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
          />
          <h1 className="font-cormorant text-[36px] lg:text-[44px] !font-bold text-gz-ink leading-none">
            Noticias Jur&iacute;dicas
          </h1>
        </div>
        <div className="mt-3 h-[2px] bg-gz-ink" />
        <div className="h-px bg-gz-ink mt-[3px]" />
      </div>

      {/* ─── CONTENT ─── */}
      <div className="px-4 sm:px-6 py-4">

        {/* ─── FILTERS BAR ─── */}
        <div className="mb-6 space-y-3">
          {/* Categoría tabs */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIA_NOTICIAS.map((cat) => {
              const cc = getCategoriaColor(cat.value);
              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoriaFilter(cat.value)}
                  className={`rounded-[3px] px-3 py-1.5 font-archivo text-[11px] font-semibold transition-colors ${
                    categoriaFilter === cat.value
                      ? "text-white"
                      : "border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold"
                  }`}
                  style={
                    categoriaFilter === cat.value
                      ? { backgroundColor: cc ? cc.accent : activeAccent }
                      : cc && cat.value
                        ? { borderColor: cc.accent + "40", color: cc.accent }
                        : undefined
                  }
                >
                  {cat.label}
                </button>
              );
            })}

            {/* Submit button for columna/carta */}
            {showSubmitButton && (
              <button
                onClick={() => {
                  setSubmitCat(categoriaFilter as "columna_opinion" | "carta_director");
                  setSubmitOpen(true);
                }}
                className="ml-auto rounded-[3px] px-4 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: activeAccent }}
              >
                ✍️ {submitLabel}
              </button>
            )}
          </div>

          {/* Materia dropdown */}
          <div className="flex items-center gap-3">
            <label className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light">
              Materia
            </label>
            <select
              value={ramaFilter}
              onChange={(e) => setRamaFilter(e.target.value)}
              className="rounded-[3px] border border-gz-rule bg-white/80 px-3 py-1.5 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
              style={
                ramaFilter
                  ? { borderColor: ramaColor.accent, color: ramaColor.accent }
                  : undefined
              }
            >
              {RAMAS_DERECHO.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {ramaFilter && (
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: ramaColor.accent }}
                title={ramaColor.label}
              />
            )}
          </div>
        </div>

        <div className="h-px bg-gz-rule mb-6" />

        {/* ─── EDITORIAL FIJA ─── */}
        {editorialPinneada && (
          <a
            href={noticiaHref(editorialPinneada)}
            target={noticiaIsInternal(editorialPinneada) ? undefined : "_blank"}
            rel={noticiaIsInternal(editorialPinneada) ? undefined : "noopener noreferrer"}
            className="group block mb-8 relative overflow-hidden rounded-[4px] border border-gz-ink/15 bg-gradient-to-br from-gz-cream-dark/40 via-white to-gz-cream-dark/30 p-5 sm:p-6 hover:border-gz-gold/60 transition-colors"
          >
            <div className="absolute top-0 left-0 h-full w-[4px] bg-gz-ink" />
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
                Fija · Editorial
              </span>
              <span className="font-cormorant text-[14px] text-gz-gold leading-none">✠</span>
            </div>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy mb-1">
              Editorial
            </p>
            <h2 className="font-cormorant text-[28px] sm:text-[34px] !font-bold text-gz-ink leading-[1.1] group-hover:text-gz-burgundy transition-colors">
              {editorialPinneada.titulo}
            </h2>
            {editorialPinneada.resumen && editorialPinneada.resumen !== editorialPinneada.titulo && (
              <p className="mt-2 font-cormorant italic text-[16px] leading-relaxed text-gz-ink-mid line-clamp-3">
                {editorialPinneada.resumen}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                {editorialPinneada.fuenteNombre}
              </span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">·</span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                {timeAgo(editorialPinneada.fechaAprobacion)}
              </span>
              <span className="ml-auto font-archivo text-[12px] text-gz-gold group-hover:text-gz-burgundy transition-colors">
                Leer editorial →
              </span>
            </div>
          </a>
        )}

        {/* ─── FEATURED HERO (up to 3 destacadas) ─── */}
        {heroMain && (
          <div className="mb-8">
            <p
              className="font-ibm-mono text-[9px] uppercase tracking-[2px] mb-4"
              style={{ color: ramaFilter ? ramaColor.accent : "var(--gz-gold)" }}
            >
              ★ Destacadas
            </p>

            <div className={`grid gap-6 ${heroSecondary.length > 0 ? "lg:grid-cols-[2fr_1fr]" : ""}`}>
              {/* Main hero */}
              <a
                href={noticiaHref(heroMain)}
                target={noticiaIsInternal(heroMain) ? undefined : "_blank"}
                rel={noticiaIsInternal(heroMain) ? undefined : "noopener noreferrer"}
                className="group block"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {heroMain.categoria && (
                    <span
                      className="rounded-[2px] px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-white"
                      style={{
                        backgroundColor: ramaFilter
                          ? ramaColor.accent
                          : heroMain.rama
                            ? getRamaColor(heroMain.rama).accent
                            : "var(--gz-gold)",
                      }}
                    >
                      {getCategoriaLabel(heroMain.categoria)}
                    </span>
                  )}
                  <span className={`rounded-[2px] px-2 py-0.5 font-ibm-mono text-[9px] ${SOURCE_COLORS[heroMain.fuente] ?? "bg-gz-rule/30 text-gz-ink-mid"}`}>
                    {heroMain.fuenteNombre}
                  </span>
                </div>
                <h2 className="font-cormorant text-[28px] lg:text-[36px] !font-bold text-gz-ink leading-[1.15] group-hover:text-gz-gold transition-colors">
                  {heroMain.titulo}
                </h2>
                {heroMain.resumen && heroMain.resumen !== heroMain.titulo && (
                  <p className="mt-2 font-cormorant text-[16px] leading-relaxed text-gz-ink-mid line-clamp-3">
                    {heroMain.resumen}
                  </p>
                )}
                <p className="mt-2 font-ibm-mono text-[10px] text-gz-ink-light">
                  {timeAgo(heroMain.fechaAprobacion)}
                </p>
              </a>

              {/* Secondary heroes (right column) */}
              {heroSecondary.length > 0 && (
                <div className="flex flex-col gap-4 border-l border-gz-rule pl-6">
                  {heroSecondary.map((n) => (
                    <a
                      key={n.id}
                      href={noticiaHref(n)}
                      target={noticiaIsInternal(n) ? undefined : "_blank"}
                      rel={noticiaIsInternal(n) ? undefined : "noopener noreferrer"}
                      className="group block"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {n.categoria && (
                          <span
                            className="rounded-[2px] px-1.5 py-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[0.5px] text-white"
                            style={{
                              backgroundColor: n.rama
                                ? getRamaColor(n.rama).accent
                                : "var(--gz-gold)",
                            }}
                          >
                            {getCategoriaLabel(n.categoria)}
                          </span>
                        )}
                        <span className="font-ibm-mono text-[8px] text-gz-ink-light">
                          {n.fuenteNombre}
                        </span>
                      </div>
                      <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink leading-snug group-hover:text-gz-gold transition-colors line-clamp-3">
                        {n.titulo}
                      </h3>
                      {n.resumen && n.resumen !== n.titulo && (
                        <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid line-clamp-2">
                          {n.resumen}
                        </p>
                      )}
                      <p className="mt-1 font-ibm-mono text-[9px] text-gz-ink-light">
                        {timeAgo(n.fechaAprobacion)}
                      </p>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 h-px bg-gz-rule" />
          </div>
        )}

        {/* ─── GRID (first group) ─── */}
        {gridGroup && (
          <div className="mb-8">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-4">
              {gridGroup.label}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
              {gridGroup.items.map((n) => (
                <NoticiaDenseCard key={n.id} noticia={n} ramaFilter={ramaFilter} />
              ))}
            </div>
            <div className="mt-6 h-px bg-gz-rule" />
          </div>
        )}

        {/* ─── DENSE LIST (remaining groups) ─── */}
        {listGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-3">
              {group.label}
            </p>
            <div className="divide-y divide-gz-rule/30">
              {group.items.map((n) => (
                <NoticiaLineItem key={n.id} noticia={n} ramaFilter={ramaFilter} />
              ))}
            </div>
            <div className="mt-4 h-px bg-gz-rule" />
          </div>
        ))}

        {/* ─── EMPTY STATE ─── */}
        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="font-cormorant italic text-[18px] text-gz-ink-light">
              No hay noticias para estos filtros.
            </p>
          </div>
        )}

        {/* ─── LOAD MORE ─── */}
        {hasMore && filtered.length > 0 && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="rounded-[3px] border border-gz-rule px-8 py-2.5 font-archivo text-[13px] font-semibold text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-gold disabled:opacity-50"
            >
              {loading ? "Cargando..." : "Cargar m\u00e1s noticias"}
            </button>
          </div>
        )}
        </div>

      {/* ─── SUBMIT MODAL (Columna de Opinión / Carta al Director) ─── */}
      {submitOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSubmitOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-[4px] border border-gz-rule p-6 shadow-xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: "var(--gz-cream)" }}>
            {submitSent ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gz-sage/10">
                  <span className="text-xl text-gz-sage">✓</span>
                </div>
                <p className="mt-4 font-cormorant text-[18px] !font-bold text-gz-ink">
                  Enviado para revisión
                </p>
                <p className="mt-1 font-archivo text-[13px] text-gz-ink-light">
                  Un editor lo revisará pronto.
                </p>
              </div>
            ) : (
              <>
                <h3 className="font-cormorant text-[22px] !font-bold text-gz-ink mb-1">
                  {submitCat === "carta_director" ? "Carta al Director" : "Columna de Opinión"}
                </h3>
                <p className="font-archivo text-[13px] text-gz-ink-light mb-4">
                  {submitCat === "carta_director"
                    ? "Escribe tu carta dirigida al editor. Será revisada antes de publicarse."
                    : "Comparte tu análisis u opinión sobre un tema jurídico. Será revisada antes de publicarse."}
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Título</label>
                    <input
                      type="text"
                      value={submitTitulo}
                      onChange={(e) => setSubmitTitulo(e.target.value)}
                      placeholder="Título de tu columna o carta..."
                      maxLength={200}
                      className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Categoría temática</label>
                      <select
                        value={submitCategoria}
                        onChange={(e) => setSubmitCategoria(e.target.value)}
                        className="w-full rounded-[3px] border border-gz-rule bg-white px-2 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      >
                        <option value="">Sin categoría</option>
                        {CATEGORIA_NOTICIAS.filter(c => c.value && !["columna_opinion", "carta_director", "editorial"].includes(c.value)).map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Área del Derecho</label>
                      <select
                        value={submitRama}
                        onChange={(e) => setSubmitRama(e.target.value)}
                        className="w-full rounded-[3px] border border-gz-rule bg-white px-2 py-2 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
                      >
                        {RAMAS_DERECHO.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">Contenido</label>
                    <textarea
                      value={submitContenido}
                      onChange={(e) => setSubmitContenido(e.target.value)}
                      placeholder="Escribe el cuerpo de tu columna o carta..."
                      rows={10}
                      maxLength={5000}
                      className="w-full resize-y rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                    />
                    <p className="mt-1 text-right font-ibm-mono text-[9px] text-gz-ink-light">
                      {submitContenido.length} / 5.000
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setSubmitOpen(false)} className="rounded-[3px] px-4 py-2 font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={!submitTitulo.trim() || !submitContenido.trim() || submitSending}
                      className="rounded-[3px] px-5 py-2 font-archivo text-[13px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: activeAccent }}
                    >
                      {submitSending ? "Enviando..." : "Enviar para revisión"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function NoticiaDenseCard({
  noticia: n,
  ramaFilter,
}: {
  noticia: NoticiaItem;
  ramaFilter: string;
}) {
  // Use the noticia's own rama for coloring (not the global filter)
  const noticiaRamaColor = getRamaColor(n.rama);
  const ramaColor = getRamaColor(ramaFilter || n.rama);
  const borderColor = n.rama ? noticiaRamaColor.accent : "var(--gz-rule)";
  const cardBg = n.rama ? noticiaRamaColor.accentLight : "transparent";

  return (
    <div
      className="group/card border-l-[3px] pl-4 py-2 transition-all duration-300 hover:pl-5 rounded-r-[3px]"
      style={{ borderColor, backgroundColor: cardBg }}
    >
      <a
        href={noticiaHref(n)}
        target={noticiaIsInternal(n) ? undefined : "_blank"}
        rel={noticiaIsInternal(n) ? undefined : "noopener noreferrer"}
        className="block"
      >
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {n.categoria && (
            <span
              className="rounded-[2px] px-1.5 py-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[0.5px]"
              style={{
                backgroundColor: ramaColor.accentLight,
                color: ramaColor.accent,
              }}
            >
              {getCategoriaLabel(n.categoria)}
            </span>
          )}
          <span className="font-ibm-mono text-[8px] text-gz-ink-light">
            {n.fuenteNombre}
          </span>
        </div>
        <h3 className="font-cormorant text-[18px] !font-bold text-gz-ink leading-snug group-hover/card:text-gz-gold transition-colors line-clamp-3">
          {n.titulo}
        </h3>
        {/* Resumen: hidden by default, revealed on hover — only if different from title */}
        {n.resumen && n.resumen !== n.titulo && (
          <div className="grid grid-rows-[0fr] group-hover/card:grid-rows-[1fr] transition-[grid-template-rows] duration-300">
            <div className="overflow-hidden">
              <p className="mt-1 font-archivo text-[12px] text-gz-ink-mid leading-relaxed opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 delay-100">
                {n.resumen}
              </p>
            </div>
          </div>
        )}
        <p className="mt-1 font-ibm-mono text-[9px] text-gz-ink-light">
          {timeAgo(n.fechaAprobacion)}
        </p>
      </a>
      {/* Actions: hidden until hover */}
      <div className="mt-1 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
        <NoticiaActions noticiaId={n.id} urlFuente={n.urlFuente} titulo={n.titulo} />
      </div>
    </div>
  );
}

function NoticiaLineItem({
  noticia: n,
  ramaFilter,
}: {
  noticia: NoticiaItem;
  ramaFilter: string;
}) {
  const ramaColor = getRamaColor(ramaFilter || n.rama);

  return (
    <a
      href={noticiaHref(n)}
      target={noticiaIsInternal(n) ? undefined : "_blank"}
      rel={noticiaIsInternal(n) ? undefined : "noopener noreferrer"}
      className="group flex items-baseline gap-3 py-2"
    >
      {n.categoria && (
        <span
          className="shrink-0 rounded-[2px] px-1.5 py-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[0.5px]"
          style={{
            backgroundColor: ramaColor.accentLight,
            color: ramaColor.accent,
          }}
        >
          {getCategoriaLabel(n.categoria)}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-cormorant text-[16px] font-semibold text-gz-ink group-hover:text-gz-gold transition-colors">
        {n.titulo}
      </span>
      <span className="shrink-0 font-ibm-mono text-[9px] text-gz-ink-light">
        {n.fuenteNombre}
      </span>
      <span className="shrink-0 font-ibm-mono text-[9px] text-gz-ink-light">
        {timeAgo(n.fechaAprobacion)}
      </span>
    </a>
  );
}

/* ─── Action Buttons (guardar / compartir) ─── */

function NoticiaActions({
  noticiaId,
  urlFuente,
  titulo,
}: {
  noticiaId: string;
  urlFuente: string;
  titulo: string;
}) {
  const [guardada, setGuardada] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [odOpen, setOdOpen] = useState(false);
  const [odText, setOdText] = useState("");
  const [odSending, setOdSending] = useState(false);
  const [odSent, setOdSent] = useState(false);
  const [odError, setOdError] = useState("");

  async function handlePublishOD() {
    if (!odText.trim() || odSending) return;
    setOdSending(true);
    setOdError("");
    try {
      const res = await fetch("/api/obiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: odText.trim(),
          tipo: "opinion",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setOdSent(true);
        setTimeout(() => { setOdOpen(false); setOdSent(false); setOdText(""); setShareOpen(false); setOdError(""); }, 2000);
      } else {
        setOdError(data.error || `Error ${res.status}`);
      }
    } catch {
      setOdError("Error de conexión");
    } finally {
      setOdSending(false);
    }
  }

  async function handleGuardar() {
    try {
      const res = await fetch(`/api/noticias/${noticiaId}/guardar`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setGuardada(data.guardada);
      }
    } catch {
      // silently fail
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(urlFuente).then(() => {
      setCopied(true);
      setTimeout(() => { setCopied(false); setShareOpen(false); }, 1500);
    }).catch(() => {
      // Fallback: create temp input
      const input = document.createElement("input");
      input.value = urlFuente;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => { setCopied(false); setShareOpen(false); }, 1500);
    });
  }

  const shareText = encodeURIComponent(titulo);
  const shareUrl = encodeURIComponent(urlFuente);

  return (
    <div className="flex items-center gap-3 relative">
      <button
        onClick={handleGuardar}
        className={`font-ibm-mono text-[9px] transition-colors ${
          guardada ? "text-gz-gold" : "text-gz-ink-light hover:text-gz-gold"
        }`}
        title={guardada ? "Guardada" : "Guardar"}
      >
        {guardada ? "🔖" : "☆"} {guardada ? "Guardada" : "Guardar"}
      </button>

      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setShareOpen(!shareOpen); }}
          className="font-ibm-mono text-[9px] text-gz-ink-light hover:text-gz-gold transition-colors"
        >
          🔗 Compartir
        </button>

        {/* Share dropdown — opens downward */}
        {shareOpen && (
          <>
            {/* Invisible backdrop to close on click outside */}
            <div className="fixed inset-0 z-40" onClick={() => setShareOpen(false)} />
            <div className="absolute top-full left-0 mt-1 z-50 w-56 rounded-[4px] border border-gz-rule bg-white shadow-lg py-1">
          <p className="px-3 py-1.5 font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light">
            Compartir en
          </p>
          <a
            href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-ink hover:bg-gz-cream transition-colors"
          >
            💬 WhatsApp
          </a>
          <a
            href={`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-ink hover:bg-gz-cream transition-colors"
          >
            𝕏 Twitter / X
          </a>
          <a
            href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-ink hover:bg-gz-cream transition-colors"
          >
            💼 LinkedIn
          </a>
          <a
            href={`mailto:?subject=${shareText}&body=${shareUrl}`}
            className="flex items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-ink hover:bg-gz-cream transition-colors"
          >
            📧 Email
          </a>
          <button
            onClick={handleCopyLink}
            className="flex w-full items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-ink hover:bg-gz-cream transition-colors"
          >
            {copied ? "✓ Copiado" : "📋 Copiar enlace"}
          </button>
          <div className="border-t border-gz-rule/30 mt-1 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); setOdOpen(true); setShareOpen(false); }}
              className="flex w-full items-center gap-2 px-3 py-2 font-archivo text-[12px] text-gz-gold hover:bg-gz-cream transition-colors"
            >
              ✍️ Publicar como Obiter Dictum
            </button>
          </div>
            </div>
          </>
        )}
      </div>

      {/* OD Compose Modal */}
      {odOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) setOdOpen(false); }}>
          <div className="w-full max-w-md rounded-[4px] border border-gz-rule p-5 shadow-xl" style={{ backgroundColor: "var(--gz-cream)" }}>
            {odSent ? (
              <div className="flex flex-col items-center py-6 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-sage/10">
                  <span className="text-lg text-gz-sage">✓</span>
                </div>
                <p className="mt-3 font-cormorant text-[16px] !font-bold text-gz-ink">Obiter publicado</p>
              </div>
            ) : (
              <>
                <h3 className="font-cormorant text-[18px] !font-bold text-gz-ink mb-3">
                  Publicar como Obiter Dictum
                </h3>

                {/* Preview de la noticia */}
                <div className="mb-3 rounded-[3px] border border-gz-rule bg-white/60 p-3">
                  <p className="font-cormorant text-[14px] font-semibold text-gz-ink line-clamp-2">{titulo}</p>
                  <p className="mt-1 font-ibm-mono text-[9px] text-gz-ink-light truncate">{urlFuente}</p>
                </div>

                {/* Texto del usuario */}
                <div className="mb-3">
                  <label className="mb-1 block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                    Tu reflexión{" "}
                    <span className={odText.length > 256 ? "text-gz-burgundy" : "text-gz-ink-light"}>
                      ({odText.length}/256)
                    </span>
                  </label>
                  <textarea
                    value={odText}
                    onChange={(e) => { if (e.target.value.length <= 256) setOdText(e.target.value); }}
                    placeholder="Escribe tu reflexión sobre esta noticia..."
                    rows={2}
                    className="w-full resize-none rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                    autoFocus
                  />
                </div>

                {odError && (
                  <p className="mb-2 rounded-[3px] border border-gz-burgundy/30 bg-gz-burgundy/5 px-3 py-1.5 font-archivo text-[11px] text-gz-burgundy">
                    {odError}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <button onClick={() => { setOdOpen(false); setOdError(""); }} className="rounded-[3px] px-3 py-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink">
                    Cancelar
                  </button>
                  <button
                    onClick={handlePublishOD}
                    disabled={!odText.trim() || odSending}
                    className="rounded-[3px] bg-gz-gold px-4 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold-bright disabled:opacity-50 transition-colors"
                  >
                    {odSending ? "Publicando..." : "Publicar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
