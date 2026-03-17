"use client";

import { useState } from "react";

// ─── Types ──────────────────────────────────────────────

interface CountdownItem {
  id: string;
  titulo: string;
  fecha: string;
  color: string;
  isGrado: boolean;
}

interface CountdownsSidebarProps {
  initialCountdowns: CountdownItem[];
}

// ─── Constants ──────────────────────────────────────────

const COUNTDOWN_COLORS = [
  { value: "#c41a1a", label: "Rojo", nombre: "Urgente" },
  { value: "#d4a017", label: "Amarillo", nombre: "Importante" },
  { value: "#1e4080", label: "Azul", nombre: "Normal" },
  { value: "#3a5a35", label: "Verde", nombre: "Tranquilo" },
  { value: "#6b1d2a", label: "Morado", nombre: "Especial" },
  { value: "#9a7230", label: "Gold", nombre: "Studio Iuris" },
];

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

// ─── Helpers ────────────────────────────────────────────

function getDaysUntil(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getDate()} de ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Component ──────────────────────────────────────────

export function CountdownsSidebar({ initialCountdowns }: CountdownsSidebarProps) {
  const [countdowns, setCountdowns] = useState<CountdownItem[]>(initialCountdowns);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CountdownItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formTitulo, setFormTitulo] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formColor, setFormColor] = useState("#c41a1a");
  const [formIsGrado, setFormIsGrado] = useState(false);

  function openCreate() {
    setEditing(null);
    setFormTitulo("");
    setFormFecha("");
    setFormColor("#c41a1a");
    setFormIsGrado(false);
    setShowModal(true);
  }

  function openEdit(c: CountdownItem) {
    setEditing(c);
    setFormTitulo(c.titulo);
    setFormFecha(c.fecha.slice(0, 10));
    setFormColor(c.color);
    setFormIsGrado(c.isGrado);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formTitulo.trim() || !formFecha) return;
    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/calendario/countdowns/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: formTitulo.trim(),
            fecha: formFecha,
            color: formColor,
            isGrado: formIsGrado,
          }),
        });
        if (res.ok) {
          const updated = await res.json();
          setCountdowns((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? { ...updated, fecha: updated.fecha }
                : c
            )
          );
          setShowModal(false);
        }
      } else {
        const res = await fetch("/api/calendario/countdowns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: formTitulo.trim(),
            fecha: formFecha,
            color: formColor,
            isGrado: formIsGrado,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setCountdowns((prev) =>
            [...prev, { ...created, fecha: created.fecha }].sort(
              (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
            )
          );
          setShowModal(false);
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editing) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/calendario/countdowns/${editing.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCountdowns((prev) => prev.filter((c) => c.id !== editing.id));
        setShowModal(false);
      }
    } catch { /* silent */ }
    setDeleting(false);
  }

  const hasGrado = countdowns.some((c) => c.isGrado);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          Cuentas regresivas
        </p>
        <button
          onClick={openCreate}
          className="font-archivo text-[11px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
        >
          + Agregar
        </button>
      </div>

      {/* Countdown cards */}
      {countdowns.length === 0 && (
        <div className="rounded-[4px] border border-gz-rule bg-white p-4 text-center">
          <p className="font-cormorant italic text-[13px] text-gz-ink-light">
            Sin cuentas regresivas
          </p>
          <button
            onClick={openCreate}
            className="mt-2 font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
          >
            Crear la primera
          </button>
        </div>
      )}

      <div className="space-y-2">
        {countdowns.map((c) => {
          const days = getDaysUntil(c.fecha);
          const isPast = days < 0;
          const isToday = days === 0;

          return (
            <div
              key={c.id}
              className={`group relative rounded-[4px] border border-gz-rule bg-white p-3 transition-colors ${
                c.isGrado ? "border-l-4" : "border-l-4"
              }`}
              style={{
                borderLeftColor: c.color,
                backgroundColor: c.isGrado ? `${c.color}08` : undefined,
              }}
            >
              {/* Days count */}
              <p
                className="font-cormorant text-[28px] font-bold leading-none"
                style={{ color: c.color }}
              >
                {isPast
                  ? `+${Math.abs(days)}`
                  : isToday
                  ? "Hoy"
                  : days}{" "}
                {!isToday && (
                  <span className="font-archivo text-[11px] font-normal text-gz-ink-light">
                    {isPast ? "días pasados" : days === 1 ? "día" : "días"}
                  </span>
                )}
              </p>

              {/* Title */}
              <p className="font-archivo text-[13px] font-semibold text-gz-ink mt-1 leading-tight">
                {c.titulo}
              </p>

              {/* Date */}
              <p className="font-ibm-mono text-[10px] text-gz-ink-light mt-0.5">
                {formatDate(c.fecha)}
              </p>

              {/* Edit button on hover */}
              <button
                onClick={() => openEdit(c)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gz-ink-light hover:text-gz-ink transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-[4px] border border-gz-rule p-5 shadow-sm"
            style={{ backgroundColor: "var(--gz-cream)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-cormorant text-[18px] font-bold text-gz-ink mb-4">
              {editing ? "Editar countdown" : "Nuevo countdown"}
            </h3>

            <div className="space-y-3">
              {/* Titulo */}
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="Ej: Examen de Grado"
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                  Fecha *
                </label>
                <input
                  type="date"
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>

              {/* Color */}
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {COUNTDOWN_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormColor(c.value)}
                      className={`h-7 w-7 rounded-full border-2 transition-all ${
                        formColor === c.value
                          ? "border-gz-ink scale-110"
                          : "border-transparent hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.nombre}
                    />
                  ))}
                </div>
              </div>

              {/* Is grado */}
              {(!hasGrado || editing?.isGrado) && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsGrado}
                    onChange={(e) => setFormIsGrado(e.target.checked)}
                    className="h-4 w-4 rounded border-gz-rule text-gz-gold focus:ring-gz-gold"
                  />
                  <span className="font-archivo text-[13px] text-gz-ink">
                    Es mi examen de grado
                  </span>
                </label>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-5 flex items-center justify-between">
              <div>
                {editing && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="rounded-[3px] border border-gz-burgundy/30 px-3 py-1.5 font-archivo text-[12px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "..." : "Eliminar"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !formTitulo.trim() || !formFecha}
                  className="rounded-[3px] bg-gz-navy px-4 py-1.5 font-archivo text-[12px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50 transition-colors"
                >
                  {saving ? "..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
