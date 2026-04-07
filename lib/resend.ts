import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

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
