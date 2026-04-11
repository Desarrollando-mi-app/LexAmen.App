"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Noticia {
  id: string;
  titulo: string;
  resumen: string | null;
  urlFuente: string;
  fuente: string;
  fuenteNombre: string;
  categoria: string | null;
  rama: string | null;
  imagenUrl: string | null;
  estado: string;
  destacada: boolean;
  fechaPublicacionFuente: string | null;
  fechaRecopilacion: string;
  fechaAprobacion: string | null;
  aprobadaPor: string | null;
  notasAdmin: string | null;
  tituloSugerido: string | null;
  motivoLey: string | null;
  numeroLey: string | null;
  leyesModificadas: string | null;
  comentarioAdmin: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CronResult {
  nuevas: number;
  duplicadas: number;
  errores: string[];
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { key: "pendiente", label: "Pendientes" },
  { key: "aprobada", label: "Aprobadas" },
  { key: "rechazada", label: "Rechazadas" },
  { key: "", label: "Todas" },
] as const;

const FUENTES = [
  { value: "", label: "Todas las fuentes" },
  { value: "BCN", label: "BCN" },
  { value: "BCN_BOLETIN", label: "BCN Boletín" },
  { value: "PODER_JUDICIAL", label: "Poder Judicial" },
  { value: "TC", label: "Tribunal Constitucional" },
  { value: "DIARIO_OFICIAL", label: "Diario Oficial" },
  { value: "COLEGIO_ABOGADOS", label: "Colegio de Abogados" },
  { value: "FISCALIA", label: "Fiscalía" },
  { value: "DIRECCION_TRABAJO", label: "Dir. Trabajo" },
  { value: "CONTRALORIA", label: "Contraloría" },
  { value: "SII", label: "SII" },
  { value: "CMF", label: "CMF" },
  { value: "DPP", label: "Defensoría Penal" },
  { value: "MINREL", label: "Cancillería" },
  { value: "MIN_JUSTICIA", label: "Min. Justicia" },
  { value: "MINTRAB", label: "Min. Trabajo" },
  { value: "MIN_HACIENDA", label: "Min. Hacienda" },
];

const CATEGORIAS = [
  { value: "normativa", label: "Normativa" },
  { value: "nueva_ley", label: "Nueva Ley" },
  { value: "sentencia", label: "Sentencia" },
  { value: "gremial", label: "Gremial" },
  { value: "doctrina", label: "Doctrina" },
  { value: "internacional", label: "Internacional" },
  { value: "columna_opinion", label: "Columna de Opinión" },
  { value: "carta_director", label: "Carta al Director" },
  { value: "editorial", label: "Editorial" },
];

