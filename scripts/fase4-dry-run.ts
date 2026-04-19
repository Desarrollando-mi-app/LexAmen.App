/**
 * Fase 4 — Dry-run: clasificación por párrafo
 * ─────────────────────────────────────────────
 * Para cada ejercicio con titulo VÁLIDO y parrafo=NULL, intenta asignar un
 * `parrafo` (ej. `LI_T2_P1`) usando keywords extraídas del label del párrafo.
 *
 * Reglas:
 *   P1 — Titulo sin parrafos definidos en CURRICULUM → skip (nada que asignar)
 *   P2 — Titulo con 1 parrafo → asignar ese (trivial)
 *   P3 — Match exacto por articulosRef (texto menciona "art. N" dentro del rango)
 *   P4 — Match único por keyword del label (con stop-words descartadas)
 *   P5 — Ambiguo (0 o >1 match) → dejar parrafo=NULL para triage
 *
 * Salida:
 *   - outputs/fase-4-plan.csv (fila-a-fila)
 *   - outputs/fase-4-plan.md  (resumen)
 *
 * Uso: npx tsx scripts/fase4-dry-run.ts
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
// 1) Índice titulo → parrafos (con labels y rangos de artículos)
// ═══════════════════════════════════════════════════════════════

interface ParrafoInfo {
  id: string;
  label: string;
  articulos?: { from: number; to: number };
  /** Keywords extraídas del label (stop-words limpiadas) */
  keywords: string[];
  /** Frases específicas del override (alta señal, substring match case-insensitive) */
  overrides: string[];
}

const tituloIndex: Map<string, ParrafoInfo[]> = new Map();

// Stop-words / prefijos genéricos que se eliminan del label antes de extraer keywords
const STOPWORDS = new Set([
  "de", "la", "las", "el", "los", "del", "y", "e", "o", "u", "en", "a",
  "por", "para", "con", "sin", "al", "un", "una",
  "reglas", "generales", "general", "definiciones", "disposiciones",
  "este", "esta", "estos", "estas", "su", "sus",
  "que", "se", "lo", "le", "ni",
]);

/** Extrae el rango de artículos de un string como "Arts. 74–78" o "Arts. 9–18". */
function parseArticulos(ref?: string): { from: number; to: number } | undefined {
  if (!ref) return undefined;
  // Soportar guiones normales, en-dashes, em-dashes
  const m = ref.match(/(\d+)\s*[–\-—]\s*(\d+)/);
  if (m) return { from: parseInt(m[1], 10), to: parseInt(m[2], 10) };
  const single = ref.match(/(\d+)/);
  if (single) return { from: parseInt(single[1], 10), to: parseInt(single[1], 10) };
  return undefined;
}

