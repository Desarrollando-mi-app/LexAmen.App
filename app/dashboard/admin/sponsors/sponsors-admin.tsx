"use client";

import { useState } from "react";
import Link from "next/link";

interface SponsorItem {
  id: string;
  nombre: string;
  titulo: string | null;
  descripcion: string | null;
  imagenUrl: string | null;
  linkUrl: string | null;
  posicion: string;
  activo: boolean;
  fechaInicio: string;
  fechaFin: string | null;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

const POSICIONES = [
  { value: "principal", label: "Principal" },
  { value: "lateral", label: "Lateral" },
  { value: "footer", label: "Footer" },
];

export function SponsorsAdmin({ initialSponsors }: { initialSponsors: SponsorItem[] }) {
  const [sponsors, setSponsors] = useState<SponsorItem[]>(initialSponsors);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<SponsorItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form
  const [fNombre, setFNombre] = useState("");
  const [fTitulo, setFTitulo] = useState("");
  const [fDescripcion, setFDescripcion] = useState("");
  const [fImagenUrl, setFImagenUrl] = useState("");
  const [fLinkUrl, setFLinkUrl] = useState("");
  const [fPosicion, setFPosicion] = useState("lateral");
  const [fActivo, setFActivo] = useState(true);
  const [fFechaInicio, setFFechaInicio] = useState("");
  const [fFechaFin, setFFechaFin] = useState("");

  function openCreate() {
    setEditing(null);
    setFNombre("");
    setFTitulo("");
    setFDescripcion("");
    setFImagenUrl("");
    setFLinkUrl("");
    setFPosicion("lateral");
    setFActivo(true);
    setFFechaInicio(new Date().toISOString().slice(0, 10));
    setFFechaFin("");
    setShowModal(true);
  }

  function openEdit(s: SponsorItem) {
    setEditing(s);
    setFNombre(s.nombre);
    setFTitulo(s.titulo ?? "");
    setFDescripcion(s.descripcion ?? "");
    setFImagenUrl(s.imagenUrl ?? "");
    setFLinkUrl(s.linkUrl ?? "");
    setFPosicion(s.posicion);
    setFActivo(s.activo);
    setFFechaInicio(s.fechaInicio.slice(0, 10));
    setFFechaFin(s.fechaFin?.slice(0, 10) ?? "");
    setShowModal(true);
  }

  async function handleSave() {
    if (!fNombre.trim()) return;
    setSaving(true);
    const payload = {
      nombre: fNombre.trim(),
      titulo: fTitulo.trim() || null,
      descripcion: fDescripcion.trim() || null,
      imagenUrl: fImagenUrl.trim() || null,
      linkUrl: fLinkUrl.trim() || null,
      posicion: fPosicion,
      activo: fActivo,
      fechaInicio: fFechaInicio || undefined,
      fechaFin: fFechaFin || null,
    };

    try {
      if (editing) {
        const res = await fetch(`/api/admin/sponsors/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setSponsors((prev) =>
            prev.map((s) => (s.id === updated.id ? {
              ...updated,
              fechaInicio: updated.fechaInicio,
              fechaFin: updated.fechaFin,
              createdAt: updated.createdAt,
              updatedAt: updated.updatedAt,
            } : s))
          );
          setShowModal(false);
        }
      } else {
        const res = await fetch("/api/admin/sponsors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const created = await res.json();
          setSponsors((prev) => [{
            ...created,
            fechaInicio: created.fechaInicio,
            fechaFin: created.fechaFin,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
          }, ...prev]);
          setShowModal(false);
        }
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleDelete() {
    if (!editing || !confirm("¿Eliminar este sponsor?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/sponsors/${editing.id}`, { method: "DELETE" });
      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== editing.id));
        setShowModal(false);
      }
    } catch { /* silent */ }
    setDeleting(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/admin" className="font-archivo text-[12px] text-gz-ink-mid hover:text-gz-gold transition-colors">
            ← Admin
          </Link>
          <h1 className="font-cormorant text-[28px] !font-bold text-gz-ink mt-1">Sponsors</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-ibm-mono text-[11px] text-gz-ink-light">
            Total: {sponsors.length}
          </span>
          <button
            onClick={openCreate}
            className="rounded-[3px] bg-gz-navy px-4 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy transition-colors"
          >
            + Nuevo banner
          </button>
        </div>
      </div>

      {/* Table */}
      {sponsors.length === 0 ? (
        <div className="rounded-[4px] border border-gz-rule bg-white p-8 text-center">
          <p className="font-cormorant italic text-[15px] text-gz-ink-light">Sin sponsors aún</p>
          <button
            onClick={openCreate}
            className="mt-3 font-archivo text-[13px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
          >
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gz-rule">
                <th className="text-left px-4 py-3 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">Nombre</th>
                <th className="text-left px-4 py-3 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">Posición</th>
                <th className="text-right px-4 py-3 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">Clicks</th>
                <th className="text-center px-4 py-3 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">Activo</th>
                <th className="text-right px-4 py-3 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light" />
              </tr>
            </thead>
            <tbody>
              {sponsors.map((s) => (
                <tr key={s.id} className="border-b border-gz-cream-dark hover:bg-gz-cream-dark/20 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-archivo text-[13px] font-medium text-gz-ink">{s.nombre}</p>
                    {s.titulo && <p className="font-archivo text-[11px] text-gz-ink-light truncate max-w-[200px]">{s.titulo}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-ibm-mono text-[10px] uppercase text-gz-ink-mid px-2 py-0.5 bg-gz-cream-dark rounded-sm">
                      {s.posicion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-ibm-mono text-[12px] text-gz-ink-mid">
                    {s.clicks}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${s.activo ? "bg-gz-sage" : "bg-gz-ink-light/30"}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(s)}
                      className="font-archivo text-[12px] text-gz-gold hover:text-gz-navy transition-colors"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-lg rounded-[4px] border border-gz-rule p-6 shadow-sm max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: "var(--gz-cream)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-4">
              {editing ? "Editar sponsor" : "Nuevo sponsor"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Nombre *</label>
                <input type="text" value={fNombre} onChange={(e) => setFNombre(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                  placeholder="Ej: Editorial Jurídica"
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Título del banner</label>
                <input type="text" value={fTitulo} onChange={(e) => setFTitulo(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Descripción</label>
                <textarea value={fDescripcion} onChange={(e) => setFDescripcion(e.target.value)} rows={2}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none resize-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">URL de la imagen</label>
                <input type="url" value={fImagenUrl} onChange={(e) => setFImagenUrl(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">URL destino (link)</label>
                <input type="url" value={fLinkUrl} onChange={(e) => setFLinkUrl(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                />
              </div>
              <div>
                <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Posición</label>
                <select value={fPosicion} onChange={(e) => setFPosicion(e.target.value)}
                  className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                  style={{ backgroundColor: "var(--gz-cream)" }}
                >
                  {POSICIONES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Fecha inicio</label>
                  <input type="date" value={fFechaInicio} onChange={(e) => setFFechaInicio(e.target.value)}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  />
                </div>
                <div>
                  <label className="block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mb-1">Fecha fin (vacío = indef.)</label>
                  <input type="date" value={fFechaFin} onChange={(e) => setFFechaFin(e.target.value)}
                    className="w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                    style={{ backgroundColor: "var(--gz-cream)" }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={fActivo} onChange={(e) => setFActivo(e.target.checked)}
                  className="h-4 w-4 rounded border-gz-rule text-gz-gold focus:ring-gz-gold"
                />
                <span className="font-archivo text-[13px] text-gz-ink">Activo</span>
              </label>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex items-center justify-between">
              <div>
                {editing && (
                  <button onClick={handleDelete} disabled={deleting}
                    className="rounded-[3px] border border-gz-burgundy/30 px-3 py-1.5 font-archivo text-[12px] font-medium text-gz-burgundy hover:bg-gz-burgundy/[0.06] disabled:opacity-50 transition-colors"
                  >
                    {deleting ? "..." : "Eliminar"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModal(false)}
                  className="rounded-[3px] border border-gz-rule px-3 py-1.5 font-archivo text-[12px] font-medium text-gz-ink-mid hover:bg-gz-cream-dark/50 transition-colors"
                >
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !fNombre.trim()}
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
