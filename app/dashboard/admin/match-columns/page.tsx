"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface Par {
  id: number;
  izquierda: string;
  derecha: string;
}

interface MatchColumnsItem {
  id: string;
  titulo: string;
  instruccion: string | null;
  pares: string;
  columnaIzqLabel: string;
  columnaDerLabel: string;
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
  pares: '[{ "id": 1, "izquierda": "", "derecha": "" }]',
  columnaIzqLabel: "Concepto",
  columnaDerLabel: "Definicion",
  explicacion: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  tituloMateria: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function MatchColumnsAdminPage() {
  const [items, setItems] = useState<MatchColumnsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [paresError, setParesError] = useState("");

  // ─── Dynamic pair builder state ───
  const [usePairBuilder, setUsePairBuilder] = useState(true);
  const [pairRows, setPairRows] = useState<Par[]>([
    { id: 1, izquierda: "", derecha: "" },
  ]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/match-columns");
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

  function syncPairsToForm(rows: Par[]) {
    setForm((prev) => ({
      ...prev,
      pares: JSON.stringify(rows, null, 2),
    }));
  }

  function addPairRow() {
    const nextId =
      pairRows.length > 0 ? Math.max(...pairRows.map((p) => p.id)) + 1 : 1;
    const updated = [...pairRows, { id: nextId, izquierda: "", derecha: "" }];
    setPairRows(updated);
    syncPairsToForm(updated);
  }

  function removePairRow(id: number) {
    const updated = pairRows.filter((p) => p.id !== id);
    setPairRows(updated);
    syncPairsToForm(updated);
  }

  function updatePairRow(
    id: number,
    field: "izquierda" | "derecha",
    value: string
  ) {
    const updated = pairRows.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    setPairRows(updated);
    syncPairsToForm(updated);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setPairRows([{ id: 1, izquierda: "", derecha: "" }]);
    setUsePairBuilder(true);
    setParesError("");
    setShowForm(true);
  }

  function openEdit(item: MatchColumnsItem) {
    setEditingId(item.id);
    setForm({
      titulo: item.titulo,
      instruccion: item.instruccion || "",
      pares: item.pares,
      columnaIzqLabel: item.columnaIzqLabel,
      columnaDerLabel: item.columnaDerLabel,
      explicacion: item.explicacion || "",
      rama: item.rama,
      libro: item.libro || "",
      tituloMateria: item.tituloMateria || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });
    try {
      const parsed = JSON.parse(item.pares);
      setPairRows(parsed);
      setUsePairBuilder(true);
    } catch {
      setPairRows([]);
      setUsePairBuilder(false);
    }
    setParesError("");
    setShowForm(true);
  }

  function validatePares(json: string): boolean {
    try {
      const arr = JSON.parse(json);
      if (!Array.isArray(arr)) {
        setParesError("Debe ser un arreglo JSON");
        return false;
      }
      if (arr.length < 2) {
        setParesError("Se necesitan al menos 2 pares");
        return false;
      }
      for (const p of arr) {
        if (!p.id && p.id !== 0) {
          setParesError("Cada par necesita un id");
          return false;
        }
        if (!p.izquierda || !p.derecha) {
          setParesError("Cada par necesita izquierda y derecha");
          return false;
        }
      }
      setParesError("");
      return true;
    } catch {
      setParesError("JSON invalido");
      return false;
    }
  }

  async function handleSave() {
    setError("");
    if (!form.titulo.trim() || !form.rama) {
      setError("Titulo y rama son requeridos");
      return;
    }

    // If using pair builder, generate JSON from rows
    let paresJson = form.pares;
    if (usePairBuilder) {
      const validRows = pairRows.filter(
        (p) => p.izquierda.trim() && p.derecha.trim()
      );
      if (validRows.length < 2) {
        setParesError("Se necesitan al menos 2 pares completos");
        return;
      }
      paresJson = JSON.stringify(validRows);
    }

    if (!validatePares(paresJson)) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/match-columns/${editingId}`
        : "/api/admin/match-columns";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          pares: paresJson,
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
    if (
      !confirm(
        "Eliminar este ejercicio? Esta accion no se puede deshacer."
      )
    )
      return;
    try {
      const res = await fetch(`/api/admin/match-columns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: MatchColumnsItem) {
    try {
      const res = await fetch(`/api/admin/match-columns/${item.id}`, {
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

  /* ─── Preview pairs ─── */
  function renderPreview() {
    let pairs: Par[] = [];
    try {
      pairs = usePairBuilder ? pairRows : JSON.parse(form.pares);
    } catch {
      return (
        <p className="font-ibm-plex text-[12px] text-gz-ink-mid italic">
          JSON invalido
        </p>
      );
    }

    if (!Array.isArray(pairs) || pairs.length === 0) return null;

    return (
      <div className="space-y-1">
        <div className="grid grid-cols-2 gap-3">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold">
            {form.columnaIzqLabel || "Izquierda"}
          </p>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold">
            {form.columnaDerLabel || "Derecha"}
          </p>
        </div>
        {pairs
          .filter((p) => p.izquierda || p.derecha)
          .map((p, i) => (
            <div
              key={p.id ?? i}
              className="grid grid-cols-2 gap-3 border-b border-gz-rule py-1.5"
            >
              <span className="font-archivo text-[13px] text-gz-ink">
                {p.izquierda}
              </span>
              <span className="font-archivo text-[13px] text-gz-ink">
                {p.derecha}
              </span>
            </div>
          ))}
      </div>
    );
  }

  function truncate(s: string, max = 60) {
    return s.length > max ? s.slice(0, max) + "..." : s;
  }

  function getParesCount(paresJson: string): number {
    try {
      return JSON.parse(paresJson).length;
    } catch {
      return 0;
    }
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
            href="/dashboard/admin/match-columns"
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Relacionar Columnas
          </Link>
        </div>

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Relacionar Columnas
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
                    onChange={(e) =>
                      setForm({ ...form, titulo: e.target.value })
                    }
                    placeholder="Ej: Contratos civiles y sus definiciones"
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* instruccion */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Instruccion (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.instruccion}
                    onChange={(e) =>
                      setForm({ ...form, instruccion: e.target.value })
                    }
                    placeholder="Ej: Relaciona cada contrato con su definicion"
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* Column labels */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Label columna izquierda
                    </label>
                    <input
                      type="text"
                      value={form.columnaIzqLabel}
                      onChange={(e) =>
                        setForm({ ...form, columnaIzqLabel: e.target.value })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Label columna derecha
                    </label>
                    <input
                      type="text"
                      value={form.columnaDerLabel}
                      onChange={(e) =>
                        setForm({ ...form, columnaDerLabel: e.target.value })
                      }
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                    />
                  </div>
                </div>

                {/* Pair builder toggle */}
                <div className="flex items-center gap-3">
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                    Modo de edicion
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (usePairBuilder) {
                        // Switching to JSON: sync current rows to form
                        setForm((prev) => ({
                          ...prev,
                          pares: JSON.stringify(pairRows, null, 2),
                        }));
                      } else {
                        // Switching to builder: parse JSON to rows
                        try {
                          const parsed = JSON.parse(form.pares);
                          setPairRows(parsed);
                        } catch {
                          setPairRows([
                            { id: 1, izquierda: "", derecha: "" },
                          ]);
                        }
                      }
                      setUsePairBuilder(!usePairBuilder);
                    }}
                    className="font-archivo text-[11px] uppercase tracking-[1px] text-gz-gold hover:underline"
                  >
                    {usePairBuilder
                      ? "Cambiar a JSON"
                      : "Cambiar a Constructor"}
                  </button>
                </div>

                {/* Dynamic pair builder */}
                {usePairBuilder ? (
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-2">
                      Pares ({pairRows.length})
                    </label>
                    <div className="space-y-2">
                      {pairRows.map((row, idx) => (
                        <div
                          key={row.id}
                          className="flex items-center gap-2"
                        >
                          <span className="font-ibm-mono text-[11px] text-gz-ink-light w-6 text-right">
                            {idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={row.izquierda}
                            onChange={(e) =>
                              updatePairRow(
                                row.id,
                                "izquierda",
                                e.target.value
                              )
                            }
                            placeholder="Izquierda"
                            className="flex-1 border border-gz-rule rounded px-2 py-1.5 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                          />
                          <span className="text-gz-ink-light">&harr;</span>
                          <input
                            type="text"
                            value={row.derecha}
                            onChange={(e) =>
                              updatePairRow(
                                row.id,
                                "derecha",
                                e.target.value
                              )
                            }
                            placeholder="Derecha"
                            className="flex-1 border border-gz-rule rounded px-2 py-1.5 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                          />
                          <button
                            type="button"
                            onClick={() => removePairRow(row.id)}
                            className="text-red-400 hover:text-red-600 text-lg px-1"
                            title="Eliminar par"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addPairRow}
                      className="mt-2 font-archivo text-[11px] uppercase tracking-[1px] text-gz-gold hover:underline"
                    >
                      + Agregar par
                    </button>
                    {paresError && (
                      <p className="font-ibm-plex text-[11px] text-red-600 mt-1">
                        {paresError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Pares (JSON)
                    </label>
                    <textarea
                      value={form.pares}
                      onChange={(e) => {
                        setForm({ ...form, pares: e.target.value });
                        if (e.target.value.trim())
                          validatePares(e.target.value);
                      }}
                      rows={8}
                      placeholder='[{ "id": 1, "izquierda": "Compraventa", "derecha": "Contrato bilateral..." }]'
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold font-mono"
                    />
                    {paresError && (
                      <p className="font-ibm-plex text-[11px] text-red-600 mt-1">
                        {paresError}
                      </p>
                    )}
                    <p className="font-ibm-plex text-[11px] text-gz-ink-mid mt-1">
                      Array: &#123; id, izquierda, derecha &#125;
                    </p>
                  </div>
                )}

                {/* Preview */}
                {(usePairBuilder
                  ? pairRows.some((p) => p.izquierda || p.derecha)
                  : form.pares.trim()) && (
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Vista previa
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
                    onChange={(e) =>
                      setForm({ ...form, explicacion: e.target.value })
                    }
                    rows={3}
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
                    Pares
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
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink max-w-xs">
                      {truncate(item.titulo)}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink-mid text-center">
                      {getParesCount(item.pares)}
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