/** Extrae keywords del label, quita numeración de cabecera y stopwords. */
function extractKeywords(label: string): string[] {
  // Remover prefijo tipo "1.", "§1.", "1. De la ..."
  const cleaned = label.replace(/^[§\d\.\s]+/, "").toLowerCase();
  // Tokenizar en palabras alfabéticas ≥4 letras
  const toks = cleaned.match(/[a-záéíóúñ]+/g) ?? [];
  return toks.filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

// ═══════════════════════════════════════════════════════════════
// 1.5) Overrides específicos para top P5 titulos
//       → frases completas (se chequean con includes case-insensitive)
//       → reducen ambigüedad cuando los labels son pobres en keywords
// ═══════════════════════════════════════════════════════════════
const PARRAFO_OVERRIDES: Record<string, string[]> = {
  // COT_T7 — reglas generales de competencia (11 parrafos, el top P5)
  "COT_T7_P2": ["cuantía", "mayor cuantía", "menor cuantía", "mínima cuantía"],
  "COT_T7_P3": ["fuero personal", "supresión del fuero"],
  "COT_T7_P4": ["competencia en materia civil", "competencia civil entre tribunales", "competencia territorial civil"],
  "COT_T7_P5": ["competencia en materia criminal", "competencia penal", "tribunal penal competente"],
  "COT_T7_P6": ["competencia civil de los tribunales en lo criminal", "acción civil en el proceso penal"],
  "COT_T7_P7": ["distribución de causas", "turno de causas", "reglas de distribución"],
  "COT_T7_P8": ["prórroga de la competencia", "prórroga de competencia", "prorrogar la competencia"],
  "COT_T7_P9": ["única instancia", "primera instancia", "segunda instancia"],
  "COT_T7_P10": ["contienda de competencia", "cuestión de competencia", "contiendas de competencia"],
  "COT_T7_P11": ["implicancia", "recusación", "causal de implicancia", "causal de recusación", "abogado integrante"],

  // COT_T2 — Juzgados de Garantía + TJOP
  "COT_T2_P1": ["juzgado de garantía", "juzgados de garantía"],
  "COT_T2_P2": ["tribunal de juicio oral", "tjop", "juicio oral en lo penal"],
  "COT_T2_P3": ["comité de jueces"],
  "COT_T2_P4": ["juez presidente"],
  "COT_T2_P5": ["organización administrativa"],

  // COT_T11 — auxiliares de la administración de justicia
  "COT_T11_P1": ["fiscalía judicial", "fiscal judicial", "fiscales judiciales"],
  "COT_T11_P2": ["defensor público", "defensores públicos", "defensoría pública"],
  "COT_T11_P3": ["relator", "relatores"],
  "COT_T11_P4": ["secretario del tribunal", "secretarios del tribunal", "secretario judicial"],
  "COT_T11_P5": ["administrador de tribunal", "administradores de tribunales"],
  "COT_T11_P6": ["receptor judicial", "receptores judiciales"],
  "COT_T11_P7": ["procurador del número", "procuradores del número"],
  "COT_T11_P8": ["notario", "notarios", "función notarial"],

  // COT_T5 — Cortes de Apelaciones
  "COT_T5_P1": ["organización y atribuciones de las cortes", "atribuciones de la corte de apelaciones"],
  "COT_T5_P2": ["acuerdos de las cortes", "acuerdo de la corte"],
  "COT_T5_P3": ["presidente de la corte de apelaciones"],

  // COT_T6 — Corte Suprema
  "COT_T6_P1": ["organización y atribuciones de la corte suprema", "atribuciones de la corte suprema"],
  "COT_T6_P2": ["presidente de la corte suprema"],

  // LIII_T7 — apertura de la sucesión / aceptación
  "LIII_T7_P2": ["aceptación de la herencia", "repudiación de la herencia"],
  "LIII_T7_P3": ["beneficio de inventario"],
  "LIII_T7_P4": ["petición de herencia", "acción de petición de herencia"],

  // LII_T7 — posesión
  "LII_T7_P1": ["poseedor regular", "poseedor irregular", "calidades de la posesión", "posesión regular", "posesión irregular", "buena fe del poseedor", "mala fe del poseedor"],
  "LII_T7_P2": ["adquirir la posesión", "perder la posesión", "modo de adquirir la posesión", "modo de perder la posesión"],

  // LIII_T6 — revocación / reforma del testamento
  "LIII_T6_P1": ["revocación del testamento", "revocar el testamento"],
  "LIII_T6_P2": ["reforma del testamento", "acción de reforma del testamento"],

  // LIII_T10 — partición
  "LIII_T10_P2": ["juicio de partición", "juez partidor", "laudo y ordenata", "partición judicial"],

  // LIV_T22 — sociedad conyugal
  "LIV_T22_P2": ["haber de la sociedad conyugal", "haber absoluto", "haber relativo", "cargas de la sociedad"],
  "LIV_T22_P3": ["administración ordinaria de la sociedad conyugal", "administración ordinaria"],
  "LIV_T22_P4": ["administración extraordinaria de la sociedad conyugal", "administración extraordinaria"],
  "LIV_T22_P5": ["disolución de la sociedad conyugal", "partición de gananciales"],
  "LIV_T22_P6": ["renuncia de los gananciales", "renuncia a los gananciales"],
  "LIV_T22_P7": ["donaciones por causa de matrimonio", "dote"],

  // LIV_T22A — participación en los gananciales
  "LIV_T22A_P2": ["administración del patrimonio de los cónyuges"],
  "LIV_T22A_P3": ["determinación de los gananciales", "cálculo de los gananciales"],
  "LIV_T22A_P4": ["crédito de participación", "crédito de participación en los gananciales"],
  "LIV_T22A_P5": ["término del régimen", "término del régimen de participación"],

  // CPC_LII_T11 — medios de prueba
  "CPC_LII_T11_P2": ["prueba instrumental", "instrumento público", "instrumento privado", "impugnación de instrumentos"],
  "CPC_LII_T11_P3": ["prueba testimonial", "tacha de testigos", "testigo del juicio"],
  "CPC_LII_T11_P4": ["confesión en juicio", "absolución de posiciones", "confesión provocada"],
  "CPC_LII_T11_P5": ["inspección personal del tribunal"],
  "CPC_LII_T11_P6": ["informe de peritos", "prueba pericial", "peritaje"],
  "CPC_LII_T11_P7": ["presunciones judiciales", "presunciones legales"],
  "CPC_LII_T11_P8": ["apreciación comparativa de los medios de prueba", "sana crítica"],

  // LI_T6 — obligaciones cónyuges
  "LI_T6_P2": ["bien familiar", "bienes familiares", "declaración de bien familiar"],
  "LI_T6_P3": ["profesión u oficio de la mujer"],
  "LI_T6_P4": ["separación de bienes", "régimen de separación"],
  "LI_T6_P5": ["separación judicial", "divorcio perpetuo"],

  // LIV_T2 — acto jurídico
  "LIV_T2_P1": ["acto jurídico", "teoría del acto jurídico", "actos y declaraciones de voluntad"],
  "LIV_T2_P2": ["capacidad de ejercicio", "capacidad de goce", "incapacidad absoluta", "incapacidad relativa"],
  "LIV_T2_P3": ["objeto lícito", "objeto ilícito", "objeto del acto"],
  "LIV_T2_P4": ["causa lícita", "causa ilícita", "causa del acto", "causa de la obligación"],
  "LIV_T2_P5": ["formalidades por vía de solemnidad", "formalidades habilitantes", "formalidades por vía de publicidad", "formalidades ad probationem"],

  // LII_T1 — cosas corporales / incorporales
  "LII_T1_P1": ["cosas corporales", "bienes muebles", "bienes inmuebles"],
  "LII_T1_P2": ["cosas incorporales", "derechos personales", "derechos reales"],

  // LII_T2 — dominio
  "LII_T2_P1": ["facultades del dominio", "definición del dominio", "atributos del dominio"],
  "LII_T2_P2": ["copropiedad", "comunidad", "cuota"],
  "LII_T2_P3": ["propiedad fiduciaria", "fideicomiso"],

  // LII_T11 — servidumbres
  "LII_T11_P1": ["servidumbre natural", "servidumbres naturales"],
  "LII_T11_P2": ["servidumbre legal", "servidumbres legales", "servidumbre de tránsito", "servidumbre de acueducto"],
  "LII_T11_P3": ["servidumbre voluntaria", "servidumbres voluntarias"],
  "LII_T11_P4": ["extinción de las servidumbres", "extinción de la servidumbre"],

  // LII_T12 — reivindicación
  "LII_T12_P1": ["cosas que pueden reivindicarse", "qué cosas pueden reivindicarse"],
  "LII_T12_P2": ["quién puede reivindicar", "legitimación activa reivindicatoria"],
  "LII_T12_P3": ["contra quién se puede reivindicar", "legitimación pasiva reivindicatoria"],
  "LII_T12_P4": ["prestaciones mutuas"],

  // LIII_T3 — testamento
  "LIII_T3_P2": ["testamento solemne otorgado en chile", "testamento abierto", "testamento cerrado"],
  "LIII_T3_P3": ["testamento solemne otorgado en país extranjero", "testamento en el extranjero"],
  "LIII_T3_P4": ["testamento privilegiado", "testamentos privilegiados", "testamento militar", "testamento marítimo"],

  // LIII_T4 — asignaciones testamentarias
  "LIII_T4_P2": ["asignación condicional", "asignaciones condicionales"],
  "LIII_T4_P3": ["asignación a día", "asignaciones a día"],
  "LIII_T4_P4": ["asignación modal", "asignaciones modales"],
  "LIII_T4_P5": ["asignación a título universal", "herederos universales"],
  "LIII_T4_P6": ["asignación a título singular", "legatario"],
  "LIII_T4_P7": ["donación revocable", "donaciones revocables"],
  "LIII_T4_P8": ["derecho de acrecer", "acrecimiento"],
  "LIII_T4_P9": ["sustitución", "sustituciones"],

  // LIII_T5 — asignaciones forzosas
  "LIII_T5_P1": ["asignación alimenticia forzosa", "asignaciones alimenticias"],
  "LIII_T5_P2": ["porción conyugal"],
  "LIII_T5_P3": ["legítima", "legítimas", "mejoras", "cuarta de mejoras"],
  "LIII_T5_P4": ["desheredamiento", "desheredamientos"],

  // LIV_T12 — efectos de las obligaciones
  "LIV_T12_P1": ["cumplimiento forzado", "ejecución forzada de la obligación"],
  "LIV_T12_P2": ["indemnización de perjuicios", "indemnización compensatoria", "indemnización moratoria", "daño emergente", "lucro cesante"],
  "LIV_T12_P3": ["derechos auxiliares del acreedor", "acción subrogatoria", "acción pauliana", "beneficio de separación"],

  // CPC_LIII_T1 — juicio ejecutivo
  "CPC_LIII_T1_P1": ["procedimiento ejecutivo", "mandamiento de ejecución", "excepciones del ejecutado"],
  "CPC_LIII_T1_P2": ["administración de bienes embargados", "procedimiento de apremio", "remate"],
  "CPC_LIII_T1_P3": ["tercería", "tercerías", "tercería de dominio", "tercería de posesión", "tercería de prelación", "tercería de pago"],

  // LI_T2 — principio y fin de la existencia
  "LI_T2_P1": ["principio de la existencia", "nacimiento de la persona", "existencia natural"],
  "LI_T2_P2": ["fin de la existencia", "muerte natural"],
  "LI_T2_P3": ["muerte presunta", "presunción de muerte por desaparecimiento", "desaparecido"],
  "LI_T2_P4": ["comprobación judicial de la muerte"],

  // LI_T7 — filiación
  "LI_T7_P2": ["determinación de la maternidad"],
  "LI_T7_P3": ["filiación matrimonial", "determinación de la filiación matrimonial"],
  "LI_T7_P4": ["filiación no matrimonial", "determinación de la filiación no matrimonial", "reconocimiento de hijo"],

  // CPC_LIII_T4 — interdictos
  "CPC_LIII_T4_P2": ["querella posesoria", "querella de amparo", "querella de restitución", "querella de restablecimiento"],
  "CPC_LIII_T4_P3": ["denuncia de obra nueva"],
  "CPC_LIII_T4_P4": ["denuncia de obra ruinosa"],
  "CPC_LIII_T4_P5": ["interdicto especial"],

  // LI_T19 — tutelas y curadurías
  "LI_T19_P2": ["tutela testamentaria", "curaduría testamentaria"],
  "LI_T19_P3": ["tutela legítima", "curaduría legítima"],
  "LI_T19_P4": ["tutela dativa", "curaduría dativa"],

  // CPC_LI_T19 — ejecución resoluciones
  // (sin parrafos específicos en CURRICULUM que justifiquen overrides)
};

for (const [_ramaKey, rama] of Object.entries(CURRICULUM)) {
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) {
      if (!t.parrafos || t.parrafos.length === 0) continue;
      const infos: ParrafoInfo[] = t.parrafos.map((p) => ({
        id: p.id,
        label: p.label,
        articulos: parseArticulos(p.articulosRef),
        keywords: extractKeywords(p.label),
        overrides: (PARRAFO_OVERRIDES[p.id] ?? []).map((s) => s.toLowerCase()),
      }));
      tituloIndex.set(t.id, infos);
    }
  }
}