const RAMAS = [
  { value: "", label: "Sin rama" },
  { value: "civil", label: "Civil" },
  { value: "penal", label: "Penal" },
  { value: "constitucional", label: "Constitucional" },
  { value: "laboral", label: "Laboral" },
  { value: "administrativo", label: "Administrativo" },
  { value: "comercial", label: "Comercial" },
  { value: "procesal", label: "Procesal" },
  { value: "tributario", label: "Tributario" },
  { value: "familia", label: "Familia" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function NoticiasAdminPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pendiente");
  const [fuenteFilter, setFuenteFilter] = useState("");

  // Cron
  const [runningCron, setRunningCron] = useState(false);
  const [cronResult, setCronResult] = useState<CronResult | null>(null);

  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);
  // Title editing
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editedTitleValue, setEditedTitleValue] = useState("");

  // Approval modal
  const [approvingNoticia, setApprovingNoticia] = useState<Noticia | null>(null);
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalRama, setApprovalRama] = useState("");
  const [approvalCategoria, setApprovalCategoria] = useState("");

  // Rama filter
  const [ramaFilter, setRamaFilter] = useState("");

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === noticias.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(noticias.map((n) => n.id)));
  }
  async function batchApprove() {
    setBatchLoading(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await fetch(`/api/noticias/admin/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "aprobada" }),
      }).catch(() => {});
    }
    setSelectedIds(new Set());
    setBatchLoading(false);
    fetchNoticias();
  }
  async function batchDelete() {
    if (!confirm(`¿Eliminar ${selectedIds.size} noticias permanentemente?`)) return;
    setBatchLoading(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await fetch(`/api/noticias/admin/${id}`, { method: "DELETE" }).catch(() => {});
    }
    setSelectedIds(new Set());
    setBatchLoading(false);
    fetchNoticias();
  }
  async function saveTitle(id: string) {
    await updateNoticia(id, { titulo: editedTitleValue });
    setEditingTitle(null);
  }

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab) params.set("estado", tab);
      if (fuenteFilter) params.set("fuente", fuenteFilter);
      if (ramaFilter) params.set("rama", ramaFilter);
      params.set("page", String(page));

      const res = await fetch(`/api/noticias/admin?${params.toString()}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNoticias(data.noticias);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch {
      setNoticias([]);
    } finally {
      setLoading(false);
    }
  }, [tab, fuenteFilter, ramaFilter, page]);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [tab, fuenteFilter, ramaFilter]);

  // ─── Cron ───────────────────────────────────────────────────────────────

  async function handleRunCron() {
    setRunningCron(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/noticias/cron", {
        method: "POST",
        headers: { Authorization: `Bearer ${prompt("Ingresa CRON_SECRET:") || ""}` },
      });
      const data = await res.json();
      if (res.ok) {
        setCronResult(data);
        fetchNoticias();
      } else {
        setCronResult({ nuevas: 0, duplicadas: 0, errores: [data.error || "Error"], timestamp: new Date().toISOString() });
      }
    } catch {
      setCronResult({ nuevas: 0, duplicadas: 0, errores: ["Error de conexión"], timestamp: new Date().toISOString() });
    } finally {
      setRunningCron(false);
    }
  }

  // ─── Actions ────────────────────────────────────────────────────────────

  async function updateNoticia(id: string, data: Record<string, unknown>) {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/noticias/admin/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setNoticias((prev) =>
          prev.map((n) => (n.id === id ? updated : n)),
        );
        // If the status changed, we may want to refetch to update counts
        if (data.estado) {
          setTimeout(fetchNoticias, 300);
        }
      }
    } catch {
      // Silent fail
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteNoticia(id: string) {
    if (!confirm("¿Eliminar esta noticia permanentemente?")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/noticias/admin/${id}`, { method: "DELETE" });
      if (res.ok) {
        setNoticias((prev) => prev.filter((n) => n.id !== id));
        setTotal((t) => t - 1);
      }
    } catch {
      // Silent fail
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function fuenteBadgeColor(fuente: string) {
    const colors: Record<string, string> = {
      BCN: "bg-blue-100 text-blue-800",
      BCN_BOLETIN: "bg-indigo-100 text-indigo-800",
      PODER_JUDICIAL: "bg-amber-100 text-amber-800",
      TC: "bg-purple-100 text-purple-800",
      DIARIO_OFICIAL: "bg-green-100 text-green-800",
      COLEGIO_ABOGADOS: "bg-rose-100 text-rose-800",
    };
    return colors[fuente] || "bg-gray-100 text-gray-800";
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* ─── Admin nav ─── */}
        <div className="flex flex-wrap items-center gap-4 mb-6 border-b border-gz-rule pb-4">
          <span className="font-cormorant text-2xl font-bold text-gz-ink">
            Admin
          </span>
          <Link
            href="/dashboard/admin"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Notificaciones
          </Link>
          <Link
            href="/dashboard/admin/sponsors"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Sponsors
          </Link>
          <Link
            href="/dashboard/admin/noticias"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Noticias
          </Link>
          <Link
            href="/dashboard/admin/fallo-semana"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Fallo Semana
          </Link>
        </div>

        {/* ─── Title + Cron ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="font-cormorant text-3xl font-bold text-gz-ink">
            Noticias Jurídicas
          </h1>
          <button
            onClick={handleRunCron}
            disabled={runningCron}
            className="font-archivo text-xs uppercase tracking-wider px-4 py-2 rounded bg-gz-gold text-white hover:bg-gz-gold-bright transition-colors disabled:opacity-50"
          >
            {runningCron ? "Recopilando..." : "Ejecutar recopilación ahora"}
          </button>
        </div>

        {/* Cron result */}
        {cronResult && (
          <div className="mb-4 p-3 rounded border border-gz-rule bg-white font-archivo text-sm">
            <p className="font-semibold text-gz-ink mb-1">
              Resultado de recopilación
              <span className="text-gz-ink-light font-normal ml-2">
                {formatDate(cronResult.timestamp)}
              </span>
            </p>
            <p className="text-gz-ink-mid">
              {cronResult.nuevas} nuevas &middot; {cronResult.duplicadas}{" "}
              duplicadas
              {cronResult.errores.length > 0 && (
                <span className="text-gz-red ml-2">
                  &middot; {cronResult.errores.length} errores
                </span>
              )}
            </p>
            {cronResult.errores.length > 0 && (
              <ul className="mt-1 text-xs text-gz-red list-disc list-inside">
                {cronResult.errores.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ─── Filters ─── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {/* Status tabs */}
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`font-archivo text-[11px] uppercase tracking-[1.5px] px-3 py-1.5 rounded transition-colors ${
                tab === t.key
                  ? "bg-gz-ink text-white"
                  : "text-gz-ink-mid hover:text-gz-ink bg-white border border-gz-rule"
              }`}
            >
              {t.label}
            </button>
          ))}

          {/* Source filter */}
          <select
            value={fuenteFilter}
            onChange={(e) => setFuenteFilter(e.target.value)}
            className="font-archivo text-xs border border-gz-rule rounded px-3 py-1.5 bg-white text-gz-ink"
          >
            {FUENTES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Rama filter */}
          <select
            value={ramaFilter}
            onChange={(e) => setRamaFilter(e.target.value)}
            className="font-archivo text-xs border border-gz-rule rounded px-3 py-1.5 bg-white text-gz-ink"
          >
            <option value="">Todas las ramas</option>
            {RAMAS.filter(r => r.value).map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          <span className="ml-auto font-archivo text-xs text-gz-ink-light">
            {total} resultado{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ─── Batch Action Bar ─── */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-gz-gold bg-gz-gold/5 p-3">
            <span className="font-archivo text-xs font-semibold text-gz-ink">
              {selectedIds.size} seleccionada{selectedIds.size > 1 ? "s" : ""}
            </span>
            <button
              onClick={batchApprove}
              disabled={batchLoading}
              className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✅ Aprobar selección
            </button>
            <button
              onClick={batchDelete}
              disabled={batchLoading}
              className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-gz-red text-white hover:bg-gz-red-dark transition-colors disabled:opacity-50"
            >
              🗑 Eliminar selección
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="font-archivo text-[10px] text-gz-ink-light hover:text-gz-ink transition-colors ml-auto"
            >
              Deseleccionar
            </button>
          </div>
        )}

        {/* ─── List ─── */}
        {loading ? (
          <div className="py-12 text-center font-archivo text-sm text-gz-ink-light">
            Cargando...
          </div>
        ) : noticias.length === 0 ? (
          <div className="py-12 text-center font-archivo text-sm text-gz-ink-light">
            No hay noticias en esta vista.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Select all header */}
            <label className="flex items-center gap-2 font-archivo text-[11px] text-gz-ink-mid cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.size === noticias.length && noticias.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 accent-gz-gold"
              />
              Seleccionar todo
            </label>

            {noticias.map((n) => (
              <div
                key={n.id}
                className={`bg-white border rounded-lg p-4 transition-colors ${
                  actionLoading === n.id
                    ? "opacity-50 pointer-events-none"
                    : ""
                } ${selectedIds.has(n.id) ? "border-gz-gold ring-1 ring-gz-gold/30" : n.destacada ? "border-gz-gold" : "border-gz-rule"}`}
              >
                <div className="flex flex-wrap items-start gap-3">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(n.id)}
                    onChange={() => toggleSelect(n.id)}
                    className="mt-1 h-4 w-4 accent-gz-gold shrink-0"
                  />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${fuenteBadgeColor(n.fuente)}`}
                      >
                        {n.fuenteNombre}
                      </span>
                      {n.categoria && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600">
                          {n.categoria}
                        </span>
                      )}
                      {n.destacada && (
                        <span className="text-amber-500 text-sm" title="Destacada">
                          &#9733;
                        </span>
                      )}
                      <span className="text-[10px] text-gz-ink-light font-archivo">
                        {formatDate(n.fechaPublicacionFuente)}
                      </span>
                    </div>

                    {/* Editable title */}
                    {editingTitle === n.id ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editedTitleValue}
                          onChange={(e) => setEditedTitleValue(e.target.value)}
                          className="flex-1 border border-gz-gold rounded px-2 py-1 font-cormorant text-lg text-gz-ink focus:outline-none focus:ring-1 focus:ring-gz-gold"
                          autoFocus
                        />
                        <button onClick={() => saveTitle(n.id)} className="text-[10px] px-2 py-1 bg-green-600 text-white rounded">Guardar</button>
                        <button onClick={() => setEditingTitle(null)} className="text-[10px] px-2 py-1 border border-gz-rule rounded text-gz-ink-mid">✕</button>
                      </div>
                    ) : (
                      <div className="group/title flex items-baseline gap-2">
                        <a
                          href={n.urlFuente}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-cormorant text-lg font-semibold text-gz-ink hover:text-gz-gold transition-colors line-clamp-2"
                        >
                          {n.titulo}
                        </a>
                        <button
                          onClick={() => { setEditingTitle(n.id); setEditedTitleValue(n.titulo); }}
                          className="shrink-0 opacity-0 group-hover/title:opacity-100 text-[10px] text-gz-ink-light hover:text-gz-gold transition-all"
                          title="Editar título"
                        >
                          ✏️
                        </button>
                      </div>
                    )}

                    {/* AI title suggestion */}
                    {n.tituloSugerido && n.tituloSugerido !== n.titulo && (
                      <div className="mt-1 flex items-start gap-2 rounded bg-amber-50 border border-amber-200 px-2 py-1.5">
                        <span className="text-[12px] shrink-0">💡</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-archivo text-[11px] text-amber-800 line-clamp-2">
                            {n.tituloSugerido}
                          </p>
                          {n.motivoLey && (
                            <p className="font-archivo text-[10px] text-amber-600 mt-0.5">
                              Motivo: {n.motivoLey}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => updateNoticia(n.id, { titulo: n.tituloSugerido })}
                          className="shrink-0 text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                        >
                          Usar
                        </button>
                      </div>
                    )}

                    {n.resumen && n.resumen !== n.titulo && (
                      <p className="mt-1 font-archivo text-xs text-gz-ink-mid line-clamp-2">
                        {n.resumen}
                      </p>
                    )}

                    {n.estado === "aprobada" && n.aprobadaPor && (
                      <p className="mt-1 font-archivo text-[10px] text-gz-ink-light">
                        Aprobada por {n.aprobadaPor} &middot;{" "}
                        {formatDate(n.fechaAprobacion)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {n.estado === "pendiente" && (
                      <>
                        <button
                          onClick={() => {
                            setApprovingNoticia(n);
                            setApprovalComment("");
                            setApprovalRama(n.rama || "");
                            setApprovalCategoria(n.categoria || "");
                          }}
                          className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                          title="Aprobar"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() =>
                            updateNoticia(n.id, {
                              estado: "aprobada",
                              destacada: true,
                            })
                          }
                          className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                          title="Aprobar + Destacar"
                        >
                          Destacar
                        </button>
                        <button
                          onClick={() =>
                            updateNoticia(n.id, { estado: "rechazada" })
                          }
                          className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-gz-red text-white hover:bg-gz-red-dark transition-colors"
                          title="Rechazar"
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {n.estado === "aprobada" && (
                      <>
                        <button
                          onClick={() =>
                            updateNoticia(n.id, { destacada: !n.destacada })
                          }
                          className={`font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
                            n.destacada
                              ? "border-amber-400 text-amber-600 bg-amber-50"
                              : "border-gz-rule text-gz-ink-mid bg-white hover:bg-amber-50"
                          }`}
                        >
                          {n.destacada ? "Quitar dest." : "Destacar"}
                        </button>
                      </>
                    )}

                    {/* Categoria / Rama selects for any estado */}
                    <select
                      value={n.categoria || ""}
                      onChange={(e) =>
                        updateNoticia(n.id, {
                          categoria: e.target.value || null,
                        })
                      }
                      className="font-archivo text-[10px] border border-gz-rule rounded px-2 py-1 bg-white text-gz-ink"
                      title="Categoría"
                    >
                      <option value="">Cat.</option>
                      {CATEGORIAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>

                    <select
                      value={n.rama || ""}
                      onChange={(e) =>
                        updateNoticia(n.id, {
                          rama: e.target.value || null,
                        })
                      }
                      className="font-archivo text-[10px] border border-gz-rule rounded px-2 py-1 bg-white text-gz-ink"
                      title="Rama del Derecho"
                    >
                      {RAMAS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => deleteNoticia(n.id)}
                      className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-gz-rule text-gz-ink-light hover:text-gz-red hover:border-gz-red transition-colors"
                      title="Eliminar"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Pagination ─── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="font-archivo text-xs px-3 py-1.5 rounded border border-gz-rule text-gz-ink-mid hover:text-gz-ink disabled:opacity-30 transition-colors"
            >
              Anterior
            </button>
            <span className="font-archivo text-xs text-gz-ink-mid">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="font-archivo text-xs px-3 py-1.5 rounded border border-gz-rule text-gz-ink-mid hover:text-gz-ink disabled:opacity-30 transition-colors"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* ─── Approval Modal ─── */}
      {approvingNoticia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setApprovingNoticia(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-lg border border-gz-rule p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--gz-cream)" }}
          >
            <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-4">
              Aprobar noticia
            </h3>

            {/* Preview */}
            <div className="mb-4 rounded border border-gz-rule bg-white p-3">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                {approvingNoticia.fuenteNombre}
              </p>
              <p className="font-cormorant text-[16px] font-semibold text-gz-ink">
                {approvingNoticia.titulo}
              </p>
              {approvingNoticia.resumen && approvingNoticia.resumen !== approvingNoticia.titulo && (
                <p className="mt-1 font-archivo text-[11px] text-gz-ink-mid line-clamp-3">
                  {approvingNoticia.resumen}
                </p>
              )}
            </div>

            {/* AI suggestion */}
            {approvingNoticia.tituloSugerido && (
              <div className="mb-4 rounded bg-amber-50 border border-amber-200 p-3">
                <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-amber-700 mb-1">
                  💡 Sugerencia IA
                </p>
                <p className="font-archivo text-[12px] text-amber-800">
                  {approvingNoticia.tituloSugerido}
                </p>
                {approvingNoticia.motivoLey && (
                  <p className="font-archivo text-[10px] text-amber-600 mt-1">
                    Motivo: {approvingNoticia.motivoLey}
                  </p>
                )}
                {approvingNoticia.numeroLey && (
                  <p className="font-archivo text-[10px] text-amber-600">
                    Ley N° {approvingNoticia.numeroLey}
                  </p>
                )}
                {approvingNoticia.leyesModificadas && (
                  <p className="font-archivo text-[10px] text-amber-600">
                    {approvingNoticia.leyesModificadas}
                  </p>
                )}
              </div>
            )}

            {/* Category + Rama */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                  Categoría
                </label>
                <select
                  value={approvalCategoria}
                  onChange={(e) => setApprovalCategoria(e.target.value)}
                  className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[12px] bg-white text-gz-ink"
                >
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                  Rama del Derecho
                </label>
                <select
                  value={approvalRama}
                  onChange={(e) => setApprovalRama(e.target.value)}
                  className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[12px] bg-white text-gz-ink"
                >
                  {RAMAS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Editorial comment */}
            <div className="mb-4">
              <label className="block font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                Comentario editorial (opcional)
              </label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Agrega contexto o una explicación que acompañe la noticia..."
                rows={4}
                className="w-full resize-none rounded border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setApprovingNoticia(null)}
                className="rounded px-4 py-2 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await updateNoticia(approvingNoticia.id, {
                    estado: "aprobada",
                    categoria: approvalCategoria || null,
                    rama: approvalRama || null,
                    comentarioAdmin: approvalComment || null,
                  });
                  setApprovingNoticia(null);
                }}
                className="rounded bg-green-600 px-5 py-2 font-archivo text-[12px] font-semibold text-white hover:bg-green-700 transition-colors"
              >
                Aprobar y publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
