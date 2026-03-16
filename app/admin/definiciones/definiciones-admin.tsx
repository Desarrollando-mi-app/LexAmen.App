"use client";

import { useState, useEffect, useCallback } from "react";

/* ─── Types ─── */

interface Definicion {
  id: string;
  concepto: string;
  definicion: string;
  distractor1: string;
  distractor2: string;
  distractor3: string;
  rama: string | null;
  libro: string | null;
  titulo: string | null;
  explicacion: string | null;
  articuloRef: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { intentos: number };
}

const EMPTY_FORM = {
  concepto: "",
  definicion: "",
  distractor1: "",
  distractor2: "",
  distractor3: "",
  rama: "",
  libro: "",
  titulo: "",
  explicacion: "",
  articuloRef: "",
  isActive: true,
};

/* ─── Component ─── */

export function DefinicionesAdmin() {
  const [definiciones, setDefiniciones] = useState<Definicion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // id or "new"
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/definiciones");
      const data = await res.json();
      setDefiniciones(data.definiciones ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleNew = () => {
    setEditing("new");
    setForm(EMPTY_FORM);
  };

  const handleEdit = (d: Definicion) => {
    setEditing(d.id);
    setForm({
      concepto: d.concepto,
      definicion: d.definicion,
      distractor1: d.distractor1,
      distractor2: d.distractor2,
      distractor3: d.distractor3,
      rama: d.rama ?? "",
      libro: d.libro ?? "",
      titulo: d.titulo ?? "",
      explicacion: d.explicacion ?? "",
      articuloRef: d.articuloRef ?? "",
      isActive: d.isActive,
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.concepto || !form.definicion || !form.distractor1 || !form.distractor2 || !form.distractor3) {
      alert("Completa los campos obligatorios: concepto, definición y 3 distractores.");
      return;
    }

    setSaving(true);
    try {
      const isNew = editing === "new";
      const url = isNew
        ? "/api/admin/definiciones"
        : `/api/admin/definiciones/${editing}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        handleCancel();
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error ?? "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta definición?")) return;
    await fetch(`/api/admin/definiciones/${id}`, { method: "DELETE" });
    fetchAll();
  };

  const handleToggleActive = async (d: Definicion) => {
    await fetch(`/api/admin/definiciones/${d.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !d.isActive }),
    });
    fetchAll();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy">Definiciones</h1>
          <p className="text-sm text-navy/60 mt-1">
            {definiciones.length} definiciones &middot;{" "}
            {definiciones.filter((d) => d.isActive).length} activas
          </p>
        </div>
        <button
          onClick={handleNew}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors"
        >
          + Nueva Definici&oacute;n
        </button>
      </div>

      {/* Form */}
      {editing && (
        <div className="rounded-lg border border-border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-navy">
            {editing === "new" ? "Nueva Definición" : "Editar Definición"}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Definici&oacute;n (texto que ve el alumno) *
              </label>
              <textarea
                value={form.definicion}
                onChange={(e) => setForm({ ...form, definicion: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                rows={3}
                placeholder="La definición legal que el alumno leerá..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Concepto correcto *
              </label>
              <input
                value={form.concepto}
                onChange={(e) => setForm({ ...form, concepto: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Ej: Usufructo"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Art&iacute;culo referencia
              </label>
              <input
                value={form.articuloRef}
                onChange={(e) => setForm({ ...form, articuloRef: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Ej: Art. 764 CC"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Distractor 1 *
              </label>
              <input
                value={form.distractor1}
                onChange={(e) => setForm({ ...form, distractor1: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Opción incorrecta 1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Distractor 2 *
              </label>
              <input
                value={form.distractor2}
                onChange={(e) => setForm({ ...form, distractor2: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Opción incorrecta 2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Distractor 3 *
              </label>
              <input
                value={form.distractor3}
                onChange={(e) => setForm({ ...form, distractor3: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                placeholder="Opción incorrecta 3"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Rama
              </label>
              <select
                value={form.rama}
                onChange={(e) => setForm({ ...form, rama: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
              >
                <option value="">Sin rama</option>
                <option value="DERECHO_CIVIL">Derecho Civil</option>
                <option value="DERECHO_PROCESAL_CIVIL">Derecho Procesal Civil</option>
                <option value="DERECHO_ORGANICO">Derecho Org&aacute;nico</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-navy/70 mb-1">
                Explicaci&oacute;n (opcional)
              </label>
              <textarea
                value={form.explicacion}
                onChange={(e) => setForm({ ...form, explicacion: e.target.value })}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold/50"
                rows={2}
                placeholder="Explicación que aparece después de responder..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded border-border"
                id="isActive"
              />
              <label htmlFor="isActive" className="text-sm text-navy/70">
                Activa (visible para alumnos)
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={handleCancel}
              className="rounded-lg border border-border px-5 py-2 text-sm text-navy/60 hover:bg-navy/5 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-navy/40">Cargando...</div>
      ) : definiciones.length === 0 ? (
        <div className="py-12 text-center text-navy/40">
          No hay definiciones a&uacute;n. Crea la primera.
        </div>
      ) : (
        <div className="space-y-2">
          {definiciones.map((d) => (
            <div
              key={d.id}
              className={`rounded-lg border border-border bg-white p-4 ${
                !d.isActive ? "opacity-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-navy text-sm">
                      {d.concepto}
                    </span>
                    {d.rama && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold/10 text-gold font-medium">
                        {d.rama.replace(/_/g, " ")}
                      </span>
                    )}
                    {!d.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium">
                        INACTIVA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-navy/70 line-clamp-2 italic">
                    &ldquo;{d.definicion}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] text-navy/40">
                    <span>Distractores: {d.distractor1}, {d.distractor2}, {d.distractor3}</span>
                    <span>&middot;</span>
                    <span>{d._count.intentos} intentos</span>
                    {d.articuloRef && (
                      <>
                        <span>&middot;</span>
                        <span>{d.articuloRef}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleToggleActive(d)}
                    className="rounded px-2 py-1 text-xs text-navy/50 hover:bg-navy/5 transition-colors"
                    title={d.isActive ? "Desactivar" : "Activar"}
                  >
                    {d.isActive ? "👁" : "👁‍🗨"}
                  </button>
                  <button
                    onClick={() => handleEdit(d)}
                    className="rounded px-2 py-1 text-xs text-navy/50 hover:bg-navy/5 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(d.id)}
                    className="rounded px-2 py-1 text-xs text-red-400 hover:bg-red-50 transition-colors"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
