import { Resend } from "resend";

/**
 * Lazy-init singleton de Resend.
 *
 * NO se instancia al importar este módulo — solo cuando se llama `getResend()`.
 * Esto permite que el build de Next.js no falle aunque `RESEND_API_KEY` no esté
 * definida en el entorno, y solo fallará en runtime si se intenta enviar un
 * email sin la key configurada.
 */
let _resend: Resend | null = null;
export function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

/**
 * @deprecated Use `getResend()` instead. Kept for backwards compat with
 * any code that still imports `resend` directly. This will throw if
 * RESEND_API_KEY is missing at module-load time.
 */
export const resend = {
  get emails() {
    return getResend().emails;
  },
  get batch() {
    return getResend().batch;
  },
  get domains() {
    return getResend().domains;
  },
  get apiKeys() {
    return getResend().apiKeys;
  },
  get audiences() {
    return getResend().audiences;
  },
  get contacts() {
    return getResend().contacts;
  },
};

/**
 * Dirección remitente para todos los emails transaccionales.
 *
 * Usa la env var `EMAIL_FROM` si está definida (para flexibilidad por entorno).
 * Si no está definida, cae en `onboarding@resend.dev` que funciona sin
 * verificar dominio en el plan gratis de Resend.
 *
 * Para usar tu propio dominio (ej: noreply@studioiuris.cl):
 * 1. Verifica el dominio en https://resend.com/domains
 * 2. Setea EMAIL_FROM="Studio Iuris <noreply@studioiuris.cl>" en Vercel
 */
export const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "Studio Iuris <onboarding@resend.dev>";
