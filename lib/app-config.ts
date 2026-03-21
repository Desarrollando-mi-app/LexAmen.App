// ─── App Config Helper ─────────────────────────────────────────
// Reads AppConfig values from DB with 5-minute in-memory cache.
// Falls back to defaults if DB is empty (first run).

import { prisma } from "@/lib/prisma";

let configCache: Map<string, string> | null = null;
let cacheExpiry = 0;

async function loadCache() {
  if (configCache && Date.now() < cacheExpiry) return;
  const configs = await prisma.appConfig.findMany({
    select: { clave: true, valor: true },
  });
  configCache = new Map(configs.map((c) => [c.clave, c.valor]));
  cacheExpiry = Date.now() + 5 * 60 * 1000;
}

export async function getConfig(clave: string): Promise<string | null> {
  await loadCache();
  return configCache?.get(clave) ?? null;
}

export async function getConfigNumber(
  clave: string,
  defaultVal: number = 0
): Promise<number> {
  const val = await getConfig(clave);
  return val ? parseInt(val, 10) : defaultVal;
}

export async function getConfigBool(
  clave: string,
  defaultVal: boolean = false
): Promise<boolean> {
  const val = await getConfig(clave);
  return val !== null ? val === "true" : defaultVal;
}

export function invalidateConfigCache() {
  configCache = null;
  cacheExpiry = 0;
}

// ─── Default Config Seed ─────────────────────────────────────

export const CONFIG_DEFAULTS = [
  // Límites plan gratuito
  { clave: "FREE_LIMIT_MCQ", valor: "10", tipo: "number", categoria: "limites", label: "MCQ por día (gratis)" },
  { clave: "FREE_LIMIT_FLASHCARDS", valor: "20", tipo: "number", categoria: "limites", label: "Flashcards por día (gratis)" },
  { clave: "FREE_LIMIT_VF", valor: "20", tipo: "number", categoria: "limites", label: "V/F por día (gratis)" },
  { clave: "FREE_LIMIT_DEFINICIONES", valor: "15", tipo: "number", categoria: "limites", label: "Definiciones por día (gratis)" },
  { clave: "FREE_LIMIT_FILL_BLANK", valor: "5", tipo: "number", categoria: "limites", label: "Completar Espacios por día (gratis)" },
  { clave: "FREE_LIMIT_ERROR_ID", valor: "5", tipo: "number", categoria: "limites", label: "Identificar Errores por día (gratis)" },
  { clave: "FREE_LIMIT_ORDER_SEQ", valor: "5", tipo: "number", categoria: "limites", label: "Ordenar Secuencias por día (gratis)" },
  { clave: "FREE_LIMIT_MATCH_COL", valor: "5", tipo: "number", categoria: "limites", label: "Relacionar Columnas por día (gratis)" },
  { clave: "FREE_LIMIT_CASO", valor: "3", tipo: "number", categoria: "limites", label: "Casos Prácticos por día (gratis)" },
  { clave: "FREE_LIMIT_TIMELINE", valor: "5", tipo: "number", categoria: "limites", label: "Líneas de Tiempo por día (gratis)" },
  { clave: "FREE_LIMIT_CAUSAS_SEMANA", valor: "3", tipo: "number", categoria: "limites", label: "Causas por semana (gratis)" },
  // XP
  { clave: "XP_FLASHCARD_CORRECT", valor: "2", tipo: "number", categoria: "xp", label: "XP por flashcard correcta" },
  { clave: "XP_MCQ_CORRECT_BASICO", valor: "3", tipo: "number", categoria: "xp", label: "XP por MCQ correcta (básico)" },
  { clave: "XP_SIMULACRO_COMPLETE", valor: "10", tipo: "number", categoria: "xp", label: "XP por simulacro completado" },
  { clave: "XP_OBITER", valor: "5", tipo: "number", categoria: "xp", label: "XP por publicar Obiter" },
  { clave: "XP_MINI_ANALISIS", valor: "10", tipo: "number", categoria: "xp", label: "XP por Mini-Análisis" },
  { clave: "XP_ANALISIS_COMPLETO", valor: "25", tipo: "number", categoria: "xp", label: "XP por Análisis Completo" },
  { clave: "XP_ENSAYO", valor: "30", tipo: "number", categoria: "xp", label: "XP por Ensayo" },
  // Expediente
  { clave: "VOTING_MIN_GRADO", valor: "1", tipo: "number", categoria: "expediente", label: "Grado mínimo para votar en Expediente", descripcion: "1 = todos votan. 4 = solo Grado 4+ (La Práctica)" },
  { clave: "XP_ARGUMENTO_EXPEDIENTE", valor: "8", tipo: "number", categoria: "expediente", label: "XP por argumento en Expediente" },
  { clave: "XP_MEJOR_ALEGATO_1", valor: "15", tipo: "number", categoria: "expediente", label: "XP Mejor Alegato (1er lugar)" },
  // Peer Review
  { clave: "REVIEW_MIN_GRADO", valor: "8", tipo: "number", categoria: "peer_review", label: "Grado mínimo para ser reviewer" },
  { clave: "REVIEW_MIN_PUBLICACIONES", valor: "2", tipo: "number", categoria: "peer_review", label: "Publicaciones mínimas para ser reviewer" },
  { clave: "REVIEW_PLAZO_DIAS", valor: "5", tipo: "number", categoria: "peer_review", label: "Plazo para completar review (días)" },
  // Feature toggles
  { clave: "FEATURE_DICTADO", valor: "true", tipo: "boolean", categoria: "features", label: "Dictado Jurídico habilitado" },
  { clave: "FEATURE_SIMULACRO", valor: "true", tipo: "boolean", categoria: "features", label: "Simulacro Oral habilitado" },
  { clave: "FEATURE_DEBATES", valor: "true", tipo: "boolean", categoria: "features", label: "Debates habilitados" },
  { clave: "FEATURE_PEER_REVIEW", valor: "true", tipo: "boolean", categoria: "features", label: "Peer Review habilitado" },
  { clave: "FEATURE_EXPEDIENTE", valor: "true", tipo: "boolean", categoria: "features", label: "Expediente Abierto habilitado" },
  { clave: "FEATURE_COLABORACION", valor: "true", tipo: "boolean", categoria: "features", label: "Co-autoría habilitada" },
  { clave: "MAINTENANCE_MODE", valor: "false", tipo: "boolean", categoria: "features", label: "Modo mantenimiento", descripcion: "Si true, solo admins pueden acceder" },
];
