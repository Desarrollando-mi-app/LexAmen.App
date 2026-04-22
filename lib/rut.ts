/**
 * RUT chileno · utilidades de limpieza, formato y validación.
 * Módulo 11 estándar. Acepta entrada con/sin puntos y guión,
 * y dígito verificador en mayúsculas o minúsculas.
 */

/** Deja sólo dígitos y el DV (K). */
export function cleanRut(rut: string): string {
  return (rut || "").replace(/[^0-9kK]/g, "").toUpperCase();
}

/** Formatea 12345678K → 12.345.678-K */
export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${dotted}-${dv}`;
}

/** Calcula el DV esperado para un cuerpo numérico. */
function dvEsperado(body: string): string {
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (sum % 11);
  if (r === 11) return "0";
  if (r === 10) return "K";
  return String(r);
}

/** Valida un RUT chileno. Requiere cuerpo numérico de 7–8 dígitos + DV. */
export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (clean.length < 8 || clean.length > 9) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  if (!/^\d+$/.test(body)) return false;
  return dv === dvEsperado(body);
}

/** Normaliza para persistencia: "12345678-K" (sin puntos). */
export function normalizeRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return clean;
  return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
}
