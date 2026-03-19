"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface PreguntaItem {
  id: number;
  tipo: string;
  pregunta: string;
  opciones: string[];
  correcta: number;
  explicacion?: string;
}

interface CasoPracticoItem {
  id: string;
  titulo: string;
  hechos: string;
  preguntas: string;
  resumenFinal: string | null;
  rama: string;
  libro: string | null;
  tituloMateria: string | null;
  materia: string | null;
  dificultad: number;
  activo: boolean;
  createdAt: string;
  _count: { attempts: number };
}

const RAMAS = ["DERECHO_CIVIL", "DERECHO_PROCESAL_CIVIL", "DERECHO_ORGANICO"];
const DIFICULTADES = [1, 2, 3];
const TIPOS_PREGUNTA = ["identificar", "norma", "resolver"];

const emptyForm = {
  titulo: "",
  hechos: "",
  preguntas: "[]",
  resumenFinal: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  tituloMateria: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function CasoPracticoAdminPage() {
  const [items, setItems] = useState<CasoPracticoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [preguntasError, setPreguntasError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/caso-practico");
      if (!res.ok) {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return;
        }
        throw new Error("Error cargando datos");
      }
      const data = await res.json();
      setItems(data.items);
    } catch {
      setError("Error cargando los casos practicos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPreguntasError("");
    setShowForm(true);
  }

  function openEdit(item: CasoPracticoItem) {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      hechos: item.hechos,
      preguntas: item.preguntas,
      resumenFinal: item.resumenFinal || "",
      rama: item.rama,
      libro: item.libro || "",
      tituloMateria: item.tituloMateria || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });
    setPreguntasError("");
    setShowForm(true);
  }

  function validatePreguntas(json: string): boolean {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr) || arr.length === 0) {
        setPreguntasError("Debe ser un arreglo JSON no vacio");
        return false;
      }
      for (const p of arr) {
        if (p.id === undefined) {
          setPreguntasError("Cada pregunta necesita un id numerico");
          return false;
        }
        if (!TIPOS_PREGUNTA.includes(p.tipo)) {
          setPreguntasError(`tipo debe ser: ${TIPOS_PREGUNTA.join(", ")}`);
          return false;
        }
        if (!p.pregunta) {
          setPreguntasError("Cada pregunta necesita texto (pregunta)");
          return false;
        }
        if (!Array.isArray(p.opciones) || p.opciones.length < 2) {
          setPreguntasError("Cada pregunta necesita al menos 2 opciones");
          return false;
        }
        if (typeof p.correcta !== "number" || p.correcta < 0 || p.correcta >= p.opciones.length) {
          setPreguntasError("correcta debe ser un indice valido de opciones");
          return false;
        }
      }
      setPreguntasError("");
      return true;
    } catch {
      setPreguntasError("JSON invalido");
      return false;
    }
  }

  async function handleSave() {
    setError("");
    if (!form.titulo.trim() || !form.hechos.trim() || !form.rama) {
      setError("Titulo, hechos y rama son requeridos");
      return;
    }
    if (!validatePreguntas(form.preguntas)) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/caso-practico/${editingId}`
        : "/api/admin/caso-practico";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dificultad: Number(form.dificultad),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error guardando");
      }

      setShowForm(false);
      fetchItems();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar este caso practico? Esta accion no se puede deshacer."))
      return;
    try {
      const res = await fetch(`/api/admin/caso-practico/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: CasoPracticoItem) {
    try {
      const res = await fetch(`/api/admin/caso-practico/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !item.activo }),
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error actualizando estado");
    }
  }

  function renderPreguntasPreview() {
    let preguntas: PreguntaItem[] = [];
    try {
      preguntas = JSON.parse(form.preguntas);
    } catch {
      return null;
    }
    if (!Array.isArray(preguntas) || preguntas.length === 0) return null;

    return (
      <div className="space-y-3">
        {preguntas.map((p, i) => (
          <div key={i} className="border border-gz-rule rounded p-3 bg-white">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-gold">
                {p.tipo}
              </span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-mid">
                ID: {p.id}
              </span>
            </div>
            <p className="font-archivo text-[13px] text-gz-ink font-medium">
              {p.pregunta}
            </p>
            <div className="mt-2 space-y-1">
              {p.opciones?.map((op, j) => (
                <div
                  key={j}
                  className={`font-archivo text-[12px] px-2 py-1 rounded ${
                    j === p.correcta
                      ? "bg-green-50 text-green-700 font-semibold"
                      : "text-gz-ink-mid"
                  }`}
                >
                  {String.fromCharCode(65 + j)}. {op}
                  {j === p.correcta && " ✓"}
                </div>
              ))}
            </div>
            {p.explicacion && (
              <p className="mt-2 font-archivo text-[11px] text-gz-ink-mid italic">
                {p.explicacion}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  function truncate(s: string, max = 60) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  function getPreguntaCount(json: string): number {
    try {
      return JSON.parse(json).length;
    } catch {
      return 0;
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* ─── Admin nav ─── */}
        <div className="flex items-center gap-4 mb-6 border-b border-gz-rule pb-4 flex-wrap">
          <span className="font-cormorant text-2xl font-bold text-gz-ink">Admin</span>
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
            href="/dashboard/admin/fill-blank"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Completar Blancos
          </Link>
          <Link
            href="/dashboard/admin/caso-practico"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Casos Practicos
          </Link>
        </div>

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Casos Practicos
          </h1>
          <button
            onClick={openCreate}
            className="font-archivo text-[11px] uppercase tracking-[1.5px] bg-gz-gold text-white px-4 py-2 rounded hover:bg-gz-gold/90 transition-colors"
          >
            + Crear nuevo
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4 font-archivo text-sm">
            {error}
          </div>
        )}

        {/* ─── Modal Form ─── */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cormorant text-lg font-bold text-gz-ink">
                  {editingId ? "Editar caso practico" : "Nuevo caso practico"}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gz-ink-mid hover:text-gz-ink text-xl"
                >
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                {/* titulo */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Titulo
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ej: Compraventa con vicio oculto"
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* hechos */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Hechos del caso
                  </label>
                  <textarea
                    value={form.hechos}
                    onChange={(e) => setForm({ ...form, hechos: e.target.value })}
                    rows={5}
                    placeholder="Describe los hechos del caso practico..."
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* preguntas JSON */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Preguntas (JSON)
                  </label>
                  <textarea
                    value={form.preguntas}
                    onChange={(e) => {
                      setForm({ ...form, preguntas: e.target.value });
                      if (e.target.value.trim()) validatePreguntas(e.target.value);
                    }}
                    rows={10}
                    placeholder={`[
  {
    "id": 1,
    "tipo": "identificar",
    "pregunta": "Cual es el problema juridico?",
    "opciones": ["Opcion A", "Opcion B", "Opcion C", "Opcion D"],
    "correcta": 0,
    "explicacion": "Porque..."
  }
]`}
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold font-mono"
                  />
                  {preguntasError && (
                    <p className="font-ibm-plex text-[11px] text-red-600 mt-1">
                      {preguntasError}
                    </p>
                  )}
                  <p className="font-ibm-plex text-[11px] text-gz-ink-mid mt-1">
                    Array de objetos: &#123; id, tipo (identificar|norma|resolver), pregunta,
                    opciones[], correcta (indice), explicacion &#125;
                  </p>
                </div>

                {/* Preview */}
                {form.preguntas && form.preguntas !== "[]" && (
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Vista previa de preguntas
                    </label>
                    {renderPreguntasPreview()}
                  </div>
                )}

                {/* resumenFinal */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Resumen final (opcional)
                  </label>
                  <textarea
                    value={form.resumenFinal}
                    onChange={(e) => setForm({ ...form, resumenFinal: e.target.value })}
                    rows={3}
                    placeholder="Resumen que se muestra al finalizar el caso..."
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* rama + dificultad row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Rama
                    </label>
                    <select
                      value={form.rama}
                      onChange={(e) => setForm({ ...form, rama: e.target.value })}
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    >
                      {RAMAS.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Dificultad
                    </label>
                    <select
                      value={form.dificultad}
                      onChange={(e) =>
                        setForm({ ...form, dificultad: Number(e.target.value) })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    >
                      {DIFICULTADES.map((d) => (
                        <option key={d} value={d}>
                          {d === 1
                            ? "1 - Facil"
                            : d === 2
                            ? "2 - Media"
                            : "3 - Dificil"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* libro, tituloMateria, materia */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Libro
                    </label>
                    <input
                      type="text"
                      value={form.libro}
                      onChange={(e) => setForm({ ...form, libro: e.target.value })}
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Titulo Materia
                    </label>
                    <input
                      type="text"
                      value={form.tituloMateria}
                      onChange={(e) =>
                        setForm({ ...form, tituloMateria: e.target.value })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Materia
                    </label>
                    <input
                      type="text"
                      value={form.materia}
                      onChange={(e) => setForm({ ...form, materia: e.target.value })}
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                </div>

                {/* activo toggle */}
                <div className="flex items-center gap-3">
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                    Activo
                  </label>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, activo: !form.activo })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      form.activo ? "bg-gz-gold" : "bg-gz-rule"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        form.activo ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="font-archivo text-[11px] uppercase tracking-[1.5px] bg-gz-gold text-white px-6 py-2 rounded hover:bg-gz-gold/90 transition-colors disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : editingId
                      ? "Actualizar"
                      : "Crear"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="font-archivo text-[11px] uppercase tracking-[1.5px] border border-gz-rule text-gz-ink-mid px-6 py-2 rounded hover:bg-gz-rule/30 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Table ─── */}
        {loading ? (
          <div className="text-center py-12 font-archivo text-sm text-gz-ink-mid">
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 font-archivo text-sm text-gz-ink-mid">
            No hay casos practicos. Crea el primero.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gz-rule">
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Titulo
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Rama
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Preg.
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Dif.
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Estado
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Intentos
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-gz-rule hover:bg-gz-gold/5"
                  >
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink max-w-xs">
                      {truncate(item.titulo)}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[11px] text-gz-ink-mid">
                      {item.rama.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink text-center">
                      {getPreguntaCount(item.preguntas)}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink text-center">
                      {item.dificultad}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`font-archivo text-[10px] uppercase tracking-[1px] px-2 py-0.5 rounded ${
                          item.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {item.activo ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink-mid text-center">
                      {item._count.attempts}
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(item)}
                          className="font-archivo text-[10px] uppercase tracking-[1px] text-gz-gold hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="font-archivo text-[10px] uppercase tracking-[1px] text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
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
