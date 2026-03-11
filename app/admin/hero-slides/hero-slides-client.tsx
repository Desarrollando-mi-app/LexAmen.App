"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface SlideRow {
  id: string;
  origen: string;
  tipo: string;
  imagenUrl: string;
  titulo: string;
  ubicaciones: string[];
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  impresiones: number;
  clics: number;
  anunciante: { nombre: string } | null;
  diarioPost: { titulo: string } | null;
  createdAt: string;
}

const ESTADO_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-700",
  aprobado: "bg-blue-100 text-blue-700",
  activo: "bg-green-100 text-green-700",
  pausado: "bg-yellow-100 text-yellow-700",
  finalizado: "bg-gray-100 text-gray-500",
};

const ORIGEN_BADGE: Record<string, string> = {
  editorial: "bg-navy/10 text-navy",
  publicitario: "bg-gold/20 text-gold",
};

export function HeroSlidesClient() {
  const [slides, setSlides] = useState<SlideRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/hero-slides")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSlides(data);
      })
      .catch(() => toast.error("Error cargando slides"))
      .finally(() => setLoading(false));
  }, []);

  // KPIs
  const activosAhora = slides.filter((s) => s.estado === "activo").length;
  const impresionesEsteMes = slides.reduce((sum, s) => sum + s.impresiones, 0); // simplified — real metric needs event-based
  const clicsEsteMes = slides.reduce((sum, s) => sum + s.clics, 0);
  const ctr = impresionesEsteMes > 0 ? ((clicsEsteMes / impresionesEsteMes) * 100).toFixed(1) : "0.0";

  const handleToggleEstado = async (slide: SlideRow) => {
    const nuevoEstado = slide.estado === "activo" ? "pausado" : "activo";
    try {
      const res = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? { ...s, estado: nuevoEstado } : s))
      );
      toast.success(`Slide ${nuevoEstado}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  const handleDelete = async (slide: SlideRow) => {
    if (!confirm("¿Eliminar este slide borrador?")) return;
    try {
      const res = await fetch(`/api/admin/hero-slides/${slide.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setSlides((prev) => prev.filter((s) => s.id !== slide.id));
      toast.success("Slide eliminado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-navy">🖼️ Hero Slides</h1>
        <Link
          href="/admin/hero-slides/nuevo"
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-white hover:bg-gold/90 transition-colors"
        >
          + Nuevo Slide
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Slides activos", value: activosAhora, color: "text-green-600" },
          { label: "Impresiones totales", value: impresionesEsteMes.toLocaleString(), color: "text-navy" },
          { label: "Clics totales", value: clicsEsteMes.toLocaleString(), color: "text-navy" },
          { label: "CTR promedio", value: `${ctr}%`, color: "text-gold" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs text-navy/50 uppercase tracking-wider">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 text-center text-navy/50 animate-pulse">Cargando slides...</div>
      ) : slides.length === 0 ? (
        <div className="py-12 text-center text-navy/50">
          No hay slides aún. <Link href="/admin/hero-slides/nuevo" className="text-gold underline">Crea el primero</Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-paper">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Img</th>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Título</th>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Origen</th>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Ubic.</th>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-navy/60">Fechas</th>
                <th className="px-4 py-3 text-right font-semibold text-navy/60">Impr.</th>
                <th className="px-4 py-3 text-right font-semibold text-navy/60">Clics</th>
                <th className="px-4 py-3 text-right font-semibold text-navy/60">CTR</th>
                <th className="px-4 py-3 text-right font-semibold text-navy/60">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {slides.map((s) => {
                const slideCtr = s.impresiones > 0 ? ((s.clics / s.impresiones) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={s.id} className="hover:bg-paper/50">
                    <td className="px-4 py-3">
                      <img
                        src={s.imagenUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-navy max-w-[200px] truncate">
                      {s.titulo}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ORIGEN_BADGE[s.origen] || ""}`}>
                        {s.origen}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {s.ubicaciones.map((u) => (
                          <span key={u} className="rounded bg-navy/5 px-1.5 py-0.5 text-[10px] font-medium text-navy/60">
                            {u}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ESTADO_BADGE[s.estado] || ""}`}>
                        {s.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-navy/50">
                      {new Date(s.fechaInicio).toLocaleDateString("es-CL")}
                      {" → "}
                      {s.fechaFin ? new Date(s.fechaFin).toLocaleDateString("es-CL") : "Sin vencimiento"}
                    </td>
                    <td className="px-4 py-3 text-right text-navy/70">{s.impresiones.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-navy/70">{s.clics.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-navy/70">{slideCtr}%</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/hero-slides/${s.id}/editar`}
                          className="rounded px-2 py-1 text-xs text-navy hover:bg-navy/10 transition-colors"
                        >
                          Editar
                        </Link>
                        {(s.estado === "activo" || s.estado === "pausado") && (
                          <button
                            onClick={() => handleToggleEstado(s)}
                            className="rounded px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 transition-colors"
                          >
                            {s.estado === "activo" ? "Pausar" : "Activar"}
                          </button>
                        )}
                        {s.estado === "borrador" && (
                          <button
                            onClick={() => handleDelete(s)}
                            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
