/**
 * Fase 3 — Dry-run de reclasificación de huérfanos
 * ──────────────────────────────────────────────────
 * Recorre los 11 modelos de ejercicio, identifica filas cuyo titulo/tituloMateria
 * NO está en el set válido de la rama (CURRICULUM), y para cada una aplica las
 * reglas R1–R8 documentadas en outputs/fase-0-reconocimiento.md.
 *
 * CRÍTICO: NO escribe en la base de datos.
 *
 * Produce:
 *   - outputs/fase-3-plan.md  (resumen humano por regla)
 *   - outputs/fase-3-plan.csv (plan fila-a-fila para auditoría)
 *
 * Uso: npx tsx scripts/fase3-dry-run.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  dotenv.config({ path: ".env", quiet: true });
}
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado en .env.local");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ═════════════════════════════════════════════════════════════════
// 1) Titulos válidos por rama (desde CURRICULUM)
// ═════════════════════════════════════════════════════════════════

const validByRama: Record<string, Set<string>> = {};
for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  validByRama[ramaKey] = new Set();
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) {
      validByRama[ramaKey].add(t.id);
    }
  }
}

// Global set of all valid titulo ids (for cross-rama detection — R6/R7)
const allValid: Map<string, string> = new Map(); // tituloId → ramaKey correcta
for (const [ramaKey, set] of Object.entries(validByRama)) {
  for (const id of set) {
    if (!allValid.has(id)) allValid.set(id, ramaKey);
  }
}

// ═════════════════════════════════════════════════════════════════
// 2) Catálogos de Regla 1 (integrador) y R5 (prefijo libro)
// ═════════════════════════════════════════════════════════════════

// Titulos que son "integradores" — dejan esIntegrador=true y se mantiene el titulo
// (se extraen del índice maestro en Fase 6)
const INTEGRATOR_TITULOS = new Set([
  "CPC_JUICIO_ORDINARIO",
  "CPC_JUICIOS_ESPECIALES",
  "CPC_ACTOS_NO_CONTENCIOSOS",
  "CPC_JUICIO_EJECUTIVO",
  "CPC_INTEGRADOR",
  "CPC_COMPLETO",
  "COT_INTEGRADOR",
  "COT_INTEGRADOR_FINAL",
  "JURISPRUDENCIA",
]);

// R5 — CPC_T* → prefijo CPC_LI_T* o CPC_LII_T*
// NOTA: Libro I CPC va T1..T20 (+T7B), Libro II CPC solo T1..T12. Los numerales
// >T12 son siempre de Libro I (el CPC antiguo estaba sin prefijo de libro).
const CPC_T_PREFIX_MAP: Record<string, string> = {
  // Libro I CPC — disposiciones comunes (T1..T20)
  CPC_T1: "CPC_LI_T1",   // reglas generales
  CPC_T2: "CPC_LI_T2",   // comparecencia en juicio
  CPC_T3: "CPC_LI_T3",   // pluralidad de acciones
  CPC_T4: "CPC_LI_T4",   // cargas pecuniarias
  CPC_T10: "CPC_LI_T10", // acumulación de autos
  CPC_T13: "CPC_LI_T13", // privilegio de pobreza
  CPC_T14: "CPC_LI_T14", // costas
  CPC_T15: "CPC_LI_T15", // desistimiento de la demanda
  CPC_T16: "CPC_LI_T16", // abandono del procedimiento
  CPC_T17: "CPC_LI_T17", // resoluciones judiciales
  CPC_T18: "CPC_LI_T18", // apelación
  // Libro II CPC — juicio ordinario (T1..T12)
  CPC_T5: "CPC_LII_T1",  // demanda
  CPC_T6: "CPC_LII_T2",  // conciliación
  CPC_T7: "CPC_LII_T3",  // jactancia (ojo: también puede ser T6 excepciones)
  CPC_T8: "CPC_LII_T4",  // medidas prejudiciales
  CPC_T9: "CPC_LII_T5",  // medidas precautorias
  CPC_T11: "CPC_LII_T11", // medios de prueba
  CPC_T12: "CPC_LII_T12", // procedimientos posteriores a la prueba
};

// COT descriptivo → titulo COT + rama Orgánico
// Para filas en rama Procesal que tienen nombre descriptivo en vez de numeral
const COT_DESCRIPTIVE_MAP: Record<string, string> = {
  COT_BASES: "COT_T1",
  COT_REGLAS_GENERALES: "COT_T1",
  COT_TRIBUNALES_ORDINARIOS: "COT_T3", // jueces de letras (fallback)
  COT_TRIBUNALES_ESPECIALES: "COT_T4", // presidentes y ministros como unipersonales
  COT_TRIBUNALES_ARBITRALES: "COT_T9", // árbitros
  COT_AUXILIARES_JUSTICIA: "COT_T11",
};

// Metadata-only titulos (no son contenido de examen, son artefactos del diario/debates)
const METADATA_TITULOS = new Set([
  "FORMATO_A", "FORMATO_B", "FORMATO_C", "FORMATO_D", "FORMATO_DEBATE",
  "REVISTA", "PUBLICACION", "CITACION", "INTEGRACION",
  "Del debate formal", "Del TC", "Del Expediente Abierto",
  "De la Revista", "De la valoracion", "De las reglas editoriales",
  "Del Analisis de Fallos", "De los derechos patrimoniales",
]);

// ═════════════════════════════════════════════════════════════════
// 3) Keywords R2/R3'/R4' (copiadas de reassign-by-keyword.ts, battle-tested)
// ═════════════════════════════════════════════════════════════════

interface Rule {
  target: string;
  rama: string;
  keywords: string[];
}

const RULES: Rule[] = [
  // COT
  { target: "COT_T2", rama: "DERECHO_ORGANICO", keywords: ["juzgado de garantía", "juzgados de garantía", "juicio oral en lo penal", "tribunal de juicio oral"] },
  { target: "COT_T4", rama: "DERECHO_ORGANICO", keywords: ["tribunal unipersonal", "ministro de corte como tribunal"] },
  { target: "COT_T5", rama: "DERECHO_ORGANICO", keywords: ["corte de apelaciones", "cortes de apelaciones"] },
  { target: "COT_T6", rama: "DERECHO_ORGANICO", keywords: ["corte suprema"] },
  { target: "COT_T6B", rama: "DERECHO_ORGANICO", keywords: ["audiencia remota", "audiencia semipresencial"] },
  { target: "COT_T8", rama: "DERECHO_ORGANICO", keywords: ["subrogación", "integración del tribunal"] },
  { target: "COT_T9", rama: "DERECHO_ORGANICO", keywords: ["jueces árbitros", "árbitro arbitrador", "árbitro de derecho", "árbitro mixto"] },
  { target: "COT_T10", rama: "DERECHO_ORGANICO", keywords: ["escalafón judicial", "escalafón primario"] },
  { target: "COT_T13", rama: "DERECHO_ORGANICO", keywords: ["oficial de secretaría", "oficiales u empleados de secretaría"] },
  { target: "COT_T14", rama: "DERECHO_ORGANICO", keywords: ["corporación administrativa del poder judicial"] },
  { target: "COT_T15", rama: "DERECHO_ORGANICO", keywords: ["art. 520 cot", "requisitos para ser abogado", "ejercicio de la profesión de abogado"] },
  { target: "COT_T16", rama: "DERECHO_ORGANICO", keywords: ["jurisdicción disciplinaria", "recurso de queja", "facultades disciplinarias"] },
  { target: "COT_T17", rama: "DERECHO_ORGANICO", keywords: ["asistencia judicial gratuita", "abogado de turno"] },
  // ── CIVIL · LIBRO I (personas) ──
  { target: "LI_T1", rama: "DERECHO_CIVIL", keywords: ["nombre civil", "cambio de nombre", "nacionalidad chilena", "domicilio civil", "domicilio legal"] },
  { target: "LI_T2", rama: "DERECHO_CIVIL", keywords: ["principio de la existencia", "fin de la existencia", "nacimiento de la persona", "muerte natural", "muerte presunta", "conmorientes", "art. 74", "art. 76", "art. 80", "art. 81"] },
  { target: "LI_T4", rama: "DERECHO_CIVIL", keywords: ["matrimonio", "ley 19.947", "impedimento matrimonial", "nulidad de matrimonio", "celebración del matrimonio"] },
  { target: "LI_T6", rama: "DERECHO_CIVIL", keywords: ["obligaciones entre cónyuges", "derechos entre cónyuges", "deber de fidelidad", "deber de socorro"] },
  { target: "LI_T7", rama: "DERECHO_CIVIL", keywords: ["filiación", "reconocimiento de hijo", "determinación de la filiación", "filiación matrimonial", "filiación no matrimonial"] },
  { target: "LI_T9", rama: "DERECHO_CIVIL", keywords: ["derechos y obligaciones entre padres e hijos"] },
  { target: "LI_T10", rama: "DERECHO_CIVIL", keywords: ["patria potestad"] },
  { target: "LI_T18", rama: "DERECHO_CIVIL", keywords: ["derecho de alimentos", "pensión de alimentos", "alimentos que se deben por ley"] },
  { target: "LI_T19", rama: "DERECHO_CIVIL", keywords: ["tutela", "curaduría", "tutor", "curador", "guardas"] },
  { target: "LI_T33", rama: "DERECHO_CIVIL", keywords: ["persona jurídica", "personas jurídicas", "corporación sin fines de lucro", "fundación civil", "art. 545"] },

  // ── CIVIL · LIBRO II (bienes) ──
  { target: "LII_T1", rama: "DERECHO_CIVIL", keywords: ["varias clases de bienes", "bienes muebles", "bienes inmuebles", "cosas corporales", "cosas incorporales"] },
  { target: "LII_T2", rama: "DERECHO_CIVIL", keywords: ["derecho real de dominio", "propiedad plena", "propiedad nuda", "art. 582"] },
  { target: "LII_T3", rama: "DERECHO_CIVIL", keywords: ["bienes nacionales", "bien nacional de uso público", "bien fiscal"] },
  { target: "LII_T4", rama: "DERECHO_CIVIL", keywords: ["ocupación", "art. 606", "animales bravíos", "tesoro", "captura bélica"] },
  { target: "LII_T5", rama: "DERECHO_CIVIL", keywords: ["accesión", "art. 643", "aluvión", "avulsión", "accesión de inmueble"] },
  { target: "LII_T6", rama: "DERECHO_CIVIL", keywords: ["tradición como modo", "tradición de bienes", "inscripción conservatoria", "art. 670", "art. 684"] },
  { target: "LII_T7", rama: "DERECHO_CIVIL", keywords: ["posesión", "poseedor regular", "poseedor irregular", "animus", "corpus", "mera tenencia", "art. 700"] },
  { target: "LII_T8", rama: "DERECHO_CIVIL", keywords: ["propiedad fiduciaria", "fideicomiso"] },
  { target: "LII_T9", rama: "DERECHO_CIVIL", keywords: ["usufructo", "usufructuario", "nudo propietario"] },
  { target: "LII_T11", rama: "DERECHO_CIVIL", keywords: ["servidumbre", "servidumbre activa", "servidumbre pasiva", "predio sirviente", "predio dominante"] },
  { target: "LII_T12", rama: "DERECHO_CIVIL", keywords: ["reivindicación", "acción reivindicatoria", "art. 889"] },
  { target: "LII_T13", rama: "DERECHO_CIVIL", keywords: ["acción posesoria", "querella de amparo", "querella de restitución", "querella de restablecimiento"] },

  // ── CIVIL · LIBRO III (sucesiones) ──
  { target: "LIII_T1", rama: "DERECHO_CIVIL", keywords: ["sucesión por causa de muerte", "heredero", "asignatario"] },
  { target: "LIII_T2", rama: "DERECHO_CIVIL", keywords: ["sucesión intestada", "orden de sucesión", "órdenes hereditarios", "art. 988"] },
  { target: "LIII_T3", rama: "DERECHO_CIVIL", keywords: ["ordenación del testamento", "testamento abierto", "testamento cerrado", "testador"] },
  { target: "LIII_T4", rama: "DERECHO_CIVIL", keywords: ["asignación testamentaria", "legado", "legatario"] },
  { target: "LIII_T5", rama: "DERECHO_CIVIL", keywords: ["asignación forzosa", "legítima", "porción conyugal", "cuarta de mejoras"] },
  { target: "LIII_T7", rama: "DERECHO_CIVIL", keywords: ["apertura de la sucesión", "aceptación de la herencia", "repudiación de la herencia", "beneficio de inventario"] },
  { target: "LIII_T10", rama: "DERECHO_CIVIL", keywords: ["partición de bienes hereditarios", "laudo partición"] },
  { target: "LIII_T12", rama: "DERECHO_CIVIL", keywords: ["beneficio de separación"] },
  { target: "LIII_T13", rama: "DERECHO_CIVIL", keywords: ["donación entre vivos", "donación irrevocable"] },

  // ── CIVIL · LIBRO IV (obligaciones y contratos) ──
  { target: "LIV_T2", rama: "DERECHO_CIVIL", keywords: ["acto jurídico", "actos jurídicos", "declaración de voluntad", "vicios del consentimiento", "error esencial", "error sustancial", "dolo principal", "fuerza moral", "lesión enorme", "capacidad de ejercicio", "objeto lícito", "causa lícita", "simulación", "art. 1445", "art. 1451", "art. 1456"] },
  { target: "LIV_T3", rama: "DERECHO_CIVIL", keywords: ["obligación natural", "obligación civil", "obligaciones naturales", "obligaciones meramente naturales", "art. 1470"] },
  { target: "LIV_T4", rama: "DERECHO_CIVIL", keywords: ["obligación condicional", "obligación modal", "condición suspensiva", "condición resolutoria"] },
  { target: "LIV_T5", rama: "DERECHO_CIVIL", keywords: ["obligación a plazo", "plazo tácito", "plazo expreso"] },
  { target: "LIV_T9", rama: "DERECHO_CIVIL", keywords: ["obligación solidaria", "solidaridad pasiva", "solidaridad activa"] },
  { target: "LIV_T10", rama: "DERECHO_CIVIL", keywords: ["obligación divisible", "obligación indivisible", "indivisibilidad"] },
  { target: "LIV_T11", rama: "DERECHO_CIVIL", keywords: ["cláusula penal", "pena convencional"] },
  { target: "LIV_T12", rama: "DERECHO_CIVIL", keywords: ["efecto de las obligaciones", "indemnización de perjuicios", "cumplimiento forzado", "constituido en mora", "mora del deudor", "mora del acreedor", "daño emergente", "lucro cesante", "fuerza mayor", "caso fortuito", "art. 1545", "art. 1556", "art. 1557"] },
  { target: "LIV_T13", rama: "DERECHO_CIVIL", keywords: ["interpretación de los contratos", "interpretación contractual"] },
  { target: "LIV_T14", rama: "DERECHO_CIVIL", keywords: ["solución o pago efectivo", "dación en pago", "pago por subrogación", "pago con beneficio de competencia", "pago por consignación"] },
  { target: "LIV_T15", rama: "DERECHO_CIVIL", keywords: ["novación", "novar la obligación"] },
  { target: "LIV_T16", rama: "DERECHO_CIVIL", keywords: ["remisión de la deuda"] },
  { target: "LIV_T17", rama: "DERECHO_CIVIL", keywords: ["compensación legal", "compensación convencional", "compensación de deudas"] },
  { target: "LIV_T18", rama: "DERECHO_CIVIL", keywords: ["confusión de obligaciones"] },
  { target: "LIV_T19", rama: "DERECHO_CIVIL", keywords: ["pérdida de la cosa que se debe", "imposibilidad sobrevenida"] },
  { target: "LIV_T20", rama: "DERECHO_CIVIL", keywords: ["nulidad absoluta", "nulidad relativa", "rescisión", "acción de nulidad", "art. 1681", "art. 1682", "art. 1684"] },
  { target: "LIV_T21", rama: "DERECHO_CIVIL", keywords: ["prueba de las obligaciones", "prueba testimonial", "presunciones", "instrumento público", "instrumento privado"] },
  { target: "LIV_T22", rama: "DERECHO_CIVIL", keywords: ["sociedad conyugal", "convención matrimonial", "capitulaciones matrimoniales"] },
  { target: "LIV_T22A", rama: "DERECHO_CIVIL", keywords: ["participación en los gananciales", "régimen de participación"] },
  { target: "LIV_T23", rama: "DERECHO_CIVIL", keywords: ["compraventa", "contrato de compraventa", "obligaciones del vendedor", "obligaciones del comprador", "precio cierto", "saneamiento de la evicción", "vicios redhibitorios"] },
  { target: "LIV_T25", rama: "DERECHO_CIVIL", keywords: ["cesión de derechos", "cesión de crédito"] },
  { target: "LIV_T26", rama: "DERECHO_CIVIL", keywords: ["contrato de arrendamiento", "arrendatario civil", "arrendador civil", "arrendamiento de cosas"] },
  { target: "LIV_T28", rama: "DERECHO_CIVIL", keywords: ["contrato de sociedad", "socios de sociedad civil", "aporte social"] },
  { target: "LIV_T29", rama: "DERECHO_CIVIL", keywords: ["mandato civil", "mandatario", "mandante", "contrato de mandato"] },
  { target: "LIV_T30", rama: "DERECHO_CIVIL", keywords: ["comodato", "préstamo de uso"] },
  { target: "LIV_T31", rama: "DERECHO_CIVIL", keywords: ["mutuo", "préstamo de consumo"] },
  { target: "LIV_T32", rama: "DERECHO_CIVIL", keywords: ["depósito civil", "secuestro convencional"] },
  { target: "LIV_T33", rama: "DERECHO_CIVIL", keywords: ["contrato aleatorio", "contrato de juego", "contrato de apuesta", "renta vitalicia", "censo vitalicio"] },
  { target: "LIV_T34", rama: "DERECHO_CIVIL", keywords: ["cuasicontrato", "agencia oficiosa", "pago de lo no debido", "comunidad cuasicontractual"] },
  { target: "LIV_T35", rama: "DERECHO_CIVIL", keywords: ["delitos y cuasidelitos", "responsabilidad extracontractual", "responsabilidad civil extracontractual", "art. 2314", "art. 2329", "hecho ilícito", "daño moral", "daño material"] },
  { target: "LIV_T36", rama: "DERECHO_CIVIL", keywords: ["contrato de fianza", "fiador", "fianza solidaria"] },
  { target: "LIV_T37", rama: "DERECHO_CIVIL", keywords: ["contrato de prenda", "prenda sin desplazamiento"] },
  { target: "LIV_T38", rama: "DERECHO_CIVIL", keywords: ["contrato de hipoteca", "hipoteca convencional", "acción hipotecaria"] },
  { target: "LIV_T40", rama: "DERECHO_CIVIL", keywords: ["contrato de transacción", "transacción civil"] },
  { target: "LIV_T41", rama: "DERECHO_CIVIL", keywords: ["prelación de créditos", "créditos preferentes", "créditos valistas"] },
  { target: "LIV_T42", rama: "DERECHO_CIVIL", keywords: ["prescripción adquisitiva", "prescripción extintiva", "art. 2492", "art. 2514", "suspensión de la prescripción", "interrupción de la prescripción"] },
  // CPC LIBRO I
  { target: "CPC_LI_T7", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["actuaciones judiciales", "días y horas hábiles"] },
  { target: "CPC_LI_T7B", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["notificación electrónica", "tramitación electrónica", "ley 20.886"] },
  { target: "CPC_LI_T8", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["rebeldía", "art. 78 cpc"] },
  { target: "CPC_LI_T11", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["cuestiones de competencia", "declinatoria", "inhibitoria"] },
  { target: "CPC_LI_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["implicancia", "recusación"] },
  { target: "CPC_LI_T13", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["privilegio de pobreza"] },
  { target: "CPC_LI_T14", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["costas procesales", "costas personales", "tasación de costas"] },
  { target: "CPC_LI_T18", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["recurso de apelación", "tribunal ad quem", "efecto devolutivo", "efecto suspensivo", "adhesión a la apelación", "art. 186 cpc", "art. 189 cpc"] },
  { target: "CPC_LI_T19", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["cumplimiento incidental", "ejecución de las resoluciones judiciales"] },
  { target: "CPC_LI_T20", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["exhorto"] },
  // CPC LIBRO II
  { target: "CPC_LII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["jactancia"] },
  { target: "CPC_LII_T4", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas prejudiciales", "medida prejudicial probatoria", "medida prejudicial preparatoria"] },
  { target: "CPC_LII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas precautorias", "medida precautoria"] },
  { target: "CPC_LII_T10", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["término probatorio", "término especial de prueba"] },
  { target: "CPC_LII_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación para oír sentencia", "medidas para mejor resolver"] },
  // CPC LIBRO III
  { target: "CPC_LIII_T2", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["obligación de hacer", "obligación de no hacer"] },
  { target: "CPC_LIII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["derecho legal de retención"] },
  { target: "CPC_LIII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación de evicción"] },
  { target: "CPC_LIII_T7", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio especial de arrendamiento", "ley 18.101"] },
  { target: "CPC_LIII_T8", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio arbitral", "procedimiento arbitral"] },
  { target: "CPC_LIII_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juez partidor", "juicio de partición", "laudo y ordenata"] },
  { target: "CPC_LIII_T14", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["menor cuantía", "mínima cuantía"] },
  { target: "CPC_LIII_T16", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio de hacienda"] },
  // CPC LIBRO IV
  { target: "CPC_LIV_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["posesión efectiva"] },
  { target: "CPC_LIV_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["declaración de derecho real"] },
];

// R3'/R4' — Mensaje de Bello
const MENSAJE_KEYWORDS = [
  "mensaje del código civil",
  "mensaje de bello",
  "andrés bello",
  "codificación",
  "siete partidas",
  "partidas de alfonso",
  "código napoleón",
];

// Sources ambiguos (Civil) que disparan R3'/R3'': los libros genéricos romanos
const R3_SOURCES = new Set(["LIV", "LII", "LIII"]);

// Sources ambiguos (Civil) que disparan R4'/R4''
const R4_SOURCES = new Set(["TP"]);

// TP_1..TP_6 fallback para R4''. Usamos el primer titulo válido de Civil·TP como catch-all.
function tpFallback(): string | null {
  // Si CURRICULUM ya tiene TP_1, retornarlo; si no, null y la fila queda R8.
  if (validByRama.DERECHO_CIVIL?.has("TP_1")) return "TP_1";
  return null;
}

// Libro-to-Rules map para R2/R3''
const LIBRO_MAP: Record<string, { rama: string; libroHint: string }> = {
  LIBRO_I: { rama: "DERECHO_CIVIL", libroHint: "LI" },
  LIBRO_II: { rama: "DERECHO_CIVIL", libroHint: "LII" },
  LIBRO_III: { rama: "DERECHO_CIVIL", libroHint: "LIII" },
  LIBRO_IV: { rama: "DERECHO_CIVIL", libroHint: "LIV" },
  LIBRO_I_CPC: { rama: "DERECHO_PROCESAL_CIVIL", libroHint: "CPC_LI" },
  LIBRO_II_CPC: { rama: "DERECHO_PROCESAL_CIVIL", libroHint: "CPC_LII" },
  LIBRO_III_CPC: { rama: "DERECHO_PROCESAL_CIVIL", libroHint: "CPC_LIII" },
  LIBRO_IV_CPC: { rama: "DERECHO_PROCESAL_CIVIL", libroHint: "CPC_LIV" },
  LIBRO_COT: { rama: "DERECHO_ORGANICO", libroHint: "COT" },
  LI: { rama: "DERECHO_CIVIL", libroHint: "LI" },
  LII: { rama: "DERECHO_CIVIL", libroHint: "LII" },
  LIII: { rama: "DERECHO_CIVIL", libroHint: "LIII" },
  LIV: { rama: "DERECHO_CIVIL", libroHint: "LIV" },
};

// ═════════════════════════════════════════════════════════════════
// 4) Classifier
// ═════════════════════════════════════════════════════════════════

function classifyByKeyword(rama: string, text: string, libroHint?: string): string | null {
  const t = text.toLowerCase();
  const matched: Set<string> = new Set();
  for (const r of RULES) {
    if (r.rama !== rama) continue;
    if (libroHint && !r.target.startsWith(libroHint)) continue;
    for (const k of r.keywords) {
      if (t.includes(k.toLowerCase())) {
        matched.add(r.target);
        break;
      }
    }
  }
  if (matched.size === 1) return [...matched][0];
  return null; // 0 matches o ambiguo
}

function containsMensajeKeyword(text: string): boolean {
  const t = text.toLowerCase();
  return MENSAJE_KEYWORDS.some((k) => t.includes(k));
}

type RuleCode = "R1" | "R2" | "R3'" | "R3''" | "R4'" | "R4''" | "R5" | "R6" | "R7" | "R8" | "RM" | "ALREADY_VALID" | "AMBIGUOUS";

interface Plan {
  rule: RuleCode;
  newRama: string;
  newTitulo: string;
  esIntegrador: boolean;
  note?: string;
}

/**
 * Aplica R1..R8 a una fila huérfana.
 * Retorna null si la fila ya es válida (no debería llegar aquí) o si R8 la deja igual.
 */
