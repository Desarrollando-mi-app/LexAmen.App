"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface Props {
  pasantiaId: string;
  pasantiaTitulo: string;
  cvAvailableEnPerfil: boolean;
}

/**
 * Form de postulación interna. Envía a `POST /api/sala/pasantias/[id]/postular`.
 *
 * Campos:
 *  - cvUrl: URL al CV (Drive/Dropbox/web). Opcional pero recomendado.
 *  - cartaUrl: URL a carta de motivación (opcional).
 *  - mensaje: texto libre — se muestra al publicador como primer contacto.
 *
 * Validación cliente: URLs (si se proveen) deben empezar con http(s)://
 * y mensaje no exceder 2000 caracteres. El backend re-valida.
 */
export function PostularForm({ pasantiaId, pasantiaTitulo, cvAvailableEnPerfil }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const [cvUrl, setCvUrl] = useState("");
  const [cartaUrl, setCartaUrl] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState<string | null>(null);

  const MAX_MENSAJE = 2000;
  const restantes = MAX_MENSAJE - mensaje.length;

  function validarUrl(raw: string, label: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) {
      return `${label}: debe empezar con http:// o https://`;
    }
    if (v.length > 500) {
      return `${label}: la URL es demasiado larga`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cvErr = validarUrl(cvUrl, "CV");
    if (cvErr) {
      setError(cvErr);
      return;
    }
    const cartaErr = validarUrl(cartaUrl, "Carta");
    if (cartaErr) {
      setError(cartaErr);
      return;
    }
    if (mensaje.length > MAX_MENSAJE) {
      setError(`El mensaje no puede superar ${MAX_MENSAJE} caracteres.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/sala/pasantias/${pasantiaId}/postular`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cvUrl: cvUrl.trim() || undefined,
            cartaUrl: cartaUrl.trim() || undefined,
            mensaje: mensaje.trim() || undefined,
          }),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "No pudimos enviar la postulación.");
        setSubmitting(false);
        return;
      }

      // Éxito: vamos a Gestión / postulaciones para mostrar el estado
      startTransition(() => {
        router.push(
          `/dashboard/sala/pasantias/gestion?tab=postulaciones&postulacionEnviada=1`,
        );
        router.refresh();
      });
    } catch {
      setError("Error de red. Intenta nuevamente.");
      setSubmitting(false);
    }
  }

  const disabled = submitting || isPending;

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gz-rule p-7 flex flex-col gap-6"
      aria-busy={disabled}
    >
      {/* CV */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="cvUrl"
          className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid"
        >
          Enlace a tu CV
        </label>
        <input
          id="cvUrl"
          type="url"
          inputMode="url"
          placeholder="https://drive.google.com/... o https://dropbox.com/..."
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          disabled={disabled}
          maxLength={500}
          className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/70 focus:outline-none focus:border-gz-gold focus:bg-white transition-colors"
        />
        <span className="font-archivo text-[12px] text-gz-ink-light italic leading-[1.5]">
          {cvAvailableEnPerfil ? (
            <>
              Tienes un CV cargado en tu perfil. Si dejas este campo en blanco
              compartiremos el de tu perfil con el publicador. Si quieres
              enviar otro, pega aquí su enlace público.
            </>
          ) : (
            <>
              Pega un enlace público (Drive, Dropbox, OneDrive, etc.). No subas
              archivos al sitio: Studio Iuris no aloja CVs por ahora.
            </>
          )}
        </span>
      </div>

      {/* Carta */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="cartaUrl"
          className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid"
        >
          Carta de motivación <span className="text-gz-ink-light normal-case tracking-normal">(opcional)</span>
        </label>
        <input
          id="cartaUrl"
          type="url"
          inputMode="url"
          placeholder="https://..."
          value={cartaUrl}
          onChange={(e) => setCartaUrl(e.target.value)}
          disabled={disabled}
          maxLength={500}
          className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-archivo text-[14px] text-gz-ink placeholder:text-gz-ink-light/70 focus:outline-none focus:border-gz-gold focus:bg-white transition-colors"
        />
        <span className="font-archivo text-[12px] text-gz-ink-light italic leading-[1.5]">
          Si prefieres, escribe tu motivación directamente abajo en el mensaje.
        </span>
      </div>

      {/* Mensaje */}
      <div className="flex flex-col gap-2">
        <label
          htmlFor="mensaje"
          className="font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase text-gz-ink-mid"
        >
          Mensaje al publicador
        </label>
        <textarea
          id="mensaje"
          rows={8}
          placeholder={`Cuéntales por qué te interesa "${pasantiaTitulo}", qué experiencia traes y qué esperas aprender. Sé directo y honesto: este es tu primer contacto.`}
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value.slice(0, MAX_MENSAJE))}
          disabled={disabled}
          maxLength={MAX_MENSAJE}
          className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-cormorant text-[16px] leading-[1.55] text-gz-ink placeholder:text-gz-ink-light/70 placeholder:italic placeholder:font-cormorant focus:outline-none focus:border-gz-gold focus:bg-white transition-colors resize-y min-h-[140px]"
        />
        <span
          className={`font-ibm-mono text-[10px] tracking-[1.2px] uppercase self-end ${
            restantes < 100 ? "text-gz-burgundy" : "text-gz-ink-light"
          }`}
        >
          {restantes} restantes
        </span>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="border-l-[3px] border-gz-burgundy bg-gz-burgundy/5 px-4 py-3 font-archivo text-[13.5px] text-gz-burgundy leading-[1.5]"
        >
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2.5 items-center pt-2 border-t border-gz-rule">
        <button
          type="submit"
          disabled={disabled}
          className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {disabled ? "Enviando…" : "Enviar postulación →"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={disabled}
          className="px-5 py-3 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
        >
          Cancelar
        </button>
        <span className="ml-auto font-archivo text-[11px] text-gz-ink-light italic">
          Una vez enviada, la postulación no puede editarse.
        </span>
      </div>
    </form>
  );
}
