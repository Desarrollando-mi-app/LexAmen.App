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
      <div className="relative rounded-[4px] border-2 border-dashed border-gz-gold/50 bg-gz-navy/[0.03] p-8 sm:col-span-2 lg:col-span-1">
        {/* Badge */}
        <span className="absolute -top-3 left-6 rounded-sm bg-gz-gold/90 px-3 py-1 font-ibm-mono text-[10px] font-bold uppercase tracking-[0.5px] text-white animate-pulse">
          PRÓXIMAMENTE
        </span>

        <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">Plan Institucional</h3>
        <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
          Para facultades y estudios jurídicos
        </p>

        <div className="my-5 h-px bg-gz-rule" />

        <ul className="space-y-3 font-archivo text-[13px] text-gz-ink-mid">
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Perfil institucional verificado
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Publicaciones con sello en El Diario
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Acceso premium para todos los miembros
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Panel de métricas institucional
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Soporte prioritario
          </li>
          <li className="flex items-center gap-2">
            <span className="text-gz-gold">✦</span> Insignia institucional en el ranking
          </li>
        </ul>

        <p className="mt-5 font-archivo text-[13px] text-gz-ink-light">
          Tarifa única · Por definir
        </p>

        <button
          onClick={() => setShowModal(true)}
          className="mt-4 w-full rounded-[3px] bg-gz-navy px-6 py-3 text-center font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Registrar interés
        </button>

        <p className="mt-2 text-center font-archivo text-[11px] text-gz-ink-light">
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
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[4px] border border-gz-rule shadow-sm"
        style={{ backgroundColor: "var(--gz-cream)" }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-[3px] p-1.5 text-gz-ink-light hover:bg-gz-cream-dark/50 hover:text-gz-ink transition-colors"
          aria-label="Cerrar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="M6 6 18 18" />
          </svg>
        </button>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8">
          <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink">
            Registrar interés institucional
          </h2>
          <p className="mt-1 font-archivo text-[13px] text-gz-ink-mid">
            Serás de los primeros en saber cuando el Plan Institucional esté disponible.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Nombre de la institución *
              </label>
              <input
                type="text"
                value={nombreInstitucion}
                onChange={(e) => setNombreInstitucion(e.target.value)}
                placeholder="Ej. Facultad de Derecho, Universidad de Chile"
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
                required
              />
            </div>

            <div>
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Tipo de institución *
              </label>
              <select
                value={tipoInstitucion}
                onChange={(e) => setTipoInstitucion(e.target.value)}
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
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
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Nombre del contacto *
              </label>
              <input
                type="text"
                value={nombreContacto}
                onChange={(e) => setNombreContacto(e.target.value)}
                placeholder="Tu nombre completo"
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
                required
              />
            </div>

            <div>
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Email de contacto *
              </label>
              <input
                type="email"
                value={emailContacto}
                onChange={(e) => setEmailContacto(e.target.value)}
                placeholder="contacto@universidad.cl"
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
                required
              />
            </div>

            <div>
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Teléfono <span className="normal-case tracking-normal font-archivo text-gz-ink-light/50">(opcional)</span>
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+56 9 1234 5678"
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
              />
            </div>

            <div>
              <label className="font-ibm-mono text-[10px] font-medium uppercase tracking-[1px] text-gz-ink-light">
                Mensaje <span className="normal-case tracking-normal font-archivo text-gz-ink-light/50">(opcional)</span>
              </label>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value.slice(0, 500))}
                rows={3}
                placeholder="¿Algo que quieras contarnos?"
                className="mt-1 w-full rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[13px] text-gz-ink resize-none placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
                style={{ backgroundColor: "var(--gz-cream)" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="mt-6 w-full rounded-[3px] bg-gz-navy px-4 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
          >
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
