// ═══ CONFIGURACIÓN EXPEDIENTE ABIERTO ═══
// Cambiar estos valores sin necesidad de deploy (solo re-build)

// VOTACIÓN
// FASE 1 (lanzamiento): todos votan → VOTING_MIN_GRADO = 1
// FASE 2 (futuro): solo Grado 4+ → VOTING_MIN_GRADO = 4
export const VOTING_MIN_GRADO = 1;

// TEMPORALIDAD
export const CIERRE_DIA = 0; // 0 = domingo
export const CIERRE_HORA = 23;
export const CIERRE_MINUTO = 59;

// LÍMITES
export const MAX_ARGUMENTOS_POR_BANDO = 1;
export const MAX_CONTRA_ARGUMENTOS = 10;
export const MIN_CHARS_ARGUMENTO = 100;
export const MAX_CHARS_ARGUMENTO = 5000;
export const MAX_CHARS_POSICION = 200;
export const MAX_CHARS_FUNDAMENTO = 500;
export const MAX_CHARS_COMENTARIO = 500;

// XP
export const XP_ARGUMENTO = 8;
export const XP_CONTRA_ARGUMENTO = 5;
export const XP_MEJOR_ALEGATO_1 = 15;
export const XP_MEJOR_ALEGATO_2 = 10;
export const XP_MEJOR_ALEGATO_3 = 5;
export const XP_VOTO_RECIBIDO = 1;
export const XP_PROPUESTA_APROBADA = 10;
