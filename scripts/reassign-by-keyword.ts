/**
 * Reasignar ejercicios bajo títulos GENÉRICOS hacia los 52 títulos faltantes,
 * usando keywords específicas. Estrategia conservadora:
 * - Solo mueve ejercicios cuyo `titulo`/`tituloMateria` actual está en GENERIC_SOURCES.
 * - Solo aplica si el contenido contiene una de las keywords específicas (substring case-insensitive).
 * - Si un ejercicio matchea múltiples targets, NO lo mueve (ambiguo).
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Títulos considerados "genéricos" — solo desde aquí movemos
const GENERIC_SOURCES = new Set([
  "LI", "LII", "LIII", "LIV",
  "LIBRO_I", "LIBRO_II", "LIBRO_III", "LIBRO_IV",
  "LIBRO_I_CPC", "LIBRO_II_CPC", "LIBRO_III_CPC", "LIBRO_IV_CPC", "LIBRO_COT",
  "CPC_COMPLETO", "COT_INTEGRADOR_FINAL", "COT_INTEGRADOR", "CPC_INTEGRADOR",
  "CPC_JUICIO_ORDINARIO", "CPC_JUICIOS_ESPECIALES", "CPC_ACTOS_NO_CONTENCIOSOS",
  "CPC_JUICIO_EJECUTIVO", "CPC_NOTIFICACIONES", "CPC_RECURSOS",
  "COT_BASES", "COT_REGLAS_GENERALES", "COT_TRIBUNALES_ARBITRALES",
  "COT_AUXILIARES_JUSTICIA", "COT_TRIBUNALES_ORDINARIOS", "COT_TRIBUNALES_ESPECIALES",
  "TP",
  "CPC_T1", "CPC_T2", "CPC_T3", "CPC_T5", "CPC_T6", "CPC_T7", "CPC_T8", "CPC_T9",
  "CPC_T11", "CPC_T12", "CPC_T13", "CPC_T14", "CPC_T16", "CPC_T17", "CPC_T18",
]);

interface Rule {
  target: string;
  rama: string;
  keywords: string[];
}

// Keywords MÁS PERMISIVAS — palabras clave cortas pero distintivas.
// El filtro de no-ambigüedad protege contra falsos positivos: si una FC matchea
// dos o más targets, no se mueve.
const RULES: Rule[] = [
  // ── COT ──
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

  // ── CIVIL ──
  { target: "LIII_T12", rama: "DERECHO_CIVIL", keywords: ["beneficio de separación"] },
  { target: "MENSAJE_BELLO", rama: "DERECHO_CIVIL", keywords: ["mensaje del código civil", "mensaje de bello", "andrés bello"] },

  // ── CPC LIBRO I ──
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

  // ── CPC LIBRO II ──
  { target: "CPC_LII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["jactancia"] },
  { target: "CPC_LII_T4", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas prejudiciales", "medida prejudicial probatoria", "medida prejudicial preparatoria"] },
  { target: "CPC_LII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas precautorias", "medida precautoria"] },
  { target: "CPC_LII_T10", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["término probatorio", "término especial de prueba", "20 días"] },
  { target: "CPC_LII_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación para oír sentencia", "medidas para mejor resolver"] },

  // ── CPC LIBRO III ──
  { target: "CPC_LIII_T2", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["obligación de hacer", "obligación de no hacer"] },
  { target: "CPC_LIII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["derecho legal de retención"] },
  { target: "CPC_LIII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación de evicción"] },
  { target: "CPC_LIII_T7", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio especial de arrendamiento", "ley 18.101"] },
  { target: "CPC_LIII_T8", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio arbitral", "procedimiento arbitral"] },
  { target: "CPC_LIII_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juez partidor", "juicio de partición", "laudo y ordenata"] },
  { target: "CPC_LIII_T14", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["menor cuantía", "mínima cuantía"] },
  { target: "CPC_LIII_T16", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio de hacienda"] },

  // ── CPC LIBRO IV ──
  { target: "CPC_LIV_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["posesión efectiva"] },
  { target: "CPC_LIV_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["declaración de derecho real"] },
];

interface Item { id: string; titulo: string | null; text: string }

async function classifyAndReassign() {
  const stats: Record<string, { fc: number; mcq: number; vf: number; def: number; fb: number; ei: number; os: number; mc: number; cp: number; dj: number; tl: number }> = {};
  const init = () => ({ fc: 0, mcq: 0, vf: 0, def: 0, fb: 0, ei: 0, os: 0, mc: 0, cp: 0, dj: 0, tl: 0 });

  // Build kw → target reverse map for ambiguity check
  const kwToTargets: Map<string, Set<string>> = new Map();
  for (const r of RULES) {
    for (const k of r.keywords) {
      const set = kwToTargets.get(k.toLowerCase()) ?? new Set();
      set.add(r.target);
      kwToTargets.set(k.toLowerCase(), set);
    }
  }

  // Helper: classify a single record by checking which target's keywords match
  function classify(rama: string, text: string): string | null {
    const t = text.toLowerCase();
    const matched: Set<string> = new Set();
    for (const r of RULES) {
      if (r.rama !== rama) continue;
      for (const k of r.keywords) {
        if (t.includes(k.toLowerCase())) {
          matched.add(r.target);
          break;
        }
      }
    }
    if (matched.size === 1) return [...matched][0];
    return null; // 0 or ambiguous → skip
  }

  // ── Flashcard ──
  console.log("Procesando Flashcards...");
  const fcs = await prisma.flashcard.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, front: true, back: true, rama: true },
  });
  for (const f of fcs) {
    const tgt = classify(f.rama, `${f.front} ${f.back}`);
    if (tgt) {
      await prisma.flashcard.update({ where: { id: f.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].fc++;
    }
  }

  // ── MCQ ──
  console.log("Procesando MCQs...");
  const mcqs = await prisma.mCQ.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, question: true, explanation: true, rama: true },
  });
  for (const m of mcqs) {
    const tgt = classify(m.rama, `${m.question} ${m.explanation ?? ""}`);
    if (tgt) {
      await prisma.mCQ.update({ where: { id: m.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].mcq++;
    }
  }

  // ── TrueFalse ──
  console.log("Procesando V/F...");
  const vfs = await prisma.trueFalse.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, statement: true, explanation: true, rama: true },
  });
  for (const v of vfs) {
    const tgt = classify(v.rama, `${v.statement} ${v.explanation ?? ""}`);
    if (tgt) {
      await prisma.trueFalse.update({ where: { id: v.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].vf++;
    }
  }

  // ── Definicion (string libro/titulo) ──
  console.log("Procesando Definiciones...");
  const defs = await prisma.definicion.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, concepto: true, definicion: true, rama: true },
  });
  for (const d of defs) {
    const tgt = classify(d.rama, `${d.concepto} ${d.definicion}`);
    if (tgt) {
      await prisma.definicion.update({ where: { id: d.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].def++;
    }
  }

  // ── FillBlank ──
  console.log("Procesando FillBlank...");
  const fbs = await prisma.fillBlank.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, textoConBlancos: true, explicacion: true, rama: true },
  });
  for (const f of fbs) {
    const tgt = classify(f.rama, `${f.textoConBlancos} ${f.explicacion ?? ""}`);
    if (tgt) {
      await prisma.fillBlank.update({ where: { id: f.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].fb++;
    }
  }

  // ── ErrorIdentification ──
  console.log("Procesando ErrorIdentification...");
  const eis = await prisma.errorIdentification.findMany({
    where: { titulo: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, textoConErrores: true, explicacionGeneral: true, rama: true },
  });
  for (const e of eis) {
    const tgt = classify(e.rama, `${e.textoConErrores} ${e.explicacionGeneral ?? ""}`);
    if (tgt) {
      await prisma.errorIdentification.update({ where: { id: e.id }, data: { titulo: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].ei++;
    }
  }

  // ── tituloMateria models — uno por uno (selects distintos) ──
  console.log("Procesando OrderSequence...");
  const oss = await prisma.orderSequence.findMany({
    where: { tituloMateria: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, instruccion: true, explicacion: true, rama: true },
  });
  for (const r of oss) {
    const tgt = classify(r.rama, `${r.titulo} ${r.instruccion ?? ""} ${r.explicacion ?? ""}`);
    if (tgt) {
      await prisma.orderSequence.update({ where: { id: r.id }, data: { tituloMateria: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].os++;
    }
  }

  console.log("Procesando MatchColumns...");
  const mcs = await prisma.matchColumns.findMany({
    where: { tituloMateria: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, explicacion: true, rama: true },
  });
  for (const r of mcs) {
    const tgt = classify(r.rama, `${r.titulo} ${r.explicacion ?? ""}`);
    if (tgt) {
      await prisma.matchColumns.update({ where: { id: r.id }, data: { tituloMateria: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].mc++;
    }
  }

  console.log("Procesando CasoPractico...");
  const cps = await prisma.casoPractico.findMany({
    where: { tituloMateria: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, hechos: true, rama: true },
  });
  for (const r of cps) {
    const tgt = classify(r.rama, `${r.titulo} ${r.hechos}`);
    if (tgt) {
      await prisma.casoPractico.update({ where: { id: r.id }, data: { tituloMateria: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].cp++;
    }
  }

  console.log("Procesando DictadoJuridico...");
  const djs = await prisma.dictadoJuridico.findMany({
    where: { tituloMateria: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, textoCompleto: true, rama: true },
  });
  for (const r of djs) {
    const tgt = classify(r.rama, `${r.titulo} ${r.textoCompleto}`);
    if (tgt) {
      await prisma.dictadoJuridico.update({ where: { id: r.id }, data: { tituloMateria: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].dj++;
    }
  }

  console.log("Procesando Timeline...");
  const tls = await prisma.timeline.findMany({
    where: { tituloMateria: { in: [...GENERIC_SOURCES] } },
    select: { id: true, titulo: true, explicacion: true, rama: true },
  });
  for (const r of tls) {
    const tgt = classify(r.rama, `${r.titulo} ${r.explicacion ?? ""}`);
    if (tgt) {
      await prisma.timeline.update({ where: { id: r.id }, data: { tituloMateria: tgt } });
      stats[tgt] = stats[tgt] || init(); stats[tgt].tl++;
    }
  }

  // Print stats
  console.log("\n═══ REASSIGNMENT SUMMARY ═══\n");
  console.log("  TARGET            FC   MCQ   VF   DEF   FB   EI   OS   MC   CP   DJ   TL  TOTAL");
  let grand = 0;
  for (const [tgt, s] of Object.entries(stats).sort()) {
    const tot = s.fc + s.mcq + s.vf + s.def + s.fb + s.ei + s.os + s.mc + s.cp + s.dj + s.tl;
    grand += tot;
    console.log(`  ${tgt.padEnd(18)} ${String(s.fc).padStart(3)}   ${String(s.mcq).padStart(3)}  ${String(s.vf).padStart(3)}   ${String(s.def).padStart(3)}  ${String(s.fb).padStart(3)}  ${String(s.ei).padStart(3)}  ${String(s.os).padStart(3)}  ${String(s.mc).padStart(3)}  ${String(s.cp).padStart(3)}  ${String(s.dj).padStart(3)}  ${String(s.tl).padStart(3)}    ${tot}`);
  }
  console.log(`\n  TOTAL REASSIGNED: ${grand}`);
}

async function main() {
  await classifyAndReassign();
  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
