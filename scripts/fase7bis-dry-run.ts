/**
 * Fase 7-bis — Dry-run: duplicación cross-rama con re-clasificación heurística
 * ──────────────────────────────────────────────────────────────────────────────
 * Convierte el actual modelo de Fase 7 (ramasAdicionales: Rama[] en un solo row)
 * al modelo del plan original (duplicación de filas con sourceExerciseId).
 *
 * Para cada row origen con `ramasAdicionales.length > 0`:
 *   - Para cada target_rama en ramasAdicionales:
 *     - Re-clasifica heurísticamente (R8 + P5) título/libro/párrafo en la rama destino
 *     - Emite una fila prospectiva en el CSV
 *
 * Salidas:
 *   - outputs/fase-7bis-plan.csv   (1 row por (source_id × target_rama))
 *   - outputs/fase-7bis-plan.md    (resumen ejecutivo)
 *
 * CRÍTICO: NO escribe en la DB. Solo lee + produce CSV.
 *
 * Uso: npx tsx scripts/fase7bis-dry-run.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ═══════════════════════════════════════════════════════════════
// 1) Índices desde CURRICULUM
// ═══════════════════════════════════════════════════════════════

/** tituloId → { rama, libro } (primera ocurrencia; algunos títulos pueden compartirse) */
const tituloMeta = new Map<string, { rama: string; libro: string }>();
/** rama → Set<tituloId> válidos */
const validByRama: Record<string, Set<string>> = {};

for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  validByRama[ramaKey] = new Set();
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) {
      validByRama[ramaKey].add(t.id);
      if (!tituloMeta.has(t.id)) tituloMeta.set(t.id, { rama: ramaKey, libro: sec.libro });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 2) Classifier R8 — keywords → titulo en rama destino
//    Copia de RULES de fase3-dry-run.ts (battle-tested)
// ═══════════════════════════════════════════════════════════════

interface Rule { target: string; rama: string; keywords: string[] }

