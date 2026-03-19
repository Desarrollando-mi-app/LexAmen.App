"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────

interface Expediente {
  id: string;
  numero: number;
  titulo: string;
  hechos: string;
  pregunta: string;
  rama: string;
  materias: string | null;
  dificultad: number;
  bandoDemandante: string;
  bandoDemandado: string;
  fechaApertura: string;
  fechaCierre: string;
  estado: string;
  cierreEditorial: string | null;
  aprobado: boolean;
  _count: { argumentos: number };
  argumentosDemandante?: number;
  argumentosDemandado?: number;
}

interface Pendiente {
  id: string;
  numero: number;
  titulo: string;
  hechos: string;
  pregunta: string;
  rama: string;
  propuestaPor: string | null;
  createdAt: string;
}

// ─── Admin nav (shared pattern) ───────────────────────

function AdminNav() {
  return (
    <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 border-b border-gz-rule pb-4">
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
        href="/dashboard/admin/expedientes"
        className="font-archivo text-[11px] uppercase tracking-[1.5px] text-gz-gold font-semibold border-b-2 border-gz-gold pb-0.5"
      >
        Expedientes
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
    </div>
  );
}

// ─── Estado badge ─────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    abierto: "bg-green-100 text-green-800",
    cerrado: "bg-yellow-100 text-yellow-800",
    editorial: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-block font-ibm-mono text-[9px] uppercase tracking-[1px] px-2 py-0.5 rounded-sm ${
        styles[estado] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {estado}
    </span>
  );
}

// ─── Create form ──────────────────────────────────────

const RAMAS = [
  { value: "civil", label: "Civil" },
  { value: "penal", label: "Penal" },
  { value: "constitucional", label: "Constitucional" },
  { value: "laboral", label: "Laboral" },
  { value: "administrativo", label: "Administrativo" },
  { value: "comercial", label: "Comercial" },
  { value: "procesal", label: "Procesal" },
  { value: "tributario", label: "Tributario" },
  { value: "familia", label: "Familia" },
  { value: "internacional", label: "Internacional" },
];

