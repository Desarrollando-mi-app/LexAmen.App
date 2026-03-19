"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */

interface DictadoItem {
  id: string;
  textoCompleto: string;
  titulo: string;
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

const emptyForm = {
  textoCompleto: "",
  titulo: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  tituloMateria: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function DictadoAdminPage() {
  const [items, setItems] = useState<DictadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/dictado");
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
      setError("Error cargando los dictados");
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
    setShowForm(true);
  }

  function openEdit(item: DictadoItem) {
    setEditingId(item.id);
    setForm({
      textoCompleto: item.textoCompleto,
      titulo: item.titulo,
      rama: item.rama,
      libro: item.libro || "",
      tituloMateria: item.tituloMateria || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });
    setShowForm(true);
  }

  async function handleSave() {
    setError("");
    if (!form.textoCompleto.trim() || !form.titulo.trim() || !form.rama) {
      setError("Texto completo, titulo y rama son requeridos");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/dictado/${editingId}`
        : "/api/admin/dictado";
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
    if (!confirm("Eliminar este dictado? Esta accion no se puede deshacer."))
      return;
    try {
      const res = await fetch(`/api/admin/dictado/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: DictadoItem) {
    try {
      const res = await fetch(`/api/admin/dictado/${item.id}`, {
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

  function truncate(s: string, max = 80) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  function wordCount(s: string) {
    return s.trim().split(/\s+/).length;
  }

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* ─── Admin nav ─── */}
        <div className="flex items-center gap-4 mb-6 border-b border-gz-rule pb-4 flex-wrap">
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
            href="/dashboard/admin/fill-blank"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Completar Blancos
          </Link>
          <Link
            href="/dashboard/admin/error-identification"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Identificar Errores
          </Link>
          <Link
            href="/dashboard/admin/dictado"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Dictado
          </Link>
        </div>

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Dictado Jur&iacute;dico
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
                  {editingId ? "Editar dictado" : "Nuevo dictado"}
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
                    T&iacute;tulo
                  </label>
                  <input
                    type="text"
                    value={form.titulo}
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                    placeholder="Ej: Art. 1489 — Condicion resolutoria tacita"
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* textoCompleto */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Texto Completo (lo que se dicta)
                  </label>
                  <textarea
                    value={form.textoCompleto}
                    onChange={(e) =>
                      setForm({ ...form, textoCompleto: e.target.value })
                    }
                    rows={8}
                    placeholder="Escriba aqui el texto legal completo que el estudiante debera transcribir..."
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-mono text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold leading-relaxed"
                  />
                  {form.textoCompleto && (
                    <p className="font-ibm-plex text-[11px] text-gz-ink-mid mt-1">
                      {wordCount(form.textoCompleto)} palabras
                    </p>
                  )}
                </div>

                {/* rama + dificultad row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Rama
                    </label>
                    <select
                      value={form.rama}
                      onChange={(e) =>
                        setForm({ ...form, rama: e.target.value })
                      }
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
                        setForm({
                          ...form,
                          dificultad: Number(e.target.value),
                        })
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
                      onChange={(e) =>
                        setForm({ ...form, libro: e.target.value })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      T&iacute;tulo Materia
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
                      onChange={(e) =>
                        setForm({ ...form, materia: e.target.value })
                      }
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
            No hay dictados. Crea el primero.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gz-rule">
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    T&iacute;tulo
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Texto
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Rama
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
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink max-w-[160px]">
                      {truncate(item.titulo, 40)}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[11px] text-gz-ink-mid max-w-xs">
                      {truncate(item.textoCompleto, 60)}
                      <span className="text-gz-ink-light ml-1">
                        ({wordCount(item.textoCompleto)} pal.)
                      </span>
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[11px] text-gz-ink-mid">
                      {item.rama.replace(/_/g, " ")}
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