function classify(
  rama: string,
  titulo: string,
  text: string
): Plan {
  // R1 — Integrador
  if (INTEGRATOR_TITULOS.has(titulo)) {
    return { rule: "R1", newRama: rama, newTitulo: titulo, esIntegrador: true, note: "Integrador" };
  }

  // RM — Metadata / artefactos editoriales (FORMATO_*, REVISTA, CITACION…)
  //       No son contenido de examen. Se marcan para triage manual (eliminar o mover a catálogo aparte).
  if (METADATA_TITULOS.has(titulo)) {
    return { rule: "RM", newRama: rama, newTitulo: titulo, esIntegrador: false, note: "metadata no-ejercicio — revisar" };
  }

  // COT descriptivo en rama Procesal → mapeo a COT_T* + rama Orgánico
  if (COT_DESCRIPTIVE_MAP[titulo] && rama === "DERECHO_PROCESAL_CIVIL") {
    const target = COT_DESCRIPTIVE_MAP[titulo];
    if (validByRama.DERECHO_ORGANICO.has(target)) {
      return { rule: "R6", newRama: "DERECHO_ORGANICO", newTitulo: target, esIntegrador: false, note: `COT descriptivo → ${target}` };
    }
  }
  // COT descriptivo ya en rama Orgánico → mapeo sólo de titulo
  if (COT_DESCRIPTIVE_MAP[titulo] && rama === "DERECHO_ORGANICO") {
    const target = COT_DESCRIPTIVE_MAP[titulo];
    if (validByRama.DERECHO_ORGANICO.has(target)) {
      return { rule: "R2", newRama: rama, newTitulo: target, esIntegrador: false, note: `COT descriptivo → ${target}` };
    }
  }

  // R6 — COT_T* en rama Procesal → Orgánico
  if (titulo.startsWith("COT_T") && rama === "DERECHO_PROCESAL_CIVIL") {
    if (validByRama.DERECHO_ORGANICO.has(titulo)) {
      return { rule: "R6", newRama: "DERECHO_ORGANICO", newTitulo: titulo, esIntegrador: false, note: "rama-fix Orgánico" };
    }
  }

  // R7 — CPC_LI_T12 en rama Orgánico → Procesal
  if (titulo === "CPC_LI_T12" && rama === "DERECHO_ORGANICO") {
    return { rule: "R7", newRama: "DERECHO_PROCESAL_CIVIL", newTitulo: titulo, esIntegrador: false, note: "rama-fix Procesal" };
  }

  // Titulo ya válido en otra rama → R6 genérico (cross-rama fix)
  const canonicalRama = allValid.get(titulo);
  if (canonicalRama && canonicalRama !== rama) {
    return { rule: "R6", newRama: canonicalRama, newTitulo: titulo, esIntegrador: false, note: `rama-fix ${canonicalRama}` };
  }

  // R3' / R3'' — LIV/LII/LIII en Civil
  if (R3_SOURCES.has(titulo) && rama === "DERECHO_CIVIL") {
    if (containsMensajeKeyword(text)) {
      return { rule: "R3'", newRama: rama, newTitulo: "MENSAJE_BELLO", esIntegrador: false, note: "Mensaje" };
    }
    // R3'' — mapear a libro correspondiente vía R2
    const hint = LIBRO_MAP[titulo]?.libroHint;
    const tgt = classifyByKeyword(rama, text, hint);
    if (tgt && validByRama[rama]?.has(tgt)) {
      return { rule: "R3''", newRama: rama, newTitulo: tgt, esIntegrador: false, note: `por keyword (${hint})` };
    }
    return { rule: "R8", newRama: rama, newTitulo: titulo, esIntegrador: false, note: "R3'' sin match — revisar" };
  }

  // R4' / R4'' — TP en Civil
  if (R4_SOURCES.has(titulo) && rama === "DERECHO_CIVIL") {
    if (containsMensajeKeyword(text)) {
      return { rule: "R4'", newRama: rama, newTitulo: "MENSAJE_BELLO", esIntegrador: false, note: "Mensaje" };
    }
    const fb = tpFallback();
    if (fb) {
      return { rule: "R4''", newRama: rama, newTitulo: fb, esIntegrador: false, note: "TP fallback" };
    }
    return { rule: "R8", newRama: rama, newTitulo: titulo, esIntegrador: false, note: "R4'' sin target — revisar" };
  }

  // R5 — CPC_T* (sin prefijo L*) → agregar prefijo
  if (CPC_T_PREFIX_MAP[titulo] && rama === "DERECHO_PROCESAL_CIVIL") {
    const target = CPC_T_PREFIX_MAP[titulo];
    if (validByRama[rama]?.has(target)) {
      return { rule: "R5", newRama: rama, newTitulo: target, esIntegrador: false, note: `prefijo (${titulo}→${target})` };
    }
  }

  // R2 — LIBRO_* genérico → keyword classify dentro del libro
  if (LIBRO_MAP[titulo]) {
    const { rama: targetRama, libroHint } = LIBRO_MAP[titulo];
    if (rama === targetRama || rama !== targetRama) {
      // Permitir corrección de rama simultánea
      const tgt = classifyByKeyword(targetRama, text, libroHint);
      if (tgt && validByRama[targetRama]?.has(tgt)) {
        return { rule: "R2", newRama: targetRama, newTitulo: tgt, esIntegrador: false, note: `libro→título (${libroHint})` };
      }
    }
  }

  // R2 sin hint de libro — último intento por keyword global en la rama
  const tgtAny = classifyByKeyword(rama, text);
  if (tgtAny && validByRama[rama]?.has(tgtAny)) {
    return { rule: "R2", newRama: rama, newTitulo: tgtAny, esIntegrador: false, note: "keyword libre" };
  }

  // R8 — Fallback: dejar igual, marcar para revisión humana
  return { rule: "R8", newRama: rama, newTitulo: titulo, esIntegrador: false, note: "sin match — revisar manualmente" };
}

