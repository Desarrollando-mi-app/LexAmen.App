// ─── Constantes compartidas de La Sala (client-safe) ─────

export const AREAS_PRACTICA = [
  { value: "civil", label: "Derecho Civil" },
  { value: "procesal_civil", label: "Derecho Procesal Civil" },
  { value: "penal", label: "Derecho Penal" },
  { value: "procesal_penal", label: "Derecho Procesal Penal" },
  { value: "laboral", label: "Derecho Laboral" },
  { value: "tributario", label: "Derecho Tributario" },
  { value: "constitucional", label: "Derecho Constitucional" },
  { value: "administrativo", label: "Derecho Administrativo" },
  { value: "comercial", label: "Derecho Comercial" },
  { value: "familia", label: "Derecho de Familia" },
  { value: "ambiental", label: "Derecho Ambiental" },
  { value: "inmobiliario", label: "Derecho Inmobiliario" },
  { value: "propiedad_intelectual", label: "Propiedad Intelectual" },
  { value: "internacional", label: "Derecho Internacional" },
  { value: "otro", label: "Otra área" },
] as const;

export const CIUDADES_CHILE = [
  "Santiago", "Valparaíso", "Viña del Mar", "Concepción",
  "Temuco", "Antofagasta", "La Serena", "Rancagua",
  "Talca", "Arica", "Iquique", "Puerto Montt",
  "Valdivia", "Osorno", "Chillán", "Linares",
  "Remoto", "Otra",
] as const;

export const FORMATOS_TRABAJO = [
  { value: "presencial", label: "Presencial" },
  { value: "remoto", label: "Remoto" },
  { value: "hibrido", label: "Híbrido" },
] as const;

export const TIPOS_CONTRATO = [
  { value: "indefinido", label: "Contrato indefinido" },
  { value: "plazo_fijo", label: "Plazo fijo" },
  { value: "honorarios", label: "Honorarios" },
  { value: "part_time", label: "Part-time" },
  { value: "practica", label: "Práctica profesional" },
] as const;

export const MOTIVOS_REPORTE = [
  { value: "spam", label: "Spam o publicidad" },
  { value: "informacion_falsa", label: "Información falsa" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "oferta_sospechosa", label: "Oferta sospechosa" },
  { value: "otro", label: "Otro motivo" },
] as const;

export const REMUNERACION_OPTIONS = [
  { value: "pagada", label: "Remunerada" },
  { value: "no_pagada", label: "No remunerada" },
  { value: "a_convenir", label: "A convenir" },
] as const;

export const EXPERIENCIA_OPTIONS = [
  { value: "sin_experiencia", label: "Sin experiencia" },
  { value: "1_2_anios", label: "1-2 años" },
  { value: "3_5_anios", label: "3-5 años" },
  { value: "5_plus", label: "5+ años" },
] as const;

export function getAreaLabel(value: string): string {
  return AREAS_PRACTICA.find((a) => a.value === value)?.label ?? value;
}

export function getFormatoLabel(value: string): string {
  return FORMATOS_TRABAJO.find((f) => f.value === value)?.label ?? value;
}

export function getContratoLabel(value: string): string {
  return TIPOS_CONTRATO.find((t) => t.value === value)?.label ?? value;
}

export function getRemuneracionLabel(value: string): string {
  return REMUNERACION_OPTIONS.find((r) => r.value === value)?.label ?? value;
}
