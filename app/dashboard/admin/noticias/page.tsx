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
];

const CATEGORIAS = [
  { value: "normativa", label: "Normativa" },
  { value: "nueva_ley", label: "Nueva Ley" },
  { value: "sentencia", label: "Sentencia" },
  { value: "gremial", label: "Gremial" },
  { value: "doctrina", label: "Doctrina" },
  { value: "internacional", label: "Internacional" },
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

  // ─── Fetch ──────────────────────────────────────────────────────────────

  const fetchNoticias = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab) params.set("estado", tab);
      if (fuenteFilter) params.set("fuente", fuenteFilter);
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
  }, [tab, fuenteFilter, page]);

  useEffect(() => {
    fetchNoticias();
  }, [fetchNoticias]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [tab, fuenteFilter]);

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

          <span className="ml-auto font-archivo text-xs text-gz-ink-light">
            {total} resultado{total !== 1 ? "s" : ""}
          </span>
        </div>

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
            {noticias.map((n) => (
              <div
                key={n.id}
                className={`bg-white border rounded-lg p-4 transition-colors ${
                  actionLoading === n.id
                    ? "opacity-50 pointer-events-none"
                    : ""
                } ${
                  n.destacada
                    ? "border-gz-gold"
                    : "border-gz-rule"
                }`}
              >
                <div className="flex flex-wrap items-start gap-3">
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

                    <a
                      href={n.urlFuente}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-cormorant text-lg font-semibold text-gz-ink hover:text-gz-gold transition-colors line-clamp-2"
                    >
                      {n.titulo}
                    </a>

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
                          onClick={() =>
                            updateNoticia(n.id, { estado: "aprobada" })
                          }
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
    </main>
  );
}