// ═════════════════════════════════════════════════════════════════
// 5) Carga de huérfanos por modelo
// ═════════════════════════════════════════════════════════════════

interface OrphanRow {
  model: string;
  id: string;
  rama: string;
  libro: string | null;
  titulo: string;
  text: string;
}

function isOrphan(rama: string, titulo: string | null): boolean {
  if (!titulo) return true;
  const set = validByRama[rama];
  if (!set) return true;
  return !set.has(titulo);
}

async function loadOrphans(): Promise<OrphanRow[]> {
  const orphans: OrphanRow[] = [];

  console.log("Cargando Flashcards...");
  const fcs = await prisma.flashcard.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, front: true, back: true },
  });
  for (const f of fcs) {
    if (isOrphan(String(f.rama), f.titulo)) {
      orphans.push({ model: "flashcard", id: f.id, rama: String(f.rama), libro: f.libro ? String(f.libro) : null, titulo: f.titulo ?? "", text: `${f.front} ${f.back}` });
    }
  }

  console.log("Cargando MCQ...");
  const mcqs = await prisma.mCQ.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, question: true, explanation: true },
  });
  for (const m of mcqs) {
    if (isOrphan(String(m.rama), m.titulo)) {
      orphans.push({ model: "mcq", id: m.id, rama: String(m.rama), libro: m.libro ? String(m.libro) : null, titulo: m.titulo ?? "", text: `${m.question} ${m.explanation ?? ""}` });
    }
  }

  console.log("Cargando TrueFalse...");
  const vfs = await prisma.trueFalse.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, statement: true, explanation: true },
  });
  for (const v of vfs) {
    if (isOrphan(String(v.rama), v.titulo)) {
      orphans.push({ model: "trueFalse", id: v.id, rama: String(v.rama), libro: v.libro ? String(v.libro) : null, titulo: v.titulo ?? "", text: `${v.statement} ${v.explanation ?? ""}` });
    }
  }

  console.log("Cargando Definicion...");
  const defs = await prisma.definicion.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, concepto: true, definicion: true },
  });
  for (const d of defs) {
    if (isOrphan(String(d.rama), d.titulo)) {
      orphans.push({ model: "definicion", id: d.id, rama: String(d.rama), libro: d.libro, titulo: d.titulo ?? "", text: `${d.concepto} ${d.definicion}` });
    }
  }

  console.log("Cargando FillBlank...");
  const fbs = await prisma.fillBlank.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, textoConBlancos: true, explicacion: true },
  });
  for (const f of fbs) {
    if (isOrphan(String(f.rama), f.titulo)) {
      orphans.push({ model: "fillBlank", id: f.id, rama: String(f.rama), libro: f.libro, titulo: f.titulo ?? "", text: `${f.textoConBlancos} ${f.explicacion ?? ""}` });
    }
  }

  console.log("Cargando ErrorIdentification...");
  const eis = await prisma.errorIdentification.findMany({
    select: { id: true, rama: true, libro: true, titulo: true, textoConErrores: true, explicacionGeneral: true },
  });
  for (const e of eis) {
    if (isOrphan(String(e.rama), e.titulo)) {
      orphans.push({ model: "errorIdentification", id: e.id, rama: String(e.rama), libro: e.libro, titulo: e.titulo ?? "", text: `${e.textoConErrores} ${e.explicacionGeneral ?? ""}` });
    }
  }

  console.log("Cargando OrderSequence...");
  const oss = await prisma.orderSequence.findMany({
    select: { id: true, rama: true, libro: true, tituloMateria: true, titulo: true, instruccion: true, explicacion: true },
  });
  for (const r of oss) {
    if (isOrphan(String(r.rama), r.tituloMateria)) {
      orphans.push({ model: "orderSequence", id: r.id, rama: String(r.rama), libro: r.libro, titulo: r.tituloMateria ?? "", text: `${r.titulo} ${r.instruccion ?? ""} ${r.explicacion ?? ""}` });
    }
  }

  console.log("Cargando MatchColumns...");
  const mcs = await prisma.matchColumns.findMany({
    select: { id: true, rama: true, libro: true, tituloMateria: true, titulo: true, explicacion: true },
  });
  for (const r of mcs) {
    if (isOrphan(String(r.rama), r.tituloMateria)) {
      orphans.push({ model: "matchColumns", id: r.id, rama: String(r.rama), libro: r.libro, titulo: r.tituloMateria ?? "", text: `${r.titulo} ${r.explicacion ?? ""}` });
    }
  }

  console.log("Cargando CasoPractico...");
  const cps = await prisma.casoPractico.findMany({
    select: { id: true, rama: true, libro: true, tituloMateria: true, titulo: true, hechos: true },
  });
  for (const r of cps) {
    if (isOrphan(String(r.rama), r.tituloMateria)) {
      orphans.push({ model: "casoPractico", id: r.id, rama: String(r.rama), libro: r.libro, titulo: r.tituloMateria ?? "", text: `${r.titulo} ${r.hechos}` });
    }
  }

  console.log("Cargando DictadoJuridico...");
  const djs = await prisma.dictadoJuridico.findMany({
    select: { id: true, rama: true, libro: true, tituloMateria: true, titulo: true, textoCompleto: true },
  });
  for (const r of djs) {
    if (isOrphan(String(r.rama), r.tituloMateria)) {
      orphans.push({ model: "dictadoJuridico", id: r.id, rama: String(r.rama), libro: r.libro, titulo: r.tituloMateria ?? "", text: `${r.titulo} ${r.textoCompleto}` });
    }
  }

  console.log("Cargando Timeline...");
  const tls = await prisma.timeline.findMany({
    select: { id: true, rama: true, libro: true, tituloMateria: true, titulo: true, explicacion: true },
  });
  for (const r of tls) {
    if (isOrphan(String(r.rama), r.tituloMateria)) {
      orphans.push({ model: "timeline", id: r.id, rama: String(r.rama), libro: r.libro, titulo: r.tituloMateria ?? "", text: `${r.titulo} ${r.explicacion ?? ""}` });
    }
  }

  return orphans;
}

