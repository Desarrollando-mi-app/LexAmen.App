/**
 * Classify by content — reasigna ejercicios desde instituciones GENÉRICAS
 * (que tienen mucho contenido) hacia instituciones ESPECÍFICAS que están
 * vacías o casi vacías, basándose en keywords muy específicas del texto.
 *
 * Estrategia conservadora:
 * - Solo mueve si la institución actual es una de las "fuentes amplias"
 * - Solo mueve si el texto contiene una keyword específica e inequívoca
 * - Si matchea más de una institución target, NO mueve (ambiguo)
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Instituciones "fuente": muy amplias, donde sus ejercicios podrían pertenecer
// a instituciones más específicas. Solo desde aquí movemos.
const SOURCE_INSTITUCIONES = new Set([
  1,   // La Ley
  4,   // Personas Naturales
  5,   // Atributos de la Personalidad
  8,   // Matrimonio
  11,  // Regímenes Patrimoniales
  18,  // Bienes y Clasificación
  19,  // Dominio
  26,  // Sucesión por Causa de Muerte
  28,  // Sucesión Testada
  29,  // Partición
  30,  // Acto Jurídico
  31,  // Voluntad y Consentimiento
  35,  // Nulidad
  38,  // Obligaciones
  39,  // Efectos de las Obligaciones
  40,  // Modos de Extinguir
  45,  // Compraventa
  53,  // Competencia
  60,  // Juicio Ordinario
  64,  // Juicio Ejecutivo
  65,  // Juicios Especiales
  66,  // Actos No Contenciosos
  68,  // Organización de Tribunales
  69,  // Auxiliares
]);

// Reglas: target → keywords (case-insensitive substring match)
interface Rule {
  target: number;
  name: string;
  keywords: string[];
}

const RULES: Rule[] = [
  // ── CIVIL — vacías ──
  { target: 3, name: "Costumbre", keywords: ["costumbre como fuente", "costumbre según la ley", "secundum legem", "art. 2 cc", "costumbre en silencio"] },
  { target: 6, name: "Capacidad", keywords: ["capacidad de goce", "capacidad de ejercicio", "incapacidad absoluta", "incapacidad relativa", "art. 1447", "art. 1446", "incapaces absolutos"] },
  { target: 10, name: "AUC", keywords: ["acuerdo de unión civil", "ley 20.830", "convivientes civiles"] },
  { target: 12, name: "Bienes Familiares", keywords: ["bienes familiares", "art. 141 cc", "art. 142 cc", "art. 143 cc", "declaración de bien familiar", "beneficio de excusión familiar"] },
  { target: 17, name: "VIF y Adopción", keywords: ["violencia intrafamiliar", "ley 20.066", "ley 19.620", "adopción plena"] },
  { target: 23, name: "Inscripción CBR", keywords: ["conservador de bienes raíces", "registro de propiedad", "registro de hipotecas", "inscripción conservatoria", "estudio de títulos", "art. 686 cc"] },
  { target: 32, name: "Vicios del Consentimiento", keywords: ["vicios del consentimiento", "error sustancial", "error obstáculo", "error accidental", "fuerza moral", "dolo principal", "dolo incidental", "art. 1451", "art. 1453", "art. 1454", "art. 1456", "art. 1458"] },
  { target: 33, name: "Objeto y Causa", keywords: ["objeto ilícito", "objeto lícito", "causa ilícita", "art. 1464", "art. 1467", "art. 1461", "objeto del acto"] },
  { target: 36, name: "Inoponibilidad", keywords: ["inoponibilidad", "acto inoponible", "art. 1707", "fraude pauliana", "acción pauliana"] },
  { target: 37, name: "Representación y Simulación", keywords: ["representación legal", "representación voluntaria", "art. 1448", "simulación absoluta", "simulación relativa", "actos simulados"] },
  { target: 41, name: "Responsabilidad Contractual", keywords: ["responsabilidad contractual", "culpa grave", "culpa leve", "culpa levísima", "art. 1547", "art. 1558", "presunción de culpa contractual", "tripartición de la culpa"] },
  { target: 42, name: "Responsabilidad Extracontractual", keywords: ["responsabilidad extracontractual", "delitos y cuasidelitos", "art. 2314", "art. 2320", "art. 2317", "responsabilidad por hecho ajeno"] },
  { target: 43, name: "Prescripción", keywords: ["prescripción adquisitiva", "prescripción extintiva", "interrupción de la prescripción", "suspensión de la prescripción", "art. 2492", "art. 2514", "art. 2515", "art. 2521"] },
  { target: 44, name: "Buena Fe", keywords: ["buena fe contractual", "buena fe objetiva", "buena fe subjetiva", "art. 1546", "art. 706", "art. 707"] },
  { target: 51, name: "Autonomía de la Voluntad", keywords: ["autonomía de la voluntad", "art. 1545", "ley del contrato", "estipulación a favor de tercero", "contrato de adhesión"] },

  // ── PROCESAL — vacías o casi ──
  { target: 62, name: "Cosa Juzgada", keywords: ["cosa juzgada", "triple identidad", "art. 175 cpc", "art. 177 cpc", "excepción de cosa juzgada", "acción de cosa juzgada"] },
  { target: 67, name: "Nulidad Procesal", keywords: ["nulidad procesal", "incidente de nulidad", "art. 83 cpc", "art. 84 cpc", "principio de trascendencia", "principio de convalidación"] },
];

async function main() {
  console.log("═══ CLASSIFY BY CONTENT — Reasignación a instituciones específicas ═══\n");

  // Build kw → targets reverse for ambiguity check
  const kwToTargets = new Map<string, Set<number>>();
  for (const r of RULES) {
    for (const k of r.keywords) {
      const set = kwToTargets.get(k.toLowerCase()) ?? new Set();
      set.add(r.target);
      kwToTargets.set(k.toLowerCase(), set);
    }
  }

  function classify(text: string): number | null {
    const t = text.toLowerCase();
    const matched = new Set<number>();
    for (const r of RULES) {
      for (const k of r.keywords) {
        if (t.includes(k.toLowerCase())) {
          matched.add(r.target);
          break;
        }
      }
    }
    if (matched.size === 1) return [...matched][0];
    return null;
  }

  const stats: Record<number, { name: string; n: number }> = {};
  for (const r of RULES) stats[r.target] = { name: r.name, n: 0 };

  // ── Flashcard ──
  const fcs = await prisma.flashcard.findMany({
    where: { institucionId: { in: [...SOURCE_INSTITUCIONES] } },
    select: { id: true, front: true, back: true },
  });
  for (const f of fcs) {
    const tgt = classify(`${f.front} ${f.back}`);
    if (tgt) {
      await prisma.flashcard.update({ where: { id: f.id }, data: { institucionId: tgt } });
      stats[tgt].n++;
    }
  }
  console.log(`  Flashcard procesadas: ${fcs.length}`);

  // ── MCQ ──
  const mcqs = await prisma.mCQ.findMany({
    where: { institucionId: { in: [...SOURCE_INSTITUCIONES] } },
    select: { id: true, question: true, explanation: true },
  });
  for (const m of mcqs) {
    const tgt = classify(`${m.question} ${m.explanation ?? ""}`);
    if (tgt) {
      await prisma.mCQ.update({ where: { id: m.id }, data: { institucionId: tgt } });
      stats[tgt].n++;
    }
  }
  console.log(`  MCQs procesadas: ${mcqs.length}`);

  // ── TrueFalse ──
  const vfs = await prisma.trueFalse.findMany({
    where: { institucionId: { in: [...SOURCE_INSTITUCIONES] } },
    select: { id: true, statement: true, explanation: true },
  });
  for (const v of vfs) {
    const tgt = classify(`${v.statement} ${v.explanation ?? ""}`);
    if (tgt) {
      await prisma.trueFalse.update({ where: { id: v.id }, data: { institucionId: tgt } });
      stats[tgt].n++;
    }
  }
  console.log(`  V/F procesadas: ${vfs.length}`);

  // ── Definicion ──
  const defs = await prisma.definicion.findMany({
    where: { institucionId: { in: [...SOURCE_INSTITUCIONES] } },
    select: { id: true, concepto: true, definicion: true },
  });
  for (const d of defs) {
    const tgt = classify(`${d.concepto} ${d.definicion}`);
    if (tgt) {
      await prisma.definicion.update({ where: { id: d.id }, data: { institucionId: tgt } });
      stats[tgt].n++;
    }
  }
  console.log(`  Definiciones procesadas: ${defs.length}`);

  // ── FillBlank ──
  const fbs = await prisma.fillBlank.findMany({
    where: { institucionId: { in: [...SOURCE_INSTITUCIONES] } },
    select: { id: true, textoConBlancos: true, explicacion: true },
  });
  for (const f of fbs) {
    const tgt = classify(`${f.textoConBlancos} ${f.explicacion ?? ""}`);
    if (tgt) {
      await prisma.fillBlank.update({ where: { id: f.id }, data: { institucionId: tgt } });
      stats[tgt].n++;
    }
  }
  console.log(`  FillBlank procesadas: ${fbs.length}`);

  // ── Print stats ──
  console.log("\n═══ REASIGNADOS POR INSTITUCIÓN ═══");
  let total = 0;
  for (const [id, s] of Object.entries(stats).sort((a, b) => b[1].n - a[1].n)) {
    if (s.n > 0) {
      console.log(`  ${id}. ${s.name.padEnd(38)} +${s.n}`);
      total += s.n;
    }
  }
  console.log(`\n  TOTAL REASIGNADOS: ${total}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