console.log(`Titulos con parrafos indexados: ${tituloIndex.size}`);

// ═══════════════════════════════════════════════════════════════
// 2) Classifier
// ═══════════════════════════════════════════════════════════════

type RuleCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6" | "ALREADY";

interface ParrafoPlan {
  rule: RuleCode;
  newParrafo: string | null;
  note?: string;
}

/** Extrae menciones de artículos del texto: "art. 74", "artículo 74", "arts. 74 a 76". */
function extractArticles(text: string): number[] {
  const t = text.toLowerCase();
  const nums: number[] = [];
  const re = /art(?:\.|ículo|ículos|s\.)?\s*(\d+)(?:\s*(?:a|al|y|,|-)\s*(\d+))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const n1 = parseInt(m[1], 10);
    if (!Number.isNaN(n1)) nums.push(n1);
    if (m[2]) {
      const n2 = parseInt(m[2], 10);
      if (!Number.isNaN(n2)) nums.push(n2);
    }
  }
  return nums;
}

function classify(titulo: string, text: string): ParrafoPlan {
  const parrafos = tituloIndex.get(titulo);
  if (!parrafos || parrafos.length === 0) {
    return { rule: "P1", newParrafo: null, note: "titulo sin párrafos" };
  }
  if (parrafos.length === 1) {
    return { rule: "P2", newParrafo: parrafos[0].id, note: "único párrafo" };
  }

  const tLower = text.toLowerCase();
  const arts = extractArticles(text);

  // P3 — match por artículo
  if (arts.length > 0) {
    const hits = parrafos.filter((p) => {
      if (!p.articulos) return false;
      return arts.some((a) => a >= p.articulos!.from && a <= p.articulos!.to);
    });
    if (hits.length === 1) {
      return { rule: "P3", newParrafo: hits[0].id, note: `art. ${arts[0]}` };
    }
  }

  // P3' — match por override (frase específica, alta señal)
  const overrideHits: Map<string, string[]> = new Map();
  for (const p of parrafos) {
    const matched: string[] = [];
    for (const phrase of p.overrides) {
      if (tLower.includes(phrase)) matched.push(phrase);
    }
    if (matched.length > 0) overrideHits.set(p.id, matched);
  }
  if (overrideHits.size === 1) {
    const only = [...overrideHits.keys()][0];
    const phrase = overrideHits.get(only)![0];
    return { rule: "P3", newParrafo: only, note: `override: "${phrase}"` };
  }
  if (overrideHits.size > 1) {
    const sorted = [...overrideHits.entries()].sort((a, b) => b[1].length - a[1].length);
    if (sorted[0][1].length > sorted[1][1].length) {
      return { rule: "P3", newParrafo: sorted[0][0], note: `override dominante: "${sorted[0][1][0]}"` };
    }
  }

  // P4 — match por keyword único
  const matched: Set<string> = new Set();
  const matchedHits: Map<string, number> = new Map(); // para desempate por cantidad de hits
  for (const p of parrafos) {
    let hits = 0;
    for (const k of p.keywords) {
      if (tLower.includes(k)) hits++;
    }
    if (hits > 0) {
      matched.add(p.id);
      matchedHits.set(p.id, hits);
    }
  }
  if (matched.size === 1) {
    const only = [...matched][0];
    return { rule: "P4", newParrafo: only, note: `keyword match` };
  }
  if (matched.size > 1) {
    // Desempate: si el top tiene ≥2x hits que el segundo → asignar
    const sorted = [...matchedHits.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] >= 2 * sorted[1][1] && sorted[0][1] >= 2) {
      return { rule: "P4", newParrafo: sorted[0][0], note: `dominant keyword (${sorted[0][1]} vs ${sorted[1][1]})` };
    }
  }

  // P6 — Fallback a "Reglas generales" / "Disposiciones generales" si existe
  //      Solo si NINGÚN párrafo específico matcheó (ni override ni keyword dominante).
  //      Regla segura: solo se activa cuando el primer párrafo (P1) es explícitamente "general".
  if (matched.size === 0 && overrideHits.size === 0) {
    const first = parrafos[0];
    const firstLabel = first.label.toLowerCase();
    const isGeneric =
      firstLabel.includes("reglas generales") ||
      firstLabel.includes("disposiciones generales") ||
      firstLabel.includes("definiciones y reglas") ||
      firstLabel.includes("definición y facultades") ||
      firstLabel.includes("procedimiento ejecutivo"); // CPC_LIII_T1_P1: procedimiento ejecutivo genérico
    if (isGeneric) {
      return { rule: "P6", newParrafo: first.id, note: "fallback a reglas generales" };
    }
  }

  return { rule: "P5", newParrafo: null, note: `${matched.size} matches — ambiguo` };
}

