"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────

interface FalloSemana {
  id: string;
  numero: number;
  titulo: string;
  tribunal: string;
  rol: string;
  fechaFallo: string;
  resumen: string;
  preguntaGuia: string;
  urlFallo: string | null;
  rama: string;
  materias: string | null;
  fechaInicio: string;
  fechaCierre: string;
  estado: string;
  mejorAnalisisId: string | null;
  createdAt: string;
  analisisCount?: number;
}

// ─── Constants ───────────────────────────────────────────────────

const TRIBUNALES = [
  "Corte Suprema",
  "C.A. de Arica",
  "C.A. de Iquique",
  "C.A. de Antofagasta",
  "C.A. de Copiapo",
  "C.A. de La Serena",
  "C.A. de Valparaiso",
  "C.A. de Santiago",
  "C.A. de San Miguel",
  "C.A. de Rancagua",
  "C.A. de Talca",
  "C.A. de Chillan",
  "C.A. de Concepcion",
  "C.A. de Temuco",
  "C.A. de Valdivia",
  "C.A. de Puerto Montt",
  "C.A. de Coyhaique",
  "C.A. de Punta Arenas",
  "Juzgado Civil",
  "Juzgado de Letras",
  "Juzgado de Garantia",
  "Tribunal Oral en lo Penal",
  "Tribunal de Familia",
  "Juzgado de Policia Local",
  "Tribunal Constitucional",
  "Otro",
];

