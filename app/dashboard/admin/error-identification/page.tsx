"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

/* ─── Types ─── */
interface Segmento {
  id: number;
  texto: string;
  esError: boolean;
  textoCorrecto?: string;
  explicacion?: string;
}

interface ErrorIdentificationItem {
  id: string;
  textoConErrores: string;
  segmentos: string;
  totalErrores: number;
  explicacionGeneral: string | null;
  rama: string;
  libro: string | null;
  titulo: string | null;
  materia: string | null;
  dificultad: number;
  activo: boolean;
  createdAt: string;
  _count: { attempts: number };
}

const RAMAS = ["DERECHO_CIVIL", "DERECHO_PROCESAL_CIVIL", "DERECHO_ORGANICO"];
const DIFICULTADES = [1, 2, 3];

interface SegmentoForm {
  texto: string;
  esError: boolean;
  textoCorrecto: string;
  explicacion: string;
}

const emptySegmento: SegmentoForm = {
  texto: "",
  esError: false,
  textoCorrecto: "",
  explicacion: "",
};

const emptyForm = {
  explicacionGeneral: "",
  rama: "DERECHO_CIVIL",
  libro: "",
  titulo: "",
  materia: "",
  dificultad: 2,
  activo: true,
};

export default function ErrorIdentificationAdminPage() {
  const [items, setItems] = useState<ErrorIdentificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [segmentos, setSegmentos] = useState<SegmentoForm[]>([
    { ...emptySegmento },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [useJsonMode, setUseJsonMode] = useState(false);
  const [segmentosJson, setSegmentosJson] = useState("[]");
  const [jsonError, setJsonError] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/error-identification");
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSegmentos([{ ...emptySegmento }]);
    setSegmentosJson("[]");
    setJsonError("");
    setShowForm(true);
  }

  function openEdit(item: ErrorIdentificationItem) {
    setEditingId(item.id);
    setForm({
      explicacionGeneral: item.explicacionGeneral || "",
      rama: item.rama,
      libro: item.libro || "",
      titulo: item.titulo || "",
      materia: item.materia || "",
      dificultad: item.dificultad,
      activo: item.activo,
    });

    try {
      const parsed: Segmento[] = JSON.parse(item.segmentos);
      setSegmentos(
        parsed.map((s) => ({
          texto: s.texto,
          esError: s.esError,
          textoCorrecto: s.textoCorrecto || "",
          explicacion: s.explicacion || "",
        }))
      );
      setSegmentosJson(JSON.stringify(parsed, null, 2));
    } catch {
      setSegmentos([{ ...emptySegmento }]);
      setSegmentosJson(item.segmentos);
    }
    setJsonError("");
    setShowForm(true);
  }

  function addSegmento() {
    setSegmentos([...segmentos, { ...emptySegmento }]);
  }

  function removeSegmento(idx: number) {
    if (segmentos.length <= 1) return;
    setSegmentos(segmentos.filter((_, i) => i !== idx));
  }

  function updateSegmento(idx: number, field: keyof SegmentoForm, value: string | boolean) {
    const updated = [...segmentos];
    (updated[idx] as unknown as Record<string, string | boolean>)[field] = value;
    setSegmentos(updated);
  }

  function buildSegmentosJson(): string {
    return JSON.stringify(
      segmentos.map((s, i) => ({
        id: i,
        texto: s.texto,
        esError: s.esError,
        ...(s.esError
          ? {
              textoCorrecto: s.textoCorrecto || undefined,
              explicacion: s.explicacion || undefined,
            }
          : {}),
      }))
    );
  }

  function getTotalErrores(): number {
    if (useJsonMode) {
      try {
        const arr = JSON.parse(segmentosJson);
        return arr.filter((s: { esError: boolean }) => s.esError).length;
      } catch {
        return 0;
      }
    }
    return segmentos.filter((s) => s.esError).length;
  }

  async function handleSave() {
    setError("");

    let finalSegmentos: string;
    if (useJsonMode) {
      try {
        JSON.parse(segmentosJson);
        finalSegmentos = segmentosJson;
      } catch {
        setJsonError("JSON inválido");
        return;
      }
    } else {
      // Validate segmentos
      for (let i = 0; i < segmentos.length; i++) {
        if (!segmentos[i].texto.trim()) {
          setError(`Segmento ${i + 1} no tiene texto`);
          return;
        }
      }
      finalSegmentos = buildSegmentosJson();
    }

    const totalErrores = getTotalErrores();
    if (totalErrores === 0) {
      setError("Debe haber al menos un error en los segmentos");
      return;
    }

    if (!form.rama) {
      setError("Rama es requerida");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/error-identification/${editingId}`
        : "/api/admin/error-identification";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmentos: finalSegmentos,
          totalErrores,
          rama: form.rama,
          explicacionGeneral: form.explicacionGeneral || undefined,
          libro: form.libro || undefined,
          titulo: form.titulo || undefined,
          materia: form.materia || undefined,
          dificultad: Number(form.dificultad),
          activo: form.activo,
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
    if (!confirm("¿Eliminar este ejercicio? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/error-identification/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      setError("Error eliminando");
    }
  }

  async function handleToggleActive(item: ErrorIdentificationItem) {
    try {
      const res = await fetch(`/api/admin/error-identification/${item.id}`, {
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

  /* ─── Preview: render texto with errors highlighted ─── */
  function renderPreview() {
    let segs: SegmentoForm[];
    if (useJsonMode) {
      try {
        const parsed = JSON.parse(segmentosJson);
        segs = parsed.map((s: Segmento) => ({
          texto: s.texto,
          esError: s.esError,
          textoCorrecto: s.textoCorrecto || "",
          explicacion: s.explicacion || "",
        }));
      } catch {
        return (
          <p className="font-ibm-plex text-[13px] text-gz-ink-mid italic">
            JSON inválido
          </p>
        );
      }
    } else {
      segs = segmentos;
    }

    return (
      <div className="font-ibm-plex text-[13px] text-gz-ink leading-relaxed">
        {segs.map((s, i) =>
          s.esError ? (
            <span
              key={i}
              className="bg-red-100 border-b-2 border-red-400 text-red-700 px-0.5 rounded-sm"
              title={s.textoCorrecto ? `Correcto: ${s.textoCorrecto}` : undefined}
            >
              {s.texto}
            </span>
          ) : (
            <span key={i}>{s.texto}</span>
          )
        )}
      </div>
    );
  }

  function truncate(s: string, max = 80) {
    return s.length > max ? s.slice(0, max) + "..." : s;
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
            className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
          >
            Identificar Errores
          </Link>
        </div>

        {/* ─── Header ─── */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-cormorant text-xl font-bold text-gz-ink">
            Identificar Errores
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
                {/* Mode toggle */}
                <div className="flex items-center gap-3">
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                    Modo JSON
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!useJsonMode) {
                        // Switch to JSON: serialize current segmentos
                        setSegmentosJson(
                          JSON.stringify(
                            segmentos.map((s, i) => ({
                              id: i,
                              texto: s.texto,
                              esError: s.esError,
                              ...(s.esError
                                ? {
                                    textoCorrecto: s.textoCorrecto || undefined,
                                    explicacion: s.explicacion || undefined,
                                  }
                                : {}),
                            })),
                            null,
                            2
                          )
                        );
                      } else {
                        // Switch to visual: parse JSON
                        try {
                          const parsed = JSON.parse(segmentosJson);
                          setSegmentos(
                            parsed.map((s: Segmento) => ({
                              texto: s.texto,
                              esError: s.esError,
                              textoCorrecto: s.textoCorrecto || "",
                              explicacion: s.explicacion || "",
                            }))
                          );
                        } catch {
                          /* keep existing */
                        }
                      }
                      setUseJsonMode(!useJsonMode);
                    }}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      useJsonMode ? "bg-gz-gold" : "bg-gz-rule"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        useJsonMode ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>

                {useJsonMode ? (
                  /* ─── JSON Mode ─── */
                  <div>
                    <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                      Segmentos (JSON)
                    </label>
                    <textarea
                      value={segmentosJson}
                      onChange={(e) => {
                        setSegmentosJson(e.target.value);
                        setJsonError("");
                      }}
                      rows={10}
                      placeholder='[{ "id": 0, "texto": "El contrato de ", "esError": false }, { "id": 1, "texto": "compra", "esError": true, "textoCorrecto": "compraventa", "explicacion": "..." }]'
                      className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold font-mono"
                    />
                    {jsonError && (
                      <p className="font-ibm-plex text-[11px] text-red-600 mt-1">
                        {jsonError}
                      </p>
                    )}
                  </div>
                ) : (
                  /* ─── Visual Segment Builder ─── */
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid">
                        Segmentos
                      </label>
                      <button
                        onClick={addSegmento}
                        className="font-archivo text-[10px] uppercase tracking-[1px] text-gz-gold hover:underline"
                      >
                        + Agregar segmento
                      </button>
                    </div>
                    <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                      {segmentos.map((seg, idx) => (
                        <div
                          key={idx}
                          className={`border rounded p-3 ${
                            seg.esError
                              ? "border-red-300 bg-red-50/50"
                              : "border-gz-rule bg-white"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-ibm-plex text-[11px] text-gz-ink-mid mt-2 shrink-0">
                              #{idx}
                            </span>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={seg.texto}
                                onChange={(e) =>
                                  updateSegmento(idx, "texto", e.target.value)
                                }
                                placeholder="Texto del segmento..."
                                className="w-full border border-gz-rule rounded px-2 py-1.5 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                              />
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={seg.esError}
                                    onChange={(e) =>
                                      updateSegmento(idx, "esError", e.target.checked)
                                    }
                                    className="accent-red-500"
                                  />
                                  <span className="font-archivo text-[10px] uppercase tracking-[1px] text-red-600">
                                    Es error
                                  </span>
                                </label>
                              </div>
                              {seg.esError && (
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="text"
                                    value={seg.textoCorrecto}
                                    onChange={(e) =>
                                      updateSegmento(idx, "textoCorrecto", e.target.value)
                                    }
                                    placeholder="Texto correcto..."
                                    className="border border-gz-rule rounded px-2 py-1.5 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                                  />
                                  <input
                                    type="text"
                                    value={seg.explicacion}
                                    onChange={(e) =>
                                      updateSegmento(idx, "explicacion", e.target.value)
                                    }
                                    placeholder="Explicación..."
                                    className="border border-gz-rule rounded px-2 py-1.5 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                                  />
                                </div>
                              )}
                            </div>
                            {segmentos.length > 1 && (
                              <button
                                onClick={() => removeSegmento(idx)}
                                className="text-red-400 hover:text-red-600 text-lg mt-1 shrink-0"
                                title="Eliminar segmento"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Vista previa ({getTotalErrores()} error{getTotalErrores() !== 1 ? "es" : ""})
                  </label>
                  <div className="border border-gz-rule rounded p-3 bg-white">
                    {renderPreview()}
                  </div>
                </div>

                {/* explicacionGeneral */}
                <div>
                  <label className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-ink-mid block mb-1">
                    Explicación General (opcional)
                  </label>
                  <textarea
                    value={form.explicacionGeneral}
                    onChange={(e) =>
                      setForm({ ...form, explicacionGeneral: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gz-rule rounded px-3 py-2 font-ibm-plex text-sm text-gz-ink bg-white focus:outline-none focus:ring-1 focus:ring-gz-gold"
                  />
                </div>

                {/* rama + dificultad */}
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
                          {d === 1 ? "1 - Fácil" : d === 2 ? "2 - Media" : "3 - Difícil"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* libro, titulo, materia */}
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
                      Título
                    </label>
                    <input
                      type="text"
                      value={form.titulo}
                      onChange={(e) => setForm({ ...form, titulo: e.target.value })}
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
                    Texto
                  </th>
                  <th className="font-archivo text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid py-2 px-2">
                    Errores
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
                  <tr key={item.id} className="border-b border-gz-rule hover:bg-gz-gold/5">
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink max-w-xs">
                      {truncate(item.textoConErrores)}
                    </td>
                    <td className="py-2 px-2 font-ibm-plex text-[13px] text-gz-ink text-center">
                      {item.totalErrores}
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