// ═══════════════════════════════════════════════════════════════
// 3) Carga filas candidatas (titulo válido + parrafo null)
// ═══════════════════════════════════════════════════════════════

const validTitulos = new Set<string>();
for (const [, rama] of Object.entries(CURRICULUM)) {
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) validTitulos.add(t.id);
  }
}

interface CandidateRow {
  model: string;
  id: string;
  titulo: string;
  text: string;
}

async function loadCandidates(): Promise<CandidateRow[]> {
  const out: CandidateRow[] = [];

  const push = (model: string, id: string, titulo: string, text: string) => {
    if (validTitulos.has(titulo)) out.push({ model, id, titulo, text });
  };

  console.log("Cargando Flashcards...");
  const fcs = await prisma.flashcard.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, front: true, back: true },
  });
  for (const f of fcs) push("flashcard", f.id, f.titulo ?? "", `${f.front} ${f.back}`);

  console.log("Cargando MCQ...");
  const mcqs = await prisma.mCQ.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, question: true, explanation: true },
  });
  for (const m of mcqs) push("mcq", m.id, m.titulo ?? "", `${m.question} ${m.explanation ?? ""}`);

  console.log("Cargando TrueFalse...");
  const vfs = await prisma.trueFalse.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, statement: true, explanation: true },
  });
  for (const v of vfs) push("trueFalse", v.id, v.titulo ?? "", `${v.statement} ${v.explanation ?? ""}`);

  console.log("Cargando Definicion...");
  const defs = await prisma.definicion.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, concepto: true, definicion: true },
  });
  for (const d of defs) push("definicion", d.id, d.titulo ?? "", `${d.concepto} ${d.definicion}`);

  console.log("Cargando FillBlank...");
  const fbs = await prisma.fillBlank.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, textoConBlancos: true, explicacion: true },
  });
  for (const f of fbs) push("fillBlank", f.id, f.titulo ?? "", `${f.textoConBlancos} ${f.explicacion ?? ""}`);

  console.log("Cargando ErrorIdentification...");
  const eis = await prisma.errorIdentification.findMany({
    where: { parrafo: null },
    select: { id: true, titulo: true, textoConErrores: true, explicacionGeneral: true },
  });
  for (const e of eis) push("errorIdentification", e.id, e.titulo ?? "", `${e.textoConErrores} ${e.explicacionGeneral ?? ""}`);

  console.log("Cargando OrderSequence...");
  const oss = await prisma.orderSequence.findMany({
    where: { parrafo: null },
    select: { id: true, tituloMateria: true, titulo: true, instruccion: true, explicacion: true },
  });
  for (const r of oss) push("orderSequence", r.id, r.tituloMateria ?? "", `${r.titulo} ${r.instruccion ?? ""} ${r.explicacion ?? ""}`);

  console.log("Cargando MatchColumns...");
  const mcs = await prisma.matchColumns.findMany({
    where: { parrafo: null },
    select: { id: true, tituloMateria: true, titulo: true, explicacion: true },
  });
  for (const r of mcs) push("matchColumns", r.id, r.tituloMateria ?? "", `${r.titulo} ${r.explicacion ?? ""}`);

  console.log("Cargando CasoPractico...");
  const cps = await prisma.casoPractico.findMany({
    where: { parrafo: null },
    select: { id: true, tituloMateria: true, titulo: true, hechos: true },
  });
  for (const r of cps) push("casoPractico", r.id, r.tituloMateria ?? "", `${r.titulo} ${r.hechos}`);

  console.log("Cargando DictadoJuridico...");
  const djs = await prisma.dictadoJuridico.findMany({
    where: { parrafo: null },
    select: { id: true, tituloMateria: true, titulo: true, textoCompleto: true },
  });
  for (const r of djs) push("dictadoJuridico", r.id, r.tituloMateria ?? "", `${r.titulo} ${r.textoCompleto}`);

  console.log("Cargando Timeline...");
  const tls = await prisma.timeline.findMany({
    where: { parrafo: null },
    select: { id: true, tituloMateria: true, titulo: true, explicacion: true },
  });
  for (const r of tls) push("timeline", r.id, r.tituloMateria ?? "", `${r.titulo} ${r.explicacion ?? ""}`);

  return out;
}

