"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* --- Types --- */
interface EventoData {
  id: number;
  texto: string;
  posicion: number;
  unidad: string;
  descripcion: string;
}

interface TimelineItem {
  id: string;
  titulo: string;
  instruccion: string | null;
  eventos: string;
  escala: string;
  rangoMin: number;
  rangoMax: number;
  explicacion: string | null;
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
  titulo: "",
  instruccion: "",
  eventos: "[]",
  escala: "dias",
  rangoMin: 0,
  rangoMax: 30,
  explicacion: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  tituloMateria: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function TimelineAdminPage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [eventosError, setEventosError] = useState("");

  // Dynamic event builder state
  const [useListBuilder, setUseListBuilder] = useState(true);
  const [listEventos, setListEventos] = useState<EventoData[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/timeline");
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
      setError("Error cargando los ejercicios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  function syncListToJson(list: EventoData[]) {
    setForm((prev) => ({ ...prev, eventos: JSON.stringify(list, null, 2) }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setEventosError("");
    setListEventos([]);
    setUseListBuilder(true);
    setShowForm(true);
  }

  function openEdit(item: TimelineItem) {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      instruccion: item.instruccion || "",
      eventos: item.eventos,
      escala: item.escala,
      rangoMin: item.rangoMin,
      rangoMax: item.rangoMax,
      explicacion: item.explicacion || "",
      rama: item.rama,
      libro: item.libro || "",
      tituloMateria: item.tituloMateria || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });
    setEventosError("");
    try {
      const parsed = JSON.parse(item.eventos);
      setListEventos(parsed);
      setUseListBuilder(true);
    } catch {
      setListEventos([]);
      setUseListBuilder(false);
    }
    setShowForm(true);
  }

  function validateEventos(json: string): boolean {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        setEventosError("Debe ser un arreglo JSON");
        return false;
      }
      if (arr.length < 2) {
        setEventosError("Se necesitan al menos 2 eventos");
        return false;
      }
      for (const item of arr) {
        if (item.id === undefined) {
          setEventosError("Cada evento necesita un id");
          return false;
        }
        if (!item.texto) {
          setEventosError("Cada evento necesita texto");
          return false;
        }
        if (item.posicion === undefined) {
          setEventosError("Cada evento necesita posicion");
          return false;
        }
      }
      setEventosError("");
      return true;
    } catch {
      setEventosError("JSON invalido");
      return false;
    }
  }

  // List builder handlers
  function addEvento() {
    const nextId = listEventos.length > 0 ? Math.max(...listEventos.map((i) => i.id)) + 1 : 1;
    const updated = [
      ...listEventos,
      { id: nextId, texto: "", posicion: 0, unidad: "", descripcion: "" },
    ];
    setListEventos(updated);
    syncListToJson(updated);
  }

  function updateEvento(
    index: number,
    field: keyof EventoData,
    value: string | number,
  ) {
    const updated = [...listEventos];
    if (field === "posicion" || field === "id") {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = value as string;
    }
    setListEventos(updated);
    syncListToJson(updated);
  }

  function removeEvento(index: number) {
    const updated = listEventos.filter((_, i) => i !== index);
    setListEventos(updated);
    syncListToJson(updated);
  }

  async function handleSave() {
    setError("");
    if (!form.titulo.trim() || !form.rama) {
      setError("Titulo y rama son requeridos");
      return;
    }
    if (!validateEventos(form.eventos)) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/timeline/${editingId}`
        : "/api/admin/timeline";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          dificultad: Number(form.dificultad),
          rangoMin: Number(form.rangoMin),
          rangoMax: Number(form.rangoMax),
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
    if (!confirm("Eliminar este ejercicio? Esta accion no se puede deshacer."))
      return;
    try {
      const res = await fetch(`/api/admin/timeline/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: TimelineItem) {
    try {
      const res = await fetch(`/api/admin/timeline/${item.id}`, {
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

  function getEventCount(eventosJson: string): number {
    try {
      return JSON.parse(eventosJson).length;
    } catch {
      return 0;
    }
  }

  function truncate(s: string, max = 60) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Admin nav */}
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
            href="/dashboard/admin/order-sequence"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Ordenar Secuencias
          </Link>
          <Link
            href="/dashboard/admin/timeline"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Lineas de Tiempo
          </Link>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Lineas de Tiempo
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

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto pt-8 pb-8">
            <div
              className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6"
              style={{ backgroundColor: "var(--gz-cream)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-cormorant text-lg font-bold text-gz-ink">
                  {editingId ? "Editar ejercicio" : "Nuevo ejercicio"}
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
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                    placeholder="Ej: Plazos del procedimiento ordinario"
                    className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* instruccion */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Instruccion (opcional)
                  </label>
                  <textarea
                    value={form.instruccion}
                    onChange={(e) =>
                      setForm({ ...form, instruccion: e.target.value })
                    }
                    rows={2}
                    placeholder="Ej: Ubica cada evento en el dia correcto del procedimiento..."
                    className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* escala + rango row */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Escala
                    </label>
                    <input
                      type="text"
                      value={form.escala}
                      onChange={(e) =>
                        setForm({ ...form, escala: e.target.value })
                      }
                      placeholder="dias, meses, anos..."
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Rango Min
                    </label>
                    <input
                      type="number"
                      value={form.rangoMin}
                      onChange={(e) =>
                        setForm({ ...form, rangoMin: Number(e.target.value) })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Rango Max
                    </label>
                    <input
                      type="number"
                      value={form.rangoMax}
                      onChange={(e) =>
                        setForm({ ...form, rangoMax: Number(e.target.value) })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                </div>

                {/* Eventos: toggle between list builder and JSON */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                      Eventos de la linea de tiempo
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseListBuilder(!useListBuilder)}
                      className="font-archivo text-[10px] uppercase tracking-[1px] text-gz-gold hover:underline"
                    >
                      {useListBuilder ? "Editar JSON" : "Usar constructor"}
                    </button>
                  </div>

                  {useListBuilder ? (
                    <div className="border border-gz-rule rounded p-3 bg-white space-y-3">
                      {listEventos.map((evento, idx) => (
                        <div
                          key={idx}
                          className="border border-gz-rule/50 rounded p-3 bg-gz-cream/30 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-ibm-mono text-[11px] text-gz-gold font-semibold">
                              Evento #{evento.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEvento(idx)}
                              className="text-red-400 hover:text-red-600 text-sm"
                              title="Eliminar"
                            >
                              &times;
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-archivo text-[10px] text-gz-ink-light block mb-0.5">
                                Texto
                              </label>
                              <input
                                type="text"
                                value={evento.texto}
                                onChange={(e) =>
                                  updateEvento(idx, "texto", e.target.value)
                                }
                                placeholder="Descripcion del evento..."
                                className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                              />
                            </div>
                            <div>
                              <label className="font-archivo text-[10px] text-gz-ink-light block mb-0.5">
                                Posicion ({form.escala})
                              </label>
                              <input
                                type="number"
                                value={evento.posicion}
                                onChange={(e) =>
                                  updateEvento(
                                    idx,
                                    "posicion",
                                    e.target.value,
                                  )
                                }
                                className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-archivo text-[10px] text-gz-ink-light block mb-0.5">
                                Unidad (opcional)
                              </label>
                              <input
                                type="text"
                                value={evento.unidad}
                                onChange={(e) =>
                                  updateEvento(idx, "unidad", e.target.value)
                                }
                                placeholder="Ej: dia, mes..."
                                className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                              />
                            </div>
                            <div>
                              <label className="font-archivo text-[10px] text-gz-ink-light block mb-0.5">
                                Descripcion (opcional)
                              </label>
                              <input
                                type="text"
                                value={evento.descripcion}
                                onChange={(e) =>
                                  updateEvento(
                                    idx,
                                    "descripcion",
                                    e.target.value,
                                  )
                                }
                                placeholder="Detalle adicional..."
                                className="w-full border border-gz-rule rounded px-2 py-1.5 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addEvento}
                        className="font-archivo text-[11px] uppercase tracking-[1px] text-gz-gold hover:underline mt-1"
                      >
                        + Agregar evento
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={form.eventos}
                      onChange={(e) => {
                        setForm({ ...form, eventos: e.target.value });
                        if (e.target.value.trim())
                          validateEventos(e.target.value);
                      }}
                      rows={10}
                      placeholder='[{ "id": 1, "texto": "Notificacion de demanda", "posicion": 5, "unidad": "dia", "descripcion": "" }]'
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-mono text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  )}
                  {eventosError && (
                    <p className="font-archivo text-[11px] text-red-600 mt-1">
                      {eventosError}
                    </p>
                  )}
                </div>

                {/* explicacion */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Explicacion (opcional)
                  </label>
                  <textarea
                    value={form.explicacion}
                    onChange={(e) =>
                      setForm({ ...form, explicacion: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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
                      onChange={(e) =>
                        setForm({ ...form, rama: e.target.value })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
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

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 font-archivo text-sm text-gz-ink-mid">
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 font-archivo text-sm text-gz-ink-mid">
            No hay ejercicios. Crea el primero.
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
                    Escala
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Eventos
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
                    <td className="py-2 px-2 font-archivo text-[13px] text-gz-ink max-w-xs">
                      {truncate(item.titulo)}
                    </td>
                    <td className="py-2 px-2 font-archivo text-[11px] text-gz-ink-mid">
                      {item.rama.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-2 font-archivo text-[11px] text-gz-ink-mid">
                      {item.escala}
                    </td>
                    <td className="py-2 px-2 font-ibm-mono text-[13px] text-gz-ink text-center">
                      {getEventCount(item.eventos)}
                    </td>
                    <td className="py-2 px-2 font-ibm-mono text-[13px] text-gz-ink text-center">
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
                    <td className="py-2 px-2 font-ibm-mono text-[13px] text-gz-ink-mid text-center">
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