// ═════════════════════════════════════════════════════════════════
// 6) Ejecución + escritura de plan
// ═════════════════════════════════════════════════════════════════

interface PlanRow extends OrphanRow {
  plan: Plan;
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes("\"") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const orphans = await loadOrphans();
  console.log(`\nTotal huérfanos: ${orphans.length}`);

  const planRows: PlanRow[] = orphans.map((o) => ({ ...o, plan: classify(o.rama, o.titulo, o.text) }));

  // ── Stats por regla ──
  const byRule: Record<string, number> = {};
  const byRuleModel: Record<string, Record<string, number>> = {};
  const byOriginTitulo: Record<string, { total: number; rules: Record<string, number> }> = {};
  const r8Keys: Record<string, number> = {};

  for (const pr of planRows) {
    byRule[pr.plan.rule] = (byRule[pr.plan.rule] ?? 0) + 1;
    byRuleModel[pr.plan.rule] = byRuleModel[pr.plan.rule] ?? {};
    byRuleModel[pr.plan.rule][pr.model] = (byRuleModel[pr.plan.rule][pr.model] ?? 0) + 1;
    const ot = pr.titulo || "(null)";
    if (!byOriginTitulo[ot]) byOriginTitulo[ot] = { total: 0, rules: {} };
    byOriginTitulo[ot].total++;
    byOriginTitulo[ot].rules[pr.plan.rule] = (byOriginTitulo[ot].rules[pr.plan.rule] ?? 0) + 1;
    if (pr.plan.rule === "R8") {
      r8Keys[`${pr.rama}·${pr.titulo || "(null)"}`] = (r8Keys[`${pr.rama}·${pr.titulo || "(null)"}`] ?? 0) + 1;
    }
  }