// ═══════════════════════════════════════════════════════════════
// 4) Main
// ═══════════════════════════════════════════════════════════════

interface PlanRow extends CandidateRow {
  plan: ParrafoPlan;
}

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const cands = await loadCandidates();
  console.log(`\nTotal candidatos (titulo válido + parrafo null): ${cands.length}`);

  const planRows: PlanRow[] = cands.map((c) => ({ ...c, plan: classify(c.titulo, c.text) }));

  const byRule: Record<string, number> = {};
  const byRuleModel: Record<string, Record<string, number>> = {};
  const byTitulo: Record<string, { total: number; rules: Record<string, number> }> = {};
  const p5ByTitulo: Record<string, number> = {};

  for (const pr of planRows) {
    byRule[pr.plan.rule] = (byRule[pr.plan.rule] ?? 0) + 1;
    byRuleModel[pr.plan.rule] = byRuleModel[pr.plan.rule] ?? {};
    byRuleModel[pr.plan.rule][pr.model] = (byRuleModel[pr.plan.rule][pr.model] ?? 0) + 1;
    if (!byTitulo[pr.titulo]) byTitulo[pr.titulo] = { total: 0, rules: {} };
    byTitulo[pr.titulo].total++;
    byTitulo[pr.titulo].rules[pr.plan.rule] = (byTitulo[pr.titulo].rules[pr.plan.rule] ?? 0) + 1;
    if (pr.plan.rule === "P5") p5ByTitulo[pr.titulo] = (p5ByTitulo[pr.titulo] ?? 0) + 1;
  }

  // CSV
  const csvPath = path.join(process.cwd(), "outputs", "fase-4-plan.csv");
  const csvLines: string[] = ["model,id,rule,titulo,new_parrafo,note"];
  for (const pr of planRows) {
    csvLines.push([pr.model, pr.id, pr.plan.rule, pr.titulo, pr.plan.newParrafo ?? "", pr.plan.note ?? ""].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"));
  console.log(`CSV → ${csvPath}`);

  // MD
  const mdPath = path.join(process.cwd(), "outputs", "fase-4-plan.md");
  const lines: string[] = [];
  lines.push("# Fase 4 — Plan de clasificación por párrafo (DRY-RUN)");
  lines.push("");
  lines.push(`_Generado ${new Date().toISOString()}. Sin escrituras en DB._`);
  lines.push("");
  lines.push(`**Candidatos (titulo válido + parrafo=NULL): ${cands.length}**`);
  lines.push("");

  lines.push("## Distribución por regla");
  lines.push("");
  lines.push("| Regla | Count | % | Acción |");
  lines.push("|-------|------:|--:|--------|");
  const ruleDesc: Record<string, string> = {
    P1: "Titulo sin párrafos definidos → skip",
    P2: "Titulo con 1 párrafo → asignar trivialmente",
    P3: "Match por artículo (art. N ∈ rango)",
    P4: "Match único por keyword del label",
    P5: "Ambiguo (0 o múltiples matches) → mantener NULL",
    P6: "Fallback a 'Reglas generales' (P1 del titulo)",
    ALREADY: "Ya tenía parrafo (no debería aparecer)",
  };
  const total = cands.length || 1;
  const rules = Object.keys(byRule).sort((a, b) => byRule[b] - byRule[a]);
  for (const r of rules) {
    lines.push(`| **${r}** | ${byRule[r]} | ${((byRule[r] / total) * 100).toFixed(1)}% | ${ruleDesc[r] ?? ""} |`);
  }
  lines.push("");

  // Modelo
  lines.push("## Por regla · por modelo");
  lines.push("");
  lines.push("| Regla | FC | MCQ | V/F | Def | Fill | Err | Ord | Match | Caso | Dict | TL | Total |");
  lines.push("|-------|---:|----:|----:|----:|-----:|----:|----:|------:|-----:|-----:|---:|-----:|");
  const modelOrder = ["flashcard", "mcq", "trueFalse", "definicion", "fillBlank", "errorIdentification", "orderSequence", "matchColumns", "casoPractico", "dictadoJuridico", "timeline"];
  for (const r of rules) {
    const row = byRuleModel[r] ?? {};
    const cells = modelOrder.map((m) => row[m] ?? 0);
    lines.push(`| **${r}** | ${cells.join(" | ")} | **${byRule[r]}** |`);
  }
  lines.push("");

  // Top titulos con P5
  lines.push("## Top 30 títulos con más P5 (ambiguos — quedan NULL)");
  lines.push("");
  lines.push("| Titulo | P5 count | Total del titulo |");
  lines.push("|--------|---------:|-----------------:|");
  const p5Sorted = Object.entries(p5ByTitulo).sort((a, b) => b[1] - a[1]).slice(0, 30);
  for (const [t, n] of p5Sorted) {
    lines.push(`| \`${t}\` | ${n} | ${byTitulo[t]?.total ?? 0} |`);
  }
  lines.push("");

  // Muestras
  lines.push("## Muestra — primeras 15 asignaciones por regla");
  lines.push("");
  for (const r of rules) {
    if (r === "P5" || r === "P1") continue;
    lines.push(`### ${r}`);
    lines.push("");
    const sample = planRows.filter((pr) => pr.plan.rule === r).slice(0, 15);
    if (sample.length === 0) { lines.push("_(sin filas)_\n"); continue; }
    lines.push("| Modelo | id | titulo | → parrafo | nota |");
    lines.push("|--------|----|--------|-----------|------|");
    for (const pr of sample) {
      lines.push(`| ${pr.model} | \`${pr.id.slice(0, 8)}\` | \`${pr.titulo}\` | \`${pr.plan.newParrafo ?? "(null)"}\` | ${pr.plan.note ?? ""} |`);
    }
    lines.push("");
  }

  lines.push("## Siguiente paso");
  lines.push("");
  lines.push("- Revisa el CSV y el resumen.");
  lines.push("- Si te parece bien, corremos `scripts/fase4-apply.ts` — actualiza `parrafo` en las filas P2/P3/P4.");
  lines.push("- P1 (titulo sin párrafos) y P5 (ambiguo) quedan con `parrafo=NULL`. Son candidatas de Fase 5.");
  lines.push("");

  fs.writeFileSync(mdPath, lines.join("\n"));
  console.log(`MD  → ${mdPath}`);

  console.log("\n═══ SUMMARY ═══");
  for (const r of rules) console.log(`  ${r.padEnd(5)}: ${byRule[r]}`);
  console.log(`  ─────────────`);
  console.log(`  Total: ${cands.length}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
