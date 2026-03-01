// ─── Constantes de La Sala (client-safe, sin imports de prisma) ──

export const MATERIAS_SALA = [
  "Derecho Civil",
  "Derecho Procesal Civil",
  "Derecho Penal",
  "Derecho Procesal Penal",
  "Derecho Constitucional",
  "Derecho Administrativo",
  "Derecho Comercial",
  "Derecho del Trabajo",
  "Derecho Internacional",
  "Derecho de Familia",
  "Derecho Tributario",
  "Derecho Romano",
  "Teoría del Derecho",
  "Otra",
] as const;

export const UNIVERSIDADES_CHILE = [
  "Universidad de Chile",
  "Pontificia Universidad Católica de Chile",
  "Universidad Diego Portales",
  "Universidad Adolfo Ibáñez",
  "Universidad de los Andes",
  "Universidad Autónoma de Chile",
  "Universidad Central de Chile",
  "Universidad de Concepción",
  "Universidad Católica de Valparaíso",
  "Universidad de Valparaíso",
  "Universidad San Sebastián",
  "Universidad Mayor",
  "Universidad Finis Terrae",
  "Universidad del Desarrollo",
  "Universidad UNAB",
  "Universidad UDLA",
  "Otra",
] as const;

export const REPORT_REASONS = [
  "Información falsa o engañosa",
  "Contacto no funciona",
  "Contenido inapropiado",
  "Otro",
] as const;

export type AyudantiaTypeValue = "OFREZCO" | "BUSCO";
export type AyudantiaFormatValue = "ONLINE" | "PRESENCIAL" | "AMBOS";
export type PriceTypeValue = "GRATUITO" | "PAGADO";
export type ContactMethodValue = "WHATSAPP" | "EMAIL" | "OTRO";
