"use client";

import { useState, useEffect } from "react";

export interface HitoData {
  id?: string;
  tipo: "estudiantil" | "profesional" | "academico" | "personal";
  titulo: string;
  descripcion: string | null;
  institucion: string | null;
  fecha: string; // ISO
  esActual: boolean;
}

interface HitoEditorModalProps {
  open: boolean;
  onClose: () => void;
  /** Si se entrega, modo edición. Sino, modo creación. */
  editing?: HitoData | null;
  /** Callback con el hito guardado (creado o editado). */
  onSaved: (hito: HitoData) => void;
  /** Callback opcional cuando se elimina (solo en modo edición). */
  onDeleted?: (id: string) => void;
}

const TIPOS: Array<{
  value: HitoData["tipo"];
  label: string;
  glyph: string;
  color: string;
}> = [
  { value: "estudiantil", label: "Estudiantil", glyph: "❡", color: "var(--gz-gold)" },
  { value: "academico", label: "Académico", glyph: "✠", color: "var(--gz-navy)" },
  { value: "profesional", label: "Profesional", glyph: "⚖", color: "var(--gz-burgundy)" },
  { value: "personal", label: "Personal", glyph: "✦", color: "var(--gz-sage)" },
];

export function HitoEditorModal({
  open,
  onClose,
  editing,
  onSaved,
  onDeleted,
}: HitoEditorModalProps) {
  const [tipo, setTipo] = useState<HitoData["tipo"]>("estudiantil");
  const [titulo, setTitulo] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [fechaAnio, setFechaAnio] = useState<string>(String(new Date().getFullYear()));
  const [fechaMes, setFechaMes] = useState<string>(""); // "" o "01"-"12"
  const [descripcion, setDescripcion] = useState("");
  const [esActual, setEsActual] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset/preload al abrir
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setTipo(editing.tipo);
      setTitulo(editing.titulo);
      setInstitucion(editing.institucion ?? "");
      const d = new Date(editing.fecha);
      setFechaAnio(String(d.getFullYear()));
      setFechaMes(String(d.getMonth() + 1).padStart(2, "0"));
      setDescripcion(editing.descripcion ?? "");
      setEsActual(editing.esActual);
    } else {
      setTipo("estudiantil");
      setTitulo("");
      setInstitucion("");
      setFechaAnio(String(new Date().getFullYear()));
      setFechaMes("");
      setDescripcion("");
      setEsActual(false);
    }
    setError(null);
  }, [open, editing]);

  if (!open) return null;

  async function handleSave() {
    setError(null);
    if (!titulo.trim() || titulo.trim().length < 2) {
      setError("El título es requerido (mínimo 2 caracteres).");
      return;
    }
    if (!/^\d{4}$/.test(fechaAnio)) {
      setError("Año inválido. Usa formato yyyy (ej. 2024).");
      return;
    }
    const fecha = fechaMes ? `${fechaAnio}-${fechaMes}` : fechaAnio;

    setSaving(true);
    try {
      const url = editing?.id
        ? `/api/perfil/hitos/${editing.id}`
        : "/api/perfil/hitos";
      const method = editing?.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          titulo: titulo.trim(),
          institucion: institucion.trim() || null,
          descripcion: descripcion.trim() || null,
          fecha,
          esActual,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al guardar el hito.");
        setSaving(false);
        return;
      }
      const hito: HitoData = await res.json();
      onSaved(hito);
      onClose();
    } catch {
      setError("Error de red. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!editing?.id) return;
    if (!confirm("¿Eliminar este hito de tu trayectoria?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/perfil/hitos/${editing.id}`, {
        method: "DELETE",
      });
      if (res.ok && onDeleted) {
        onDeleted(editing.id);
        onClose();
      }
    } finally {
      setDeleting(false);
    }
  }

  const tipoActivo = TIPOS.find((t) => t.value === tipo)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/45 p-4 overflow-y-auto cal-anim-backdrop"
      onClick={onClose}
    >
      <div
        className="cal-anim-modal w-full max-w-lg rounded-[6px] border border-gz-rule overflow-hidden shadow-[0_20px_50px_-15px_rgba(15,15,15,0.35)] my-8"
        style={{ backgroundColor: "var(--gz-cream)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rail superior color del tipo */}
        <div className="h-[5px] w-full" style={{ backgroundColor: tipoActivo.color }} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4 bg-white">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-full font-cormorant text-[20px] leading-none border-2"
              style={{
                backgroundColor: `color-mix(in srgb, ${tipoActivo.color} 12%, transparent)`,
                color: tipoActivo.color,
                borderColor: `color-mix(in srgb, ${tipoActivo.color} 30%, transparent)`,
              }}
            >
              {tipoActivo.glyph}
            </span>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-ink-light">
                {editing ? "Editar hito" : "Agregar hito"}
              </p>
              <h3 className="font-cormorant text-[22px] font-bold text-gz-ink leading-none mt-0.5">
                Trayectoria
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer"
            aria-label="Cerrar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Tipo (chips) */}
          <div>
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-2">
              Tipo de hito
            </p>
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => {
                const active = tipo === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipo(t.value)}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[1px] transition-all duration-200 cursor-pointer active:scale-95 ${
                      active
                        ? "border-transparent text-white shadow-sm scale-105"
                        : "border-gz-rule text-gz-ink-mid bg-white hover:border-gz-gold/60"
                    }`}
                    style={active ? { backgroundColor: t.color } : undefined}
                  >
                    <span
                      className="font-cormorant text-[12px] leading-none"
                      style={{ color: active ? "#fff" : t.color }}
                    >
                      {t.glyph}
                    </span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Magíster en Derecho Civil"
              autoFocus
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors"
            />
          </div>

          {/* Institución */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Institución / empresa
            </label>
            <input
              type="text"
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
              placeholder="Ej. Universidad de Chile"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors"
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Fecha *
            </label>
            <div className="grid grid-cols-[100px_140px_1fr] gap-2 items-end">
              <div>
                <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light/70 mb-0.5">
                  Año
                </p>
                <input
                  type="number"
                  min={1900}
                  max={new Date().getFullYear() + 5}
                  value={fechaAnio}
                  onChange={(e) => setFechaAnio(e.target.value)}
                  placeholder="2024"
                  className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors"
                />
              </div>
              <div>
                <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-gz-ink-light/70 mb-0.5">
                  Mes (opcional)
                </p>
                <select
                  value={fechaMes}
                  onChange={(e) => setFechaMes(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors"
                >
                  <option value="">— Solo año —</option>
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <input
                  type="checkbox"
                  checked={esActual}
                  onChange={(e) => setEsActual(e.target.checked)}
                  className="h-4 w-4 rounded border-gz-rule text-gz-gold focus:ring-gz-gold"
                />
                <span className="font-archivo text-[12px] text-gz-ink-mid">
                  Es actual
                </span>
              </label>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mb-1">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Detalles, logros, contexto…"
              className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="rounded-[3px] border border-gz-burgundy/30 bg-gz-burgundy/[0.06] px-3 py-2">
              <p className="font-archivo text-[12px] text-gz-burgundy">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gz-rule px-5 py-3 bg-white">
          <div>
            {editing && onDeleted && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-[3px] border border-gz-burgundy/30 px-4 py-1.5 font-archivo text-[12px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] active:scale-95 disabled:opacity-50 transition-all duration-200 cursor-pointer"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-[3px] border border-gz-rule px-4 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !titulo.trim()}
              className="rounded-[3px] bg-gz-navy px-5 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy active:scale-95 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar hito"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
