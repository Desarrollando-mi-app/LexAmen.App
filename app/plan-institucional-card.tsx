"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────

const TIPO_OPTIONS = [
  { value: "FACULTAD_DERECHO", label: "Facultad de Derecho" },
  { value: "ESTUDIO_JURIDICO", label: "Estudio Jurídico" },
  { value: "CENTRO_INVESTIGACION", label: "Centro de Investigación" },
  { value: "OTRO", label: "Otro" },
];

// ─── Card Component ──────────────────────────────────────

export function PlanInstitucionalCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative rounded-2xl border-2 border-dashed border-gold/50 bg-navy/[0.03] p-8 sm:col-span-2 lg:col-span-1">
        {/* Badge */}
        <span className="absolute -top-3 left-6 rounded-full bg-gold/90 px-3 py-1 text-xs font-bold text-white animate-pulse">
          PRÓXIMAMENTE
        </span>

        <h3 className="text-lg font-bold text-navy">Plan Institucional</h3>
        <p className="mt-1 text-sm text-navy/60">
          Para facultades y estudios jurídicos
        </p>

        <div className="my-5 h-px bg-border" />

        <ul className="space-y-3 text-sm text-navy/70">
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Perfil institucional verificado
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Publicaciones con sello en El Diario
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Acceso premium para todos los miembros
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Panel de métricas institucional
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Soporte prioritario
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gold">✦</span> Insignia institucional en el ranking
          </li>
        </ul>

        <p className="mt-5 text-sm text-navy/50">
          Tarifa única · Por definir
        </p>

        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full rounded-xl bg-navy px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-navy/90"
        >
          Registrar interés
        </button>

        <p className="mt-2 text-center text-[11px] text-navy/40">
          Sin compromisos. Te avisamos cuando esté disponible.
        </p>
      </div>

      {showModal && (
        <RegistroInteresModal onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

// ─── Modal Component ─────────────────────────────────────

function RegistroInteresModal({ onClose }: { onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [nombreInstitucion, setNombreInstitucion] = useState("");
  const [tipoInstitucion, setTipoInstitucion] = useState("");
  const [nombreContacto, setNombreContacto] = useState("");
  const [emailContacto, setEmailContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [sending, setSending] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nombreInstitucion.trim() || !tipoInstitucion || !nombreContacto.trim() || !emailContacto.trim()) {
      toast.error("Completa todos los campos obligatorios");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/institucional/interes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreInstitucion,
          tipoInstitucion,
          nombreContacto,
          emailContacto,
          telefono: telefono || null,
          mensaje: mensaje || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar");
        return;
      }
      toast.success("¡Registro recibido! Te contactaremos pronto.");
      onClose();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-white shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-navy/40 hover:bg-navy/5 hover:text-navy transition-colors"
          aria-label="Cerrar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="M6 6 18 18" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <h2 className="text-lg font-bold text-navy font-display">
            Registrar interés institucional
          </h2>
          <p className="mt-1 text-sm text-navy/60">
            Serás de los primeros en saber cuando el Plan Institucional esté disponible.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-navy/60">
                Nombre de la institución *
              </label>
              <input
                type="text"
                value={nombreInstitucion}
                onChange={(e) => setNombreInstitucion(e.target.value)}
                placeholder="Ej. Facultad de Derecho, Universidad de Chile"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold/50 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60">
                Tipo de institución *
              </label>
              <select
                value={tipoInstitucion}
                onChange={(e) => setTipoInstitucion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy focus:border-gold/50 focus:outline-none"
                required
              >
                <option value="">Selecciona un tipo</option>
                {TIPO_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60">
                Nombre del contacto *
              </label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Tu nombre completo"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold/50 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60">
                Email de contacto *
              </label>
              <input
                type="email"
                value={emailContacto}
                onChange={(e) => setEmailContacto(e.target.value)}
                placeholder="contacto@universidad.cl"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold/50 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60">
                Teléfono <span className="font-normal text-navy/40">(opcional)</span>
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy placeholder:text-navy/30 focus:border-gold/50 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-navy/60">
                Mensaje <span className="font-normal text-navy/40">(opcional)</span>
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="¿Algo que quieras contarnos?"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-navy resize-none placeholder:text-navy/30 focus:border-gold/50 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="mt-6 w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gold/90 disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