  // ── Escribir CSV ──
  const csvPath = path.join(process.cwd(), "outputs", "fase-3-plan.csv");
  const csvLines: string[] = [
    "model,id,rule,old_rama,old_libro,old_titulo,new_rama,new_titulo,esIntegrador,note",
  ];
  for (const pr of planRows) {
    csvLines.push([
      pr.model,
      pr.id,
      pr.plan.rule,
      pr.rama,
      pr.libro ?? "",
      pr.titulo,
      pr.plan.newRama,
      pr.plan.newTitulo,
      pr.plan.esIntegrador ? "true" : "false",
      pr.plan.note ?? "",
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"));
  console.log(`CSV → ${csvPath}`);

  // ── Escribir MD ──
  const mdPath = path.join(process.cwd(), "outputs", "fase-3-plan.md");
  const lines: string[] = [];
  lines.push("# Fase 3 — Plan de reclasificación (DRY-RUN)");
  lines.push("");
  lines.push(`_Generado ${new Date().toISOString()}. Sin escrituras en DB._`);
  lines.push("");
  lines.push(`**Total huérfanos detectados: ${orphans.length}**`);
  lines.push("");
  lines.push("## Distribución por regla");
  lines.push("");
  lines.push("| Regla | Count | % | Acción |");
  lines.push("|-------|-------|---|--------|");
  const ruleDesc: Record<string, string> = {
    R1: "Marcar `esIntegrador=true`, mantener titulo",
    R2: "Reasignar a titulo específico por keyword",
    "R3'": "Reasignar a `MENSAJE_BELLO` (contenido del Mensaje)",
    "R3''": "Reasignar a titulo específico del libro (LII/LIII/LIV)",
    "R4'": "Reasignar a `MENSAJE_BELLO` (TP · Mensaje)",
    "R4''": "Fallback a `TP_1..TP_6`",
    R5: "Agregar prefijo `CPC_LI_`/`CPC_LII_`",
    R6: "Corrección de rama (COT_T* → Orgánico, o cualquier titulo válido en otra rama)",
    R7: "`CPC_LI_T12` Orgánico → Procesal",
    R8: "Sin match — requiere revisión manual",
    RM: "Metadata (FORMATO_*, REVISTA, CITACION…) — revisar/eliminar",
    ALREADY_VALID: "(no debería aparecer)",
    AMBIGUOUS: "Múltiples matches — excluido",
  };
  const total = orphans.length || 1;
  const rules = Object.keys(byRule).sort((a, b) => byRule[b] - byRule[a]);
  for (const r of rules) {
    const pct = ((byRule[r] / total) * 100).toFixed(1);
    lines.push(`| **${r}** | ${byRule[r]} | ${pct}% | ${ruleDesc[r] ?? ""} |`);
  }
  lines.push("");

  lines.push("## Por regla · por modelo");
  lines.push("");
  lines.push("| Regla | FC | MCQ | V/F | Def | Fill | Err | Ord | Match | Caso | Dict | TL | Total |");
  lines.push("|-------|----|-----|-----|-----|------|-----|-----|-------|------|------|----|----|");
  const modelOrder = ["flashcard", "mcq", "trueFalse", "definicion", "fillBlank", "errorIdentification", "orderSequence", "matchColumns", "casoPractico", "dictadoJuridico", "timeline"];
  for (const r of rules) {
    const row = byRuleModel[r] ?? {};
    const cells = modelOrder.map((m) => row[m] ?? 0);
    lines.push(`| **${r}** | ${cells.join(" | ")} | **${byRule[r]}** |`);
  }
  lines.push("");

  lines.push("## Titulos de origen (top 30)");
  lines.push("");
  lines.push("| Origen (titulo) | Total | Distribución por regla |");
  lines.push("|-----------------|-------|------------------------|");
  const origins = Object.entries(byOriginTitulo).sort((a, b) => b[1].total - a[1].total).slice(0, 30);
  for (const [ot, info] of origins) {
    const dist = Object.entries(info.rules).map(([r, n]) => `${r}: ${n}`).join(", ");
    lines.push(`| \`${ot}\` | ${info.total} | ${dist} |`);
  }
  lines.push("");

  if (Object.keys(r8Keys).length > 0) {
    lines.push("## R8 — Filas que quedan sin cambio (requieren revisión manual)");
    lines.push("");
    lines.push("| (rama · titulo) | Count |");
    lines.push("|------------------|-------|");
    const r8Sorted = Object.entries(r8Keys).sort((a, b) => b[1] - a[1]);
    for (const [k, n] of r8Sorted) {
      lines.push(`| \`${k}\` | ${n} |`);
    }
    lines.push("");
  }

  lines.push("## Muestra — primeras 20 asignaciones por regla");
  lines.push("");
  for (const r of rules) {
    if (r === "R8") continue;
    lines.push(`### ${r}`);
    lines.push("");
    const sample = planRows.filter((pr) => pr.plan.rule === r).slice(0, 20);
    if (sample.length === 0) {
      lines.push("_(sin filas)_");
      lines.push("");
      continue;
    }
    lines.push("| Modelo | id | rama | old_titulo | → new_titulo | integrador | nota |");
    lines.push("|--------|----|------|-----------|--------------|------------|------|");
    for (const pr of sample) {
      lines.push(`| ${pr.model} | \`${pr.id.slice(0, 8)}\` | ${pr.rama.replace("DERECHO_", "")} | \`${pr.titulo || "(null)"}\` | \`${pr.plan.newTitulo}\`${pr.plan.newRama !== pr.rama ? ` (→ ${pr.plan.newRama.replace("DERECHO_", "")})` : ""} | ${pr.plan.esIntegrador ? "✓" : ""} | ${pr.plan.note ?? ""} |`);
    }
    lines.push("");
  }

  lines.push("## Siguiente paso");
  lines.push("");
  lines.push("- Revisa el CSV (`outputs/fase-3-plan.csv`) y el resumen arriba.");
  lines.push("- Si las reglas lucen bien, apruebas y corro `scripts/fase3-apply.ts` — aplica los UPDATEs en batches con rollback por modelo.");
  lines.push("- Las filas R8 quedan intocadas (riesgo cero) y se abordan en Fase 5 (rebalanceo).");
  lines.push("");

  fs.writeFileSync(mdPath, lines.join("\n"));
  console.log(`MD  → ${mdPath}`);

  // ── Resumen en consola ──
  console.log("\n═══ SUMMARY ═══");
  for (const r of rules) {
    console.log(`  ${r.padEnd(5)}: ${byRule[r]}`);
  }
  console.log(`  ─────────────`);
  console.log(`  Total: ${orphans.length}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Fatal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