const RAMAS = [
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

// ─── Component ───────────────────────────────────────────────────

export default function FalloSemanaAdminPage() {
  const [fallos, setFallos] = useState<FalloSemana[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    titulo: "",
    tribunal: TRIBUNALES[0],
    rol: "",
    fechaFallo: "",
    resumen: "",
    preguntaGuia: "",
    urlFallo: "",
    rama: "civil",
    materias: "",
    fechaInicio: "",
    fechaCierre: "",
  });

  // ─── Fetch ─────────────────────────────────────────────────────

  const fetchFallos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/diario/fallo-semana");
      if (!res.ok) throw new Error();
      const data = await res.json();

      // Combine activo + cerrados into a single list
      const all: FalloSemana[] = [];
      if (data.activo) {
        all.push({
          ...data.activo,
          analisisCount: data.activo.analisisCount ?? 0,
        });
      }
      if (data.cerrados) {
        for (const c of data.cerrados) {
          all.push({ ...c, analisisCount: 0 });
        }
      }
      setFallos(all);
    } catch {
      setFallos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFallos();
  }, [fetchFallos]);

  // ─── Create ────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/diario/fallo-semana", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          materias: form.materias.trim() || null,
          urlFallo: form.urlFallo.trim() || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({
          titulo: "",
          tribunal: TRIBUNALES[0],
          rol: "",
          fechaFallo: "",
          resumen: "",
          preguntaGuia: "",
          urlFallo: "",
          rama: "civil",
          materias: "",
          fechaInicio: "",
          fechaCierre: "",
        });
        fetchFallos();
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setSaving(false);
    }
  }

  // ─── Close ─────────────────────────────────────────────────────

  async function handleClose(id: string) {
    if (!confirm("Cerrar este Fallo de la Semana? Se premiaran los mejores analisis.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/diario/fallo-semana/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cerrar: true }),
      });
      if (res.ok) {
        fetchFallos();
      } else {
        const err = await res.json();
        alert(err.error || "Error al cerrar");
      }
    } catch {
      alert("Error de conexion");
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  function formatDate(d: string | null) {
    if (!d) return "--";
    return new Date(d).toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function estadoBadge(estado: string) {
    if (estado === "activo") {
      return "bg-green-100 text-green-800";
    }
    if (estado === "cerrado") {
      return "bg-gray-100 text-gray-600";
    }
    return "bg-yellow-100 text-yellow-800";
  }

  // ─── Render ────────────────────────────────────────────────────

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
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Noticias
          </Link>
          <Link
            href="/dashboard/admin/fallo-semana"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Fallo Semana
          </Link>
        </div>

        {/* ─── Title + Actions ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="font-cormorant text-3xl font-bold text-gz-ink">
            Fallo de la Semana
          </h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="font-archivo text-xs uppercase tracking-wider px-4 py-2 rounded bg-gz-gold text-white hover:bg-gz-gold-bright transition-colors"
          >
            {showForm ? "Cancelar" : "Nuevo Fallo"}
          </button>
        </div>

        {/* ─── Create Form ─── */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 bg-white border border-gz-rule rounded-lg p-6 space-y-4"
          >
            <h2 className="font-cormorant text-xl font-semibold text-gz-ink mb-2">
              Crear Fallo de la Semana
            </h2>

            {/* Titulo */}
            <div>
              <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                Titulo
              </label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                required
                className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                placeholder="Ej: Responsabilidad extracontractual por dano moral"
              />
            </div>

            {/* Tribunal + Rol */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Tribunal
                </label>
                <select
                  value={form.tribunal}
                  onChange={(e) => setForm({ ...form, tribunal: e.target.value })}
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                >
                  {TRIBUNALES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Rol
                </label>
                <input
                  type="text"
                  value={form.rol}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                  required
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                  placeholder="Ej: 12345-2025"
                />
              </div>
            </div>

            {/* Fecha Fallo + URL Fallo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Fecha del Fallo
                </label>
                <input
                  type="text"
                  value={form.fechaFallo}
                  onChange={(e) => setForm({ ...form, fechaFallo: e.target.value })}
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                  placeholder="Ej: 15 de marzo de 2025"
                />
              </div>
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  URL del Fallo
                </label>
                <input
                  type="url"
                  value={form.urlFallo}
                  onChange={(e) => setForm({ ...form, urlFallo: e.target.value })}
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Resumen */}
            <div>
              <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                Resumen del caso
              </label>
              <textarea
                value={form.resumen}
                onChange={(e) => setForm({ ...form, resumen: e.target.value })}
                required
                rows={4}
                className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none resize-y"
                placeholder="Resumen de los hechos y la decision del tribunal..."
              />
            </div>

            {/* Pregunta Guia */}
            <div>
              <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                Pregunta guia
              </label>
              <textarea
                value={form.preguntaGuia}
                onChange={(e) => setForm({ ...form, preguntaGuia: e.target.value })}
                required
                rows={2}
                className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none resize-y"
                placeholder="La pregunta que guiara los analisis de los estudiantes..."
              />
            </div>

            {/* Rama + Materias */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Rama del Derecho
                </label>
                <select
                  value={form.rama}
                  onChange={(e) => setForm({ ...form, rama: e.target.value })}
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                >
                  {RAMAS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Materias (separadas por coma)
                </label>
                <input
                  type="text"
                  value={form.materias}
                  onChange={(e) => setForm({ ...form, materias: e.target.value })}
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                  placeholder="Ej: responsabilidad, dano moral, causalidad"
                />
              </div>
            </div>

            {/* Fecha Inicio + Fecha Cierre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Fecha inicio
                </label>
                <input
                  type="datetime-local"
                  value={form.fechaInicio}
                  onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })}
                  required
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-archivo text-[11px] uppercase tracking-wider text-gz-ink-mid mb-1">
                  Fecha cierre
                </label>
                <input
                  type="datetime-local"
                  value={form.fechaCierre}
                  onChange={(e) => setForm({ ...form, fechaCierre: e.target.value })}
                  required
                  className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:border-gz-gold focus:outline-none"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="font-archivo text-xs uppercase tracking-wider px-6 py-2.5 rounded bg-gz-gold text-white hover:bg-gz-gold-bright transition-colors disabled:opacity-50"
              >
                {saving ? "Creando..." : "Crear Fallo de la Semana"}
              </button>
            </div>
          </form>
        )}

        {/* ─── Table ─── */}
        {loading ? (
          <div className="py-12 text-center font-archivo text-sm text-gz-ink-light">
            Cargando...
          </div>
        ) : fallos.length === 0 ? (
          <div className="py-12 text-center font-archivo text-sm text-gz-ink-light">
            No hay fallos de la semana registrados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gz-rule">
                  <th className="text-left font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    #
                  </th>
                  <th className="text-left font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Titulo
                  </th>
                  <th className="text-left font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Tribunal
                  </th>
                  <th className="text-center font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Estado
                  </th>
                  <th className="text-center font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Analisis
                  </th>
                  <th className="text-left font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Cierre
                  </th>
                  <th className="text-right font-archivo text-[10px] uppercase tracking-wider text-gz-ink-mid py-3 px-3">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {fallos.map((f) => (
                  <tr
                    key={f.id}
                    className={`border-b border-gz-rule transition-colors hover:bg-white/60 ${
                      actionLoading === f.id ? "opacity-50 pointer-events-none" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-archivo text-sm font-semibold text-gz-ink">
                      {f.numero}
                    </td>
                    <td className="py-3 px-3">
                      <p className="font-cormorant text-base font-semibold text-gz-ink line-clamp-1">
                        {f.titulo}
                      </p>
                      <p className="font-archivo text-[10px] text-gz-ink-light mt-0.5">
                        Rol {f.rol}
                      </p>
                    </td>
                    <td className="py-3 px-3 font-archivo text-xs text-gz-ink-mid">
                      {f.tribunal}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${estadoBadge(f.estado)}`}
                      >
                        {f.estado}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-archivo text-sm text-gz-ink">
                      {f.analisisCount ?? "--"}
                    </td>
                    <td className="py-3 px-3 font-archivo text-xs text-gz-ink-mid">
                      {formatDate(f.fechaCierre)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {f.estado === "activo" && (
                          <button
                            onClick={() => handleClose(f.id)}
                            className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded bg-gz-red text-white hover:bg-gz-red-dark transition-colors"
                          >
                            Cerrar
                          </button>
                        )}
                        {f.urlFallo && (
                          <a
                            href={f.urlFallo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-archivo text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border border-gz-rule text-gz-ink-mid hover:text-gz-gold hover:border-gz-gold transition-colors"
                          >
                            Ver fallo
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