function CreateExpedienteForm({
  onCreated,
  nextNumero,
}: {
  onCreated: () => void;
  nextNumero: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [titulo, setTitulo] = useState("");
  const [hechos, setHechos] = useState("");
  const [pregunta, setPregunta] = useState("");
  const [rama, setRama] = useState("civil");
  const [materias, setMaterias] = useState("");
  const [dificultad, setDificultad] = useState(2);
  const [bandoDemandante, setBandoDemandante] = useState("Demandante");
  const [bandoDemandado, setBandoDemandado] = useState("Demandado");
  const [fechaCierre, setFechaCierre] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/expediente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          hechos,
          pregunta,
          rama,
          materias: materias ? JSON.parse(materias) : null,
          dificultad,
          bandoDemandante,
          bandoDemandado,
          fechaCierre,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al crear");
      }

      // Reset form
      setTitulo("");
      setHechos("");
      setPregunta("");
      setRama("civil");
      setMaterias("");
      setDificultad(2);
      setBandoDemandante("Demandante");
      setBandoDemandado("Demandado");
      setFechaCierre("");
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="font-archivo text-[12px] font-semibold text-white bg-gz-navy px-4 py-2 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors"
      >
        + Crear Expediente
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gz-rule rounded-[3px] p-5 mb-6"
      style={{ backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.03)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">
          Nuevo Expediente N.{nextNumero}
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-gz-ink-light hover:text-gz-ink text-[18px]"
        >
          x
        </button>
      </div>

      {error && (
        <p className="font-archivo text-[12px] text-red-600 mb-3">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Titulo *
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Rama *
          </label>
          <select
            value={rama}
            onChange={(e) => setRama(e.target.value)}
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          >
            {RAMAS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
          Hechos *
        </label>
        <textarea
          value={hechos}
          onChange={(e) => setHechos(e.target.value)}
          required
          rows={4}
          className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold resize-y"
        />
      </div>

      <div className="mb-4">
        <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
          Pregunta *
        </label>
        <input
          type="text"
          value={pregunta}
          onChange={(e) => setPregunta(e.target.value)}
          required
          className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Materias (JSON array)
          </label>
          <input
            type="text"
            value={materias}
            onChange={(e) => setMaterias(e.target.value)}
            placeholder='["Obligaciones","Contratos"]'
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Dificultad (1-3)
          </label>
          <input
            type="number"
            min={1}
            max={3}
            value={dificultad}
            onChange={(e) => setDificultad(parseInt(e.target.value) || 2)}
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Fecha de cierre *
          </label>
          <input
            type="datetime-local"
            value={fechaCierre}
            onChange={(e) => setFechaCierre(e.target.value)}
            required
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Nombre bando demandante
          </label>
          <input
            type="text"
            value={bandoDemandante}
            onChange={(e) => setBandoDemandante(e.target.value)}
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
        <div>
          <label className="block font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
            Nombre bando demandado
          </label>
          <input
            type="text"
            value={bandoDemandado}
            onChange={(e) => setBandoDemandado(e.target.value)}
            className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="font-archivo text-[12px] font-semibold text-white bg-gz-navy px-5 py-2 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
      >
        {loading ? "Creando..." : "Crear Expediente"}
      </button>
    </form>
  );
}

// ─── Cierre Editorial Editor ──────────────────────────

function CierreEditorialEditor({
  expedienteId,
  currentEditorial,
  onSaved,
  onCancel,
}: {
  expedienteId: string;
  currentEditorial: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(currentEditorial ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/expediente/${expedienteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cierreEditorial: text,
          estado: "editorial",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-gz-gold/30 rounded-[3px] p-4 mt-3" style={{ backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.03)" }}>
      <h4 className="font-cormorant text-[18px] !font-bold text-gz-ink mb-3">
        Cierre Editorial
      </h4>
      {error && <p className="font-archivo text-[12px] text-red-600 mb-2">{error}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Escribe el cierre editorial del expediente..."
        className="w-full border border-gz-rule rounded-[3px] px-3 py-2 font-archivo text-[13px] text-gz-ink bg-white focus:outline-none focus:border-gz-gold resize-y mb-3"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={loading || !text.trim()}
          className="font-archivo text-[11px] font-semibold text-white bg-gz-navy px-4 py-1.5 rounded-[3px] hover:bg-gz-gold hover:text-gz-navy transition-colors disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar cierre editorial"}
        </button>
        <button
          onClick={onCancel}
          className="font-archivo text-[11px] text-gz-ink-mid hover:text-gz-ink transition-colors px-3 py-1.5"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────

export default function AdminExpedientesPage() {
  const [expedientes, setExpedientes] = useState<Expediente[]>([]);
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextNumero, setNextNumero] = useState(1);
  const [editorialId, setEditorialId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [expRes, pendRes] = await Promise.all([
        fetch("/api/expediente?limit=50"),
        fetch("/api/expediente/admin"),
      ]);

      if (expRes.ok) {
        const expData = await expRes.json();
        setExpedientes(expData.expedientes ?? []);
        const maxNum = Math.max(0, ...((expData.expedientes ?? []) as Expediente[]).map((e: Expediente) => e.numero));
        setNextNumero(maxNum + 1);
      }

      if (pendRes.ok) {
        const pendData = await pendRes.json();
        setPendientes(pendData.pendientes ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleCerrar(id: string) {
    if (!confirm("Cerrar este expediente ahora? Se asignaran XP a los mejores argumentos.")) return;
    setActionLoading(id);
    try {
      const res = await fetch(`/api/expediente/${id}/cerrar`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al cerrar");
      } else {
        fetchData();
      }
    } catch {
      alert("Error de red");
    } finally {
      setActionLoading(null);
    }
  }

  async function handlePendienteAction(id: string, action: "aprobar" | "rechazar") {
    setActionLoading(id);
    try {
      const res = await fetch("/api/expediente/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error");
      } else {
        fetchData();
      }
    } catch {
      alert("Error de red");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-5xl px-4 py-6">
        <AdminNav />

        <div className="flex items-center justify-between mb-6">
          <h2 className="font-cormorant text-[26px] !font-bold text-gz-ink">
            Expediente Abierto
          </h2>
          <CreateExpedienteForm onCreated={fetchData} nextNumero={nextNumero} />
        </div>

        {loading && (
          <p className="font-cormorant italic text-[14px] text-gz-ink-light">
            Cargando...
          </p>
        )}

        {/* ─── Pending proposals ─── */}
        {pendientes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
                Propuestas pendientes
              </p>
              <div className="flex-1 h-px bg-gz-rule" />
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                {pendientes.length}
              </span>
            </div>

            <div className="space-y-3">
              {pendientes.map((p) => (
                <div
                  key={p.id}
                  className="border border-gz-gold/30 rounded-[3px] p-4"
                  style={{ backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.04)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-cormorant text-[18px] !font-bold text-gz-ink mb-1">
                        {p.titulo}
                      </p>
                      <p className="font-archivo text-[12px] text-gz-ink-mid line-clamp-2 mb-2">
                        {p.hechos}
                      </p>
                      <p className="font-ibm-mono text-[9px] text-gz-ink-light">
                        Rama: {p.rama}
                        {p.propuestaPor && " \u00B7 Propuesto por usuario"}
                        {" \u00B7 "}
                        {new Date(p.createdAt).toLocaleDateString("es-CL")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handlePendienteAction(p.id, "aprobar")}
                        disabled={actionLoading === p.id}
                        className="font-archivo text-[11px] font-semibold text-white bg-green-700 px-3 py-1.5 rounded-[3px] hover:bg-green-800 transition-colors disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handlePendienteAction(p.id, "rechazar")}
                        disabled={actionLoading === p.id}
                        className="font-archivo text-[11px] font-semibold text-red-700 bg-red-50 px-3 py-1.5 rounded-[3px] hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Expedientes table ─── */}
        <div className="flex items-center gap-3 mb-4">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
            Todos los expedientes
          </p>
          <div className="flex-1 h-px bg-gz-rule" />
        </div>

        {!loading && expedientes.length === 0 ? (
          <p className="font-cormorant italic text-[14px] text-gz-ink-light">
            No hay expedientes creados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gz-ink">
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-3">
                    N.
                  </th>
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-3">
                    Titulo
                  </th>
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-3">
                    Estado
                  </th>
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-3">
                    Args
                  </th>
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2 pr-3">
                    Cierre
                  </th>
                  <th className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light py-2">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gz-rule">
                {expedientes.map((exp) => (
                  <tr key={exp.id} className="group">
                    <td className="font-cormorant text-[16px] !font-bold text-gz-ink py-3 pr-3">
                      {exp.numero}
                    </td>
                    <td className="py-3 pr-3 max-w-[250px]">
                      <p className="font-archivo text-[13px] text-gz-ink truncate">
                        {exp.titulo}
                      </p>
                    </td>
                    <td className="py-3 pr-3">
                      <EstadoBadge estado={exp.estado} />
                    </td>
                    <td className="font-ibm-mono text-[11px] text-gz-ink-mid py-3 pr-3">
                      {exp._count?.argumentos ?? 0}
                    </td>
                    <td className="font-ibm-mono text-[10px] text-gz-ink-light py-3 pr-3 whitespace-nowrap">
                      {new Date(exp.fechaCierre).toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/diario/expediente/${exp.id}`}
                          className="font-archivo text-[10px] font-semibold text-gz-gold hover:text-gz-navy transition-colors"
                        >
                          Ver
                        </Link>
                        {exp.estado === "abierto" && (
                          <button
                            onClick={() => handleCerrar(exp.id)}
                            disabled={actionLoading === exp.id}
                            className="font-archivo text-[10px] font-semibold text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                          >
                            Cerrar
                          </button>
                        )}
                        {(exp.estado === "cerrado" || exp.estado === "editorial") && (
                          <button
                            onClick={() =>
                              setEditorialId(editorialId === exp.id ? null : exp.id)
                            }
                            className="font-archivo text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {editorialId === exp.id ? "Cancelar" : "Editorial"}
                          </button>
                        )}
                      </div>

                      {editorialId === exp.id && (
                        <CierreEditorialEditor
                          expedienteId={exp.id}
                          currentEditorial={exp.cierreEditorial}
                          onSaved={() => {
                            setEditorialId(null);
                            fetchData();
                          }}
                          onCancel={() => setEditorialId(null)}
                        />
                      )}
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