const RULES: Rule[] = [
  // COT
  { target: "COT_T2", rama: "DERECHO_ORGANICO", keywords: ["juzgado de garantía", "juzgados de garantía", "juicio oral en lo penal", "tribunal de juicio oral"] },
  { target: "COT_T4", rama: "DERECHO_ORGANICO", keywords: ["tribunal unipersonal", "ministro de corte como tribunal"] },
  { target: "COT_T5", rama: "DERECHO_ORGANICO", keywords: ["corte de apelaciones", "cortes de apelaciones"] },
  { target: "COT_T6", rama: "DERECHO_ORGANICO", keywords: ["corte suprema"] },
  { target: "COT_T6B", rama: "DERECHO_ORGANICO", keywords: ["audiencia remota", "audiencia semipresencial"] },
  { target: "COT_T7", rama: "DERECHO_ORGANICO", keywords: ["reglas generales de competencia", "distribución de causas", "prórroga de competencia", "fuero personal", "contienda de competencia"] },
  { target: "COT_T8", rama: "DERECHO_ORGANICO", keywords: ["subrogación", "integración del tribunal"] },
  { target: "COT_T9", rama: "DERECHO_ORGANICO", keywords: ["jueces árbitros", "árbitro arbitrador", "árbitro de derecho", "árbitro mixto"] },
  { target: "COT_T10", rama: "DERECHO_ORGANICO", keywords: ["escalafón judicial", "escalafón primario"] },
  { target: "COT_T11", rama: "DERECHO_ORGANICO", keywords: ["fiscal judicial", "defensor público", "relator", "secretario del tribunal", "receptor judicial", "procurador del número", "notario", "auxiliar de la administración de justicia"] },
  { target: "COT_T13", rama: "DERECHO_ORGANICO", keywords: ["oficial de secretaría", "oficiales u empleados de secretaría"] },
  { target: "COT_T14", rama: "DERECHO_ORGANICO", keywords: ["corporación administrativa del poder judicial"] },
  { target: "COT_T15", rama: "DERECHO_ORGANICO", keywords: ["art. 520 cot", "requisitos para ser abogado", "ejercicio de la profesión de abogado"] },
  { target: "COT_T16", rama: "DERECHO_ORGANICO", keywords: ["jurisdicción disciplinaria", "recurso de queja", "facultades disciplinarias"] },
  { target: "COT_T17", rama: "DERECHO_ORGANICO", keywords: ["asistencia judicial gratuita", "abogado de turno"] },
  // CIVIL · LIBRO I
  { target: "LI_T1", rama: "DERECHO_CIVIL", keywords: ["nombre civil", "cambio de nombre", "nacionalidad chilena", "domicilio civil", "domicilio legal"] },
  { target: "LI_T2", rama: "DERECHO_CIVIL", keywords: ["principio de la existencia", "fin de la existencia", "muerte presunta", "conmorientes", "art. 74", "art. 76", "art. 80", "art. 81"] },
  { target: "LI_T4", rama: "DERECHO_CIVIL", keywords: ["matrimonio", "ley 19.947", "impedimento matrimonial", "nulidad de matrimonio"] },
  { target: "LI_T6", rama: "DERECHO_CIVIL", keywords: ["obligaciones entre cónyuges", "deber de fidelidad", "deber de socorro", "bien familiar"] },
  { target: "LI_T7", rama: "DERECHO_CIVIL", keywords: ["filiación", "reconocimiento de hijo", "determinación de la filiación", "filiación matrimonial", "filiación no matrimonial"] },
  { target: "LI_T9", rama: "DERECHO_CIVIL", keywords: ["derechos y obligaciones entre padres e hijos"] },
  { target: "LI_T10", rama: "DERECHO_CIVIL", keywords: ["patria potestad"] },
  { target: "LI_T18", rama: "DERECHO_CIVIL", keywords: ["derecho de alimentos", "pensión de alimentos", "alimentos que se deben por ley"] },
  { target: "LI_T19", rama: "DERECHO_CIVIL", keywords: ["tutela", "curaduría", "tutor", "curador", "guardas"] },
  { target: "LI_T33", rama: "DERECHO_CIVIL", keywords: ["persona jurídica", "personas jurídicas", "corporación sin fines de lucro", "fundación civil", "art. 545"] },
  // CIVIL · LIBRO II
  { target: "LII_T1", rama: "DERECHO_CIVIL", keywords: ["varias clases de bienes", "bienes muebles", "bienes inmuebles", "cosas corporales", "cosas incorporales"] },
  { target: "LII_T2", rama: "DERECHO_CIVIL", keywords: ["derecho real de dominio", "propiedad plena", "propiedad nuda", "art. 582"] },
  { target: "LII_T3", rama: "DERECHO_CIVIL", keywords: ["bienes nacionales", "bien nacional de uso público", "bien fiscal"] },
  { target: "LII_T4", rama: "DERECHO_CIVIL", keywords: ["ocupación", "art. 606", "animales bravíos", "tesoro", "captura bélica"] },
  { target: "LII_T5", rama: "DERECHO_CIVIL", keywords: ["accesión", "art. 643", "aluvión", "avulsión"] },
  { target: "LII_T6", rama: "DERECHO_CIVIL", keywords: ["tradición como modo", "inscripción conservatoria", "art. 670", "art. 684"] },
  { target: "LII_T7", rama: "DERECHO_CIVIL", keywords: ["posesión", "poseedor regular", "poseedor irregular", "animus", "corpus", "mera tenencia", "art. 700"] },
  { target: "LII_T8", rama: "DERECHO_CIVIL", keywords: ["propiedad fiduciaria", "fideicomiso"] },
  { target: "LII_T9", rama: "DERECHO_CIVIL", keywords: ["usufructo", "usufructuario", "nudo propietario"] },
  { target: "LII_T11", rama: "DERECHO_CIVIL", keywords: ["servidumbre", "predio sirviente", "predio dominante"] },
  { target: "LII_T12", rama: "DERECHO_CIVIL", keywords: ["reivindicación", "acción reivindicatoria", "art. 889"] },
  { target: "LII_T13", rama: "DERECHO_CIVIL", keywords: ["acción posesoria", "querella de amparo", "querella de restitución", "querella de restablecimiento"] },
  // CIVIL · LIBRO III
  { target: "LIII_T1", rama: "DERECHO_CIVIL", keywords: ["sucesión por causa de muerte", "heredero", "asignatario"] },
  { target: "LIII_T2", rama: "DERECHO_CIVIL", keywords: ["sucesión intestada", "orden de sucesión", "órdenes hereditarios", "art. 988"] },
  { target: "LIII_T3", rama: "DERECHO_CIVIL", keywords: ["ordenación del testamento", "testamento abierto", "testamento cerrado", "testador"] },
  { target: "LIII_T4", rama: "DERECHO_CIVIL", keywords: ["asignación testamentaria", "legado", "legatario"] },
  { target: "LIII_T5", rama: "DERECHO_CIVIL", keywords: ["asignación forzosa", "legítima", "porción conyugal", "cuarta de mejoras"] },
  { target: "LIII_T7", rama: "DERECHO_CIVIL", keywords: ["apertura de la sucesión", "aceptación de la herencia", "repudiación de la herencia", "beneficio de inventario"] },
  { target: "LIII_T10", rama: "DERECHO_CIVIL", keywords: ["partición de bienes hereditarios", "juicio de partición", "laudo partición"] },
  { target: "LIII_T12", rama: "DERECHO_CIVIL", keywords: ["beneficio de separación"] },
  { target: "LIII_T13", rama: "DERECHO_CIVIL", keywords: ["donación entre vivos", "donación irrevocable"] },
  // CIVIL · LIBRO IV
  { target: "LIV_T2", rama: "DERECHO_CIVIL", keywords: ["acto jurídico", "vicios del consentimiento", "error esencial", "dolo principal", "fuerza moral", "capacidad de ejercicio", "objeto lícito", "causa lícita", "art. 1445", "art. 1451"] },
  { target: "LIV_T3", rama: "DERECHO_CIVIL", keywords: ["obligación natural", "obligaciones naturales", "art. 1470"] },
  { target: "LIV_T4", rama: "DERECHO_CIVIL", keywords: ["obligación condicional", "obligación modal", "condición suspensiva", "condición resolutoria"] },
  { target: "LIV_T5", rama: "DERECHO_CIVIL", keywords: ["obligación a plazo", "plazo tácito", "plazo expreso"] },
  { target: "LIV_T9", rama: "DERECHO_CIVIL", keywords: ["obligación solidaria", "solidaridad pasiva", "solidaridad activa"] },
  { target: "LIV_T10", rama: "DERECHO_CIVIL", keywords: ["obligación divisible", "obligación indivisible", "indivisibilidad"] },
  { target: "LIV_T11", rama: "DERECHO_CIVIL", keywords: ["cláusula penal", "pena convencional"] },
  { target: "LIV_T12", rama: "DERECHO_CIVIL", keywords: ["efecto de las obligaciones", "indemnización de perjuicios", "cumplimiento forzado", "mora del deudor", "daño emergente", "lucro cesante", "art. 1545", "art. 1556"] },
  { target: "LIV_T13", rama: "DERECHO_CIVIL", keywords: ["interpretación de los contratos", "interpretación contractual"] },
  { target: "LIV_T14", rama: "DERECHO_CIVIL", keywords: ["solución o pago efectivo", "dación en pago", "pago por subrogación", "pago por consignación"] },
  { target: "LIV_T15", rama: "DERECHO_CIVIL", keywords: ["novación"] },
  { target: "LIV_T16", rama: "DERECHO_CIVIL", keywords: ["remisión de la deuda"] },
  { target: "LIV_T17", rama: "DERECHO_CIVIL", keywords: ["compensación legal", "compensación convencional"] },
  { target: "LIV_T18", rama: "DERECHO_CIVIL", keywords: ["confusión de obligaciones"] },
  { target: "LIV_T19", rama: "DERECHO_CIVIL", keywords: ["pérdida de la cosa que se debe", "imposibilidad sobrevenida"] },
  { target: "LIV_T20", rama: "DERECHO_CIVIL", keywords: ["nulidad absoluta", "nulidad relativa", "acción de nulidad", "art. 1681", "art. 1682"] },
  { target: "LIV_T21", rama: "DERECHO_CIVIL", keywords: ["prueba de las obligaciones", "prueba testimonial", "presunciones", "instrumento público", "instrumento privado"] },
  { target: "LIV_T22", rama: "DERECHO_CIVIL", keywords: ["sociedad conyugal", "capitulaciones matrimoniales", "haber de la sociedad conyugal"] },
  { target: "LIV_T22A", rama: "DERECHO_CIVIL", keywords: ["participación en los gananciales", "régimen de participación"] },
  { target: "LIV_T23", rama: "DERECHO_CIVIL", keywords: ["compraventa", "contrato de compraventa", "saneamiento de la evicción", "vicios redhibitorios"] },
  { target: "LIV_T25", rama: "DERECHO_CIVIL", keywords: ["cesión de derechos", "cesión de crédito"] },
  { target: "LIV_T26", rama: "DERECHO_CIVIL", keywords: ["contrato de arrendamiento", "arrendatario civil", "arrendador civil"] },
  { target: "LIV_T28", rama: "DERECHO_CIVIL", keywords: ["contrato de sociedad", "socios de sociedad civil"] },
  { target: "LIV_T29", rama: "DERECHO_CIVIL", keywords: ["mandato civil", "mandatario", "mandante"] },
  { target: "LIV_T30", rama: "DERECHO_CIVIL", keywords: ["comodato", "préstamo de uso"] },
  { target: "LIV_T31", rama: "DERECHO_CIVIL", keywords: ["mutuo", "préstamo de consumo"] },
  { target: "LIV_T32", rama: "DERECHO_CIVIL", keywords: ["depósito civil", "secuestro convencional"] },
  { target: "LIV_T34", rama: "DERECHO_CIVIL", keywords: ["cuasicontrato", "agencia oficiosa", "pago de lo no debido", "comunidad cuasicontractual"] },
  { target: "LIV_T35", rama: "DERECHO_CIVIL", keywords: ["delitos y cuasidelitos", "responsabilidad extracontractual", "art. 2314", "art. 2329", "daño moral"] },
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
  { target: "CPC_LI_T18", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["recurso de apelación", "tribunal ad quem", "efecto devolutivo", "efecto suspensivo", "adhesión a la apelación"] },
  { target: "CPC_LI_T19", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["cumplimiento incidental", "ejecución de las resoluciones judiciales"] },
  { target: "CPC_LI_T20", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["exhorto"] },
  // CPC LIBRO II
  { target: "CPC_LII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["jactancia"] },
  { target: "CPC_LII_T4", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas prejudiciales", "medida prejudicial probatoria", "medida prejudicial preparatoria"] },
  { target: "CPC_LII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas precautorias", "medida precautoria"] },
  { target: "CPC_LII_T10", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["término probatorio", "término especial de prueba"] },
  { target: "CPC_LII_T11", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medios de prueba", "prueba instrumental", "prueba testimonial", "confesión en juicio", "informe de peritos", "presunciones judiciales", "sana crítica"] },
  { target: "CPC_LII_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación para oír sentencia", "medidas para mejor resolver"] },
  // CPC LIBRO III
  { target: "CPC_LIII_T1", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["procedimiento ejecutivo", "mandamiento de ejecución", "excepciones del ejecutado", "juicio ejecutivo", "tercería"] },
  { target: "CPC_LIII_T2", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["obligación de hacer", "obligación de no hacer"] },
  { target: "CPC_LIII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["derecho legal de retención"] },
  { target: "CPC_LIII_T4", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["querella posesoria", "denuncia de obra nueva", "denuncia de obra ruinosa", "interdicto"] },
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

/** Clasificador R8: rama+text → titulo | null. Retorna { titulo, hits } con scoring. */
function classifyTituloInRama(rama: string, text: string): { titulo: string; hits: number; matched: string[] } | null {
  const t = text.toLowerCase();
  const scores = new Map<string, { hits: number; matched: string[] }>();
  for (const r of RULES) {
    if (r.rama !== rama) continue;
    let h = 0;
    const m: string[] = [];
    for (const k of r.keywords) {
      if (t.includes(k.toLowerCase())) {
        h++;
        m.push(k);
      }
    }
    if (h > 0) scores.set(r.target, { hits: h, matched: m });
  }
  if (scores.size === 0) return null;
  const sorted = [...scores.entries()].sort((a, b) => b[1].hits - a[1].hits);
  // Confianza: top único o top ≥2x el segundo
  if (sorted.length === 1) return { titulo: sorted[0][0], hits: sorted[0][1].hits, matched: sorted[0][1].matched };
  if (sorted[0][1].hits >= 2 * sorted[1][1].hits) return { titulo: sorted[0][0], hits: sorted[0][1].hits, matched: sorted[0][1].matched };
  // Ambiguo: primero pero baja confianza
  return { titulo: sorted[0][0], hits: sorted[0][1].hits, matched: sorted[0][1].matched };
}

// ═══════════════════════════════════════════════════════════════
// 3) Classifier P5 — titulo+text → parrafo | null (usa fase4 logic)
// ═══════════════════════════════════════════════════════════════

interface ParrafoInfo { id: string; label: string; articulos?: { from: number; to: number }; keywords: string[]; overrides: string[] }

const STOPWORDS = new Set(["de","la","las","el","los","del","y","e","o","u","en","a","por","para","con","sin","al","un","una","reglas","generales","general","definiciones","disposiciones","este","esta","estos","estas","su","sus","que","se","lo","le","ni"]);

function parseArticulos(ref?: string): { from: number; to: number } | undefined {
  if (!ref) return undefined;
  const m = ref.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (m) return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };
  const s = ref.match(/(\d+)/);
  if (s) return { from: parseInt(s[1], 10), to: parseInt(s[1], 10) };
  return undefined;
}
function extractKeywords(label: string): string[] {
  const cleaned = label.replace(/^[§\d\.\s]+/, "").toLowerCase();
  const toks = cleaned.match(/[a-záéíóúñ]+/g) ?? [];
  return toks.filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}
function extractArticles(text: string): number[] {
  const t = text.toLowerCase();
  const out: number[] = [];
  const re = /art(?:\.|ículo|ículos|s\.)?\s*(\d+)(?:\s*(?:a|al|y|,|-)\s*(\d+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    out.push(parseInt(m[1], 10));
    if (m[2]) out.push(parseInt(m[2], 10));
  }
  return out.filter((n) => !Number.isNaN(n));
}

// Overrides mínimos para títulos top (copiados de fase4)
const PARRAFO_OVERRIDES: Record<string, string[]> = {
  "COT_T7_P2": ["cuantía"],
  "COT_T7_P3": ["fuero personal"],
  "COT_T7_P4": ["competencia en materia civil", "competencia territorial civil"],
  "COT_T7_P5": ["competencia en materia criminal"],
  "COT_T7_P7": ["distribución de causas", "turno de causas"],
  "COT_T7_P8": ["prórroga de competencia", "prórroga de la competencia"],
  "COT_T7_P10": ["contienda de competencia", "cuestión de competencia"],
  "COT_T7_P11": ["implicancia", "recusación", "abogado integrante"],
  "COT_T2_P1": ["juzgado de garantía", "juzgados de garantía"],
  "COT_T2_P2": ["tribunal de juicio oral", "tjop", "juicio oral en lo penal"],
  "COT_T11_P1": ["fiscal judicial", "fiscalía judicial"],
  "COT_T11_P2": ["defensor público", "defensoría pública"],
  "COT_T11_P3": ["relator", "relatores"],
  "COT_T11_P4": ["secretario del tribunal", "secretario judicial"],
  "COT_T11_P6": ["receptor judicial", "receptores judiciales"],
  "COT_T11_P7": ["procurador del número"],
  "COT_T11_P8": ["notario", "función notarial"],
  "LII_T7_P1": ["poseedor regular", "poseedor irregular", "posesión regular", "posesión irregular"],
  "LII_T7_P2": ["adquirir la posesión", "perder la posesión"],
  "LIV_T12_P1": ["cumplimiento forzado", "ejecución forzada de la obligación"],
  "LIV_T12_P2": ["indemnización de perjuicios", "daño emergente", "lucro cesante"],
  "CPC_LIII_T1_P1": ["procedimiento ejecutivo", "mandamiento de ejecución", "excepciones del ejecutado"],
  "CPC_LIII_T1_P3": ["tercería", "tercerías"],
  "CPC_LII_T11_P2": ["prueba instrumental", "instrumento público", "instrumento privado"],
  "CPC_LII_T11_P3": ["prueba testimonial", "tacha de testigos"],
  "CPC_LII_T11_P4": ["confesión en juicio", "absolución de posiciones"],
  "CPC_LII_T11_P6": ["informe de peritos", "prueba pericial", "peritaje"],
  "CPC_LII_T11_P7": ["presunciones judiciales"],
};

const tituloParrafos = new Map<string, ParrafoInfo[]>();
for (const [_r, rama] of Object.entries(CURRICULUM)) {
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) {
      if (!t.parrafos || t.parrafos.length === 0) continue;
      tituloParrafos.set(
        t.id,
        t.parrafos.map((p) => ({
          id: p.id,
          label: p.label,
          articulos: parseArticulos(p.articulosRef),
          keywords: extractKeywords(p.label),
          overrides: (PARRAFO_OVERRIDES[p.id] ?? []).map((s) => s.toLowerCase()),
        })),
      );
    }
  }
}

type ParrafoRule = "P1" | "P2" | "P3" | "P4" | "P6" | "P5";
function classifyParrafo(titulo: string, text: string): { parrafo: string | null; rule: ParrafoRule; note: string } {
  const parrafos = tituloParrafos.get(titulo);
  if (!parrafos || parrafos.length === 0) return { parrafo: null, rule: "P1", note: "titulo sin parrafos" };
  if (parrafos.length === 1) return { parrafo: parrafos[0].id, rule: "P2", note: "único párrafo" };

  const tLower = text.toLowerCase();
  const arts = extractArticles(text);

  // P3 — artículo
  if (arts.length > 0) {
    const hits = parrafos.filter((p) => p.articulos && arts.some((a) => a >= p.articulos!.from && a <= p.articulos!.to));
    if (hits.length === 1) return { parrafo: hits[0].id, rule: "P3", note: `art. ${arts[0]}` };
  }

  // P3' override
  const ovMap = new Map<string, number>();
  for (const p of parrafos) {
    let hits = 0;
    for (const ph of p.overrides) if (tLower.includes(ph)) hits++;
    if (hits > 0) ovMap.set(p.id, hits);
  }
  if (ovMap.size === 1) return { parrafo: [...ovMap.keys()][0], rule: "P3", note: "override único" };
  if (ovMap.size > 1) {
    const s = [...ovMap.entries()].sort((a, b) => b[1] - a[1]);
    if (s[0][1] > s[1][1]) return { parrafo: s[0][0], rule: "P3", note: "override dominante" };
  }

  // P4 — keyword match
  const km = new Map<string, number>();
  for (const p of parrafos) {
    let hits = 0;
    for (const k of p.keywords) if (tLower.includes(k)) hits++;
    if (hits > 0) km.set(p.id, hits);
  }
  if (km.size === 1) return { parrafo: [...km.keys()][0], rule: "P4", note: "keyword único" };
  if (km.size > 1) {
    const s = [...km.entries()].sort((a, b) => b[1] - a[1]);
    if (s[0][1] >= 2 * s[1][1] && s[0][1] >= 2) return { parrafo: s[0][0], rule: "P4", note: `dominante ${s[0][1]} vs ${s[1][1]}` };
  }

  // P6 — fallback a "reglas generales" si primer párrafo lo es
  if (km.size === 0 && ovMap.size === 0) {
    const first = parrafos[0];
    const lbl = first.label.toLowerCase();
    if (lbl.includes("reglas generales") || lbl.includes("disposiciones generales") || lbl.includes("definiciones y reglas") || lbl.includes("procedimiento ejecutivo")) {
      return { parrafo: first.id, rule: "P6", note: "fallback reglas generales" };
    }
  }

  return { parrafo: null, rule: "P5", note: `${km.size} matches ambiguo` };
}

// ═══════════════════════════════════════════════════════════════
// 4) Load rows con ramasAdicionales > 0
// ═══════════════════════════════════════════════════════════════

interface SourceRow {
  model: "flashcard" | "mcq" | "trueFalse" | "definicion";
  id: string;
  rama: string;
  libro: string | null;
  titulo: string;
  parrafo: string | null;
  ramasAdicionales: string[];
  text: string;
  esIntegrador: boolean;
}

async function loadSources(): Promise<SourceRow[]> {
  const out: SourceRow[] = [];

  const fcs = await prisma.flashcard.findMany({
    where: { ramasAdicionales: { isEmpty: false } },
    select: { id: true, rama: true, libro: true, titulo: true, parrafo: true, ramasAdicionales: true, front: true, back: true, esIntegrador: true },
  });
  for (const f of fcs) out.push({ model: "flashcard", id: f.id, rama: f.rama, libro: f.libro, titulo: f.titulo, parrafo: f.parrafo, ramasAdicionales: f.ramasAdicionales as string[], text: `${f.front} ${f.back}`, esIntegrador: f.esIntegrador });

  const mcqs = await prisma.mCQ.findMany({
    where: { ramasAdicionales: { isEmpty: false } },
    select: { id: true, rama: true, libro: true, titulo: true, parrafo: true, ramasAdicionales: true, question: true, explanation: true, esIntegrador: true },
  });
  for (const m of mcqs) out.push({ model: "mcq", id: m.id, rama: m.rama, libro: m.libro, titulo: m.titulo, parrafo: m.parrafo, ramasAdicionales: m.ramasAdicionales as string[], text: `${m.question} ${m.explanation ?? ""}`, esIntegrador: m.esIntegrador });

  const vfs = await prisma.trueFalse.findMany({
    where: { ramasAdicionales: { isEmpty: false } },
    select: { id: true, rama: true, libro: true, titulo: true, parrafo: true, ramasAdicionales: true, statement: true, explanation: true, esIntegrador: true },
  });
  for (const v of vfs) out.push({ model: "trueFalse", id: v.id, rama: v.rama, libro: v.libro, titulo: v.titulo, parrafo: v.parrafo, ramasAdicionales: v.ramasAdicionales as string[], text: `${v.statement} ${v.explanation ?? ""}`, esIntegrador: v.esIntegrador });

  const defs = await prisma.definicion.findMany({
    where: { ramasAdicionales: { isEmpty: false } },
    select: { id: true, rama: true, libro: true, titulo: true, parrafo: true, ramasAdicionales: true, concepto: true, definicion: true, esIntegrador: true },
  });
  for (const d of defs) out.push({ model: "definicion", id: d.id, rama: d.rama, libro: d.libro, titulo: d.titulo ?? "", parrafo: d.parrafo, ramasAdicionales: d.ramasAdicionales as string[], text: `${d.concepto} ${d.definicion}`, esIntegrador: d.esIntegrador });

  return out;
}

// ═══════════════════════════════════════════════════════════════
// 5) Plan row + main
// ═══════════════════════════════════════════════════════════════

interface PlanRow {
  model: string;
  source_id: string;
  source_rama: string;
  source_titulo: string;
  target_rama: string;
  target_libro: string | null;
  target_titulo: string | null;
  target_parrafo: string | null;
  r8_hits: number;
  r8_matched: string;
  parrafo_rule: string;
  parrafo_note: string;
  confidence: "high" | "medium" | "low" | "null";
  excerpt: string;
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function computeConfidence(r8Hits: number, parrafoRule: string): "high" | "medium" | "low" | "null" {
  if (r8Hits === 0) return "null";
  if (r8Hits >= 2 && (parrafoRule === "P2" || parrafoRule === "P3" || parrafoRule === "P4")) return "high";
  if (r8Hits >= 2 || parrafoRule === "P2" || parrafoRule === "P3") return "medium";
  return "low";
}

async function main() {
  console.log("Cargando rows con ramasAdicionales no vacío...");
  const sources = await loadSources();
  console.log(`Total source rows: ${sources.length}`);

  const plan: PlanRow[] = [];
  for (const s of sources) {
    for (const target_rama of s.ramasAdicionales) {
      const r8 = classifyTituloInRama(target_rama, s.text);
      let target_titulo: string | null = null;
      let target_libro: string | null = null;
      let target_parrafo: string | null = null;
      let parrafoRule = "—";
      let parrafoNote = "—";
      let r8Hits = 0;
      let r8Matched = "";

      if (r8) {
        target_titulo = r8.titulo;
        r8Hits = r8.hits;
        r8Matched = r8.matched.join("|");
        const meta = tituloMeta.get(r8.titulo);
        target_libro = meta?.libro ?? null;
        const pp = classifyParrafo(r8.titulo, s.text);
        target_parrafo = pp.parrafo;
        parrafoRule = pp.rule;
        parrafoNote = pp.note;
      }

      plan.push({
        model: s.model,
        source_id: s.id,
        source_rama: s.rama,
        source_titulo: s.titulo,
        target_rama,
        target_libro,
        target_titulo,
        target_parrafo,
        r8_hits: r8Hits,
        r8_matched: r8Matched,
        parrafo_rule: parrafoRule,
        parrafo_note: parrafoNote,
        confidence: computeConfidence(r8Hits, parrafoRule),
        excerpt: s.text.slice(0, 120).replace(/\s+/g, " "),
      });
    }
  }

  // ─── Stats ───
  const byConf: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  const byTargetRama: Record<string, number> = {};
  for (const p of plan) {
    byConf[p.confidence] = (byConf[p.confidence] ?? 0) + 1;
    byModel[p.model] = (byModel[p.model] ?? 0) + 1;
    byTargetRama[p.target_rama] = (byTargetRama[p.target_rama] ?? 0) + 1;
  }

  // ─── CSV ───
  const csvPath = path.join(process.cwd(), "outputs", "fase-7bis-plan.csv");
  const header = "model,source_id,source_rama,source_titulo,target_rama,target_libro,target_titulo,target_parrafo,r8_hits,r8_matched,parrafo_rule,parrafo_note,confidence,excerpt";
  const lines = [header];
  for (const p of plan) {
    lines.push([
      p.model, p.source_id, p.source_rama, p.source_titulo, p.target_rama,
      p.target_libro ?? "", p.target_titulo ?? "", p.target_parrafo ?? "",
      String(p.r8_hits), p.r8_matched, p.parrafo_rule, p.parrafo_note,
      p.confidence, p.excerpt,
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n"));
  console.log(`CSV → ${csvPath}`);

  // ─── MD ───
  const mdPath = path.join(process.cwd(), "outputs", "fase-7bis-plan.md");
  const md = [
    "# Fase 7-bis — Dry-run: duplicación cross-rama con re-clasif heurística\n",
    `_Generado ${new Date().toISOString()}_\n`,
    `- Source rows (con \`ramasAdicionales\` no vacío): **${sources.length}**`,
    `- Duplicados prospectivos (1 por target_rama): **${plan.length}**\n`,
    `## Distribución por confidence\n`,
    `| Confidence | Count |`,
    `|---|---:|`,
    ...Object.entries(byConf).sort().map(([k, v]) => `| ${k} | ${v} |`),
    `\n## Distribución por modelo\n`,
    `| Modelo | Count |`,
    `|---|---:|`,
    ...Object.entries(byModel).sort().map(([k, v]) => `| ${k} | ${v} |`),
    `\n## Distribución por target_rama\n`,
    `| Target rama | Count |`,
    `|---|---:|`,
    ...Object.entries(byTargetRama).sort().map(([k, v]) => `| ${k} | ${v} |`),
    `\n## Top 30 casos con titulo null (R8 no matcheó)\n`,
    `| Modelo | source_id | source_rama→target | excerpt |`,
    `|---|---|---|---|`,
    ...plan.filter((p) => p.target_titulo === null).slice(0, 30).map((p) =>
      `| ${p.model} | \`${p.source_id}\` | ${p.source_rama}→${p.target_rama} | ${p.excerpt.slice(0, 80)} |`,
    ),
  ].join("\n");
  fs.writeFileSync(mdPath, md);
  console.log(`MD  → ${mdPath}`);

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`Source rows: ${sources.length}`);
  console.log(`Plan rows:   ${plan.length}`);
  console.log(`By confidence:`, byConf);
  console.log(`By model:`, byModel);
  console.log(`By target_rama:`, byTargetRama);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
