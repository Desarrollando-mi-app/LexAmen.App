"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface SequenceItemData {
  id: number;
  texto: string;
  orden: number;
}

interface OrderSequenceItem {
  id: string;
  titulo: string;
  instruccion: string | null;
  items: string;
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
  items: "[]",
  explicacion: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  tituloMateria: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function OrderSequenceAdminPage() {
  const [items, setItems] = useState<OrderSequenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [itemsError, setItemsError] = useState("");

  // ─── Dynamic list builder state ──────────────────────────
  const [useListBuilder, setUseListBuilder] = useState(true);
  const [listItems, setListItems] = useState<SequenceItemData[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/order-sequence");
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

  function syncListToJson(list: SequenceItemData[]) {
    setForm((prev) => ({ ...prev, items: JSON.stringify(list, null, 2) }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setItemsError("");
    setListItems([]);
    setUseListBuilder(true);
    setShowForm(true);
  }

  function openEdit(item: OrderSequenceItem) {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      instruccion: item.instruccion || "",
      items: item.items,
      explicacion: item.explicacion || "",
      rama: item.rama,
      libro: item.libro || "",
      tituloMateria: item.tituloMateria || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });
    setItemsError("");
    // Parse items for list builder
    try {
      const parsed = JSON.parse(item.items);
      setListItems(parsed);
      setUseListBuilder(true);
    } catch {
      setListItems([]);
      setUseListBuilder(false);
    }
    setShowForm(true);
  }

  function validateItems(json: string): boolean {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        setItemsError("Debe ser un arreglo JSON");
        return false;
      }
      if (arr.length < 2) {
        setItemsError("Se necesitan al menos 2 items");
        return false;
      }
      for (const item of arr) {
        if (item.id === undefined) {
          setItemsError("Cada item necesita un id");
          return false;
        }
        if (!item.texto) {
          setItemsError("Cada item necesita texto");
          return false;
        }
        if (item.orden === undefined) {
          setItemsError("Cada item necesita orden");
          return false;
        }
      }
      setItemsError("");
      return true;
    } catch {
      setItemsError("JSON invalido");
      return false;
    }
  }

  // ─── List builder handlers ──────────────────────────────
  function addListItem() {
    const nextId = listItems.length > 0 ? Math.max(...listItems.map((i) => i.id)) + 1 : 1;
    const nextOrden = listItems.length + 1;
    const updated = [...listItems, { id: nextId, texto: "", orden: nextOrden }];
    setListItems(updated);
    syncListToJson(updated);
  }

  function updateListItem(index: number, field: "texto" | "orden", value: string | number) {
    const updated = [...listItems];
    if (field === "texto") updated[index].texto = value as string;
    else updated[index].orden = Number(value);
    setListItems(updated);
    syncListToJson(updated);
  }

  function removeListItem(index: number) {
    const updated = listItems.filter((_, i) => i !== index);
    // Re-number orden
    const renumbered = updated.map((item, i) => ({ ...item, orden: i + 1 }));
    setListItems(renumbered);
    syncListToJson(renumbered);
  }

  function moveListItem(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === listItems.length - 1) return;
    const updated = [...listItems];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    [updated[index], updated[swapIdx]] = [updated[swapIdx], updated[index]];
    // Re-number orden
    const renumbered = updated.map((item, i) => ({ ...item, orden: i + 1 }));
    setListItems(renumbered);
    syncListToJson(renumbered);
  }

  async function handleSave() {
    setError("");
    if (!form.titulo.trim() || !form.rama) {
      setError("Titulo y rama son requeridos");
      return;
    }
    if (!validateItems(form.items)) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/order-sequence/${editingId}`
        : "/api/admin/order-sequence";
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
    if (!confirm("Eliminar este ejercicio? Esta accion no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/order-sequence/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: OrderSequenceItem) {
    try {
      const res = await fetch(`/api/admin/order-sequence/${item.id}`, {
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

  /* ─── Preview: render ordered items ─── */
  function renderPreview() {
    let parsed: SequenceItemData[] = [];
    try {
      parsed = JSON.parse(form.items);
    } catch {
      return null;
    }

    const sorted = [...parsed].sort((a, b) => a.orden - b.orden);

    return (
      <div className="space-y-1">
        {sorted.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 border-b border-gz-rule py-2 px-2"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gz-gold/10 font-ibm-mono text-[11px] font-semibold text-gz-gold flex-shrink-0">
              {item.orden}
            </span>
            <span className="font-archivo text-[13px] text-gz-ink">{item.texto}</span>
          </div>
        ))}
      </div>
    );
  }

  function truncate(s: string, max = 60) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  function getItemCount(itemsJson: string): number {
    try {
      return JSON.parse(itemsJson).length;
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
            href="/dashboard/admin/error-identification"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid hover:text-gz-gold transition-colors"
          >
            Identificar Errores
          </Link>
          <Link
            href="/dashboard/admin/order-sequence"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Ordenar Secuencias
          </Link>
        </div>

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Ordenar Secuencias
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
                    onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                    placeholder="Ej: Orden de prelacion de creditos"
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
                    onChange={(e) => setForm({ ...form, instruccion: e.target.value })}
                    rows={2}
                    placeholder="Ej: Ordena los siguientes creditos segun su prelacion..."
                    className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* Items: toggle between list builder and JSON */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                      Items de la secuencia
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
                    <div className="border border-gz-rule rounded p-3 bg-white space-y-2">
                      {listItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="font-ibm-mono text-[12px] text-gz-gold font-semibold w-6 text-center flex-shrink-0">
                            {item.orden}
                          </span>
                          <input
                            type="text"
                            value={item.texto}
                            onChange={(e) => updateListItem(idx, "texto", e.target.value)}
                            placeholder="Texto del paso..."
                            className="flex-1 border border-gz-rule rounded px-2 py-1.5 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                          />
                          <button
                            type="button"
                            onClick={() => moveListItem(idx, "up")}
                            disabled={idx === 0}
                            className="text-gz-ink-light hover:text-gz-ink disabled:opacity-30 text-sm"
                            title="Subir"
                          >
                            &uarr;
                          </button>
                          <button
                            type="button"
                            onClick={() => moveListItem(idx, "down")}
                            disabled={idx === listItems.length - 1}
                            className="text-gz-ink-light hover:text-gz-ink disabled:opacity-30 text-sm"
                            title="Bajar"
                          >
                            &darr;
                          </button>
                          <button
                            type="button"
                            onClick={() => removeListItem(idx)}
                            className="text-red-400 hover:text-red-600 text-sm"
                            title="Eliminar"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addListItem}
                        className="font-archivo text-[11px] uppercase tracking-[1px] text-gz-gold hover:underline mt-1"
                      >
                        + Agregar paso
                      </button>
                      <p className="font-archivo text-[11px] text-gz-ink-mid mt-1">
                        El orden numerico define la secuencia correcta. Arrastra para reordenar.
                      </p>
                    </div>
                  ) : (
                    <textarea
                      value={form.items}
                      onChange={(e) => {
                        setForm({ ...form, items: e.target.value });
                        if (e.target.value.trim()) validateItems(e.target.value);
                      }}
                      rows={8}
                      placeholder='[{ "id": 1, "texto": "Paso 1...", "orden": 1 }, { "id": 2, "texto": "Paso 2...", "orden": 2 }]'
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-mono text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  )}
                  {itemsError && (
                    <p className="font-archivo text-[11px] text-red-600 mt-1">{itemsError}</p>
                  )}
                </div>

                {/* Preview */}
                {form.items && form.items !== "[]" && (
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Vista previa (orden correcto)
                    </label>
                    <div className="border border-gz-rule rounded p-3 bg-white">
                      {renderPreview()}
                    </div>
                  </div>
                )}

                {/* explicacion */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Explicacion (opcional)
                  </label>
                  <textarea
                    value={form.explicacion}
                    onChange={(e) => setForm({ ...form, explicacion: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, rama: e.target.value })}
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    >
                      {RAMAS.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Dificultad
                    </label>
                    <select
                      value={form.dificultad}
                      onChange={(e) => setForm({ ...form, dificultad: Number(e.target.value) })}
                      className="w-full border border-gz-rule rounded px-3 py-2 font-archivo text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    >
                      {DIFICULTADES.map((d) => (
                        <option key={d} value={d}>
                          {d === 1 ? "1 - Facil" : d === 2 ? "2 - Media" : "3 - Dificil"}
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
                      onChange={(e) => setForm({ ...form, tituloMateria: e.target.value })}
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
                      onChange={(e) => setForm({ ...form, materia: e.target.value })}
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
                    {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
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
                    Items
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
                  <tr key={item.id} className="border-b border-gz-rule hover:bg-gz-gold/5">
                    <td className="py-2 px-2 font-archivo text-[13px] text-gz-ink max-w-xs">
                      {truncate(item.titulo)}
                    </td>
                    <td className="py-2 px-2 font-archivo text-[11px] text-gz-ink-mid">
                      {item.rama.replace(/_/g, " ")}
                    </td>
                    <td className="py-2 px-2 font-ibm-mono text-[13px] text-gz-ink text-center">
                      {getItemCount(item.items)}
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
