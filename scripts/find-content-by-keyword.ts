/**
 * Buscar ejercicios bajo títulos genéricos cuyo contenido pertenece a uno
 * de los 52 títulos faltantes.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// títulos válidos del curriculum (los que YA tienen contenido o existen)
const VALID_TITULOS = new Set([
  "TP_1","TP_2","TP_3","TP_4","TP_5","TP_6",
  "LI_T1","LI_T2","LI_T3","LI_T4","LI_T5","LI_T6","LI_T7","LI_T8","LI_T9","LI_T10","LI_T11","LI_T12","LI_T13","LI_T14","LI_T15","LI_T16","LI_T17","LI_T18","LI_T19","LI_T20","LI_T21","LI_T22","LI_T23","LI_T24","LI_T25","LI_T26","LI_T27","LI_T28","LI_T29","LI_T30","LI_T31","LI_T32","LI_T33",
  "LII_T1","LII_T2","LII_T3","LII_T4","LII_T5","LII_T6","LII_T7","LII_T8","LII_T9","LII_T10","LII_T11","LII_T12","LII_T13","LII_T14",
  "LIII_T1","LIII_T2","LIII_T3","LIII_T4","LIII_T5","LIII_T6","LIII_T7","LIII_T8","LIII_T9","LIII_T10","LIII_T11","LIII_T13",
  "LIV_T1","LIV_T2","LIV_T3","LIV_T4","LIV_T5","LIV_T6","LIV_T7","LIV_T8","LIV_T9","LIV_T10","LIV_T11","LIV_T12","LIV_T13","LIV_T14","LIV_T15","LIV_T16","LIV_T17","LIV_T18","LIV_T19","LIV_T20","LIV_T21","LIV_T22","LIV_T22A","LIV_T23","LIV_T24","LIV_T25","LIV_T26","LIV_T27","LIV_T28","LIV_T29","LIV_T30","LIV_T31","LIV_T32","LIV_T33","LIV_T34","LIV_T35","LIV_T36","LIV_T37","LIV_T38","LIV_T39","LIV_T40","LIV_T41","LIV_T42","LIV_TFINAL",
  "CPC_LI_T1","CPC_LI_T2","CPC_LI_T3","CPC_LI_T4","CPC_LI_T5","CPC_LI_T6","CPC_LI_T9","CPC_LI_T10","CPC_LI_T15","CPC_LI_T16","CPC_LI_T17",
  "CPC_LII_T1","CPC_LII_T2","CPC_LII_T6","CPC_LII_T7","CPC_LII_T8","CPC_LII_T9","CPC_LII_T11",
  "CPC_LIII_T1","CPC_LIII_T4","CPC_LIII_T6","CPC_LIII_T11","CPC_LIII_T17","CPC_LIII_T18","CPC_LIII_T19","CPC_LIII_T20",
  "CPC_LIV_T1","CPC_LIV_T2","CPC_LIV_T4","CPC_LIV_T5","CPC_LIV_T7","CPC_LIV_T8","CPC_LIV_T13",
  "COT_T1","COT_T3","COT_T7","COT_T11","COT_T12",
]);

interface Search {
  target: string;
  rama: string;
  keywords: string[]; // plain substrings (case-insensitive contains)
}

const SEARCHES: Search[] = [
  // ── COT ──
  { target: "COT_T2", rama: "DERECHO_ORGANICO", keywords: ["juzgado de garantía", "juzgados de garantía", "tribunal oral", "tribunales orales", "juicio oral en lo penal"] },
  { target: "COT_T4", rama: "DERECHO_ORGANICO", keywords: ["tribunal unipersonal", "presidente de la corte"] },
  { target: "COT_T5", rama: "DERECHO_ORGANICO", keywords: ["corte de apelaciones", "cortes de apelaciones"] },
  { target: "COT_T6", rama: "DERECHO_ORGANICO", keywords: ["corte suprema"] },
  { target: "COT_T6B", rama: "DERECHO_ORGANICO", keywords: ["audiencia remota", "audiencia semipresencial", "vía remota"] },
  { target: "COT_T8", rama: "DERECHO_ORGANICO", keywords: ["subrogación e integración", "subrogación del juez"] },
  { target: "COT_T9", rama: "DERECHO_ORGANICO", keywords: ["jueces árbitros", "árbitro arbitrador", "árbitro de derecho", "tribunal arbitral"] },
  { target: "COT_T10", rama: "DERECHO_ORGANICO", keywords: ["escalafón judicial", "nombramiento de magistrados"] },
  { target: "COT_T13", rama: "DERECHO_ORGANICO", keywords: ["oficial de secretaría", "oficiales de secretaría", "empleados u oficiales"] },
  { target: "COT_T14", rama: "DERECHO_ORGANICO", keywords: ["corporación administrativa del poder judicial", "CAPJ"] },
  { target: "COT_T15", rama: "DERECHO_ORGANICO", keywords: ["los abogados", "art. 520", "requisitos para ser abogado"] },
  { target: "COT_T16", rama: "DERECHO_ORGANICO", keywords: ["jurisdicción disciplinaria", "recurso de queja", "facultades disciplinarias"] },
  { target: "COT_T17", rama: "DERECHO_ORGANICO", keywords: ["asistencia judicial", "privilegio de pobreza"] },
  { target: "COT_TFINAL", rama: "DERECHO_ORGANICO", keywords: ["disposiciones derogadas"] },

  // ── CIVIL ──
  { target: "LIII_T12", rama: "DERECHO_CIVIL", keywords: ["beneficio de separación", "art. 1378", "art. 1385"] },
  { target: "MENSAJE_BELLO", rama: "DERECHO_CIVIL", keywords: ["mensaje del código civil", "andrés bello", "mensaje de bello"] },

  // ── CPC LIBRO I ──
  { target: "CPC_LI_T7", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["actuaciones judiciales", "días hábiles judiciales"] },
  { target: "CPC_LI_T7B", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["notificación electrónica", "tramitación digital", "ley 20.886"] },
  { target: "CPC_LI_T8", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["rebeldía", "rebeldías", "art. 78 cpc"] },
  { target: "CPC_LI_T11", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["cuestiones de competencia", "declinatoria", "inhibitoria"] },
  { target: "CPC_LI_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["implicancia", "recusación", "art. 113 cpc", "art. 196 cot"] },
  { target: "CPC_LI_T13", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["privilegio de pobreza"] },
  { target: "CPC_LI_T14", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["costas procesales", "costas personales", "tasación de costas"] },
  { target: "CPC_LI_T18", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["recurso de apelación", "efecto devolutivo", "efecto suspensivo", "art. 186 cpc"] },
  { target: "CPC_LI_T19", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["cumplimiento incidental", "ejecución de las resoluciones", "art. 231 cpc"] },
  { target: "CPC_LI_T20", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["exhortos", "exhorto internacional"] },

  // ── CPC LIBRO II ──
  { target: "CPC_LII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["jactancia", "art. 269 cpc"] },
  { target: "CPC_LII_T4", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas prejudiciales", "art. 273 cpc", "art. 281 cpc"] },
  { target: "CPC_LII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["medidas precautorias", "art. 290 cpc", "secuestro y retención"] },
  { target: "CPC_LII_T10", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["término probatorio", "20 días probatorio", "art. 327 cpc"] },
  { target: "CPC_LII_T12", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación para oír sentencia", "medidas para mejor resolver", "art. 159 cpc"] },

  // ── CPC LIBRO III ──
  { target: "CPC_LIII_T2", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["obligación de hacer", "obligación de no hacer", "art. 530 cpc"] },
  { target: "CPC_LIII_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["derecho legal de retención", "art. 545 cpc"] },
  { target: "CPC_LIII_T5", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["citación de evicción", "art. 584 cpc"] },
  { target: "CPC_LIII_T7", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio de arrendamiento", "ley 18.101"] },
  { target: "CPC_LIII_T8", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio arbitral", "procedimiento arbitral", "art. 628 cpc"] },
  { target: "CPC_LIII_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juez partidor", "juicio de partición", "laudo y ordenata", "art. 646 cpc"] },
  { target: "CPC_LIII_T14", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["menor cuantía", "mínima cuantía", "art. 698 cpc"] },
  { target: "CPC_LIII_T16", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["juicio de hacienda", "art. 748 cpc"] },

  // ── CPC LIBRO IV ──
  { target: "CPC_LIV_T3", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["posesión efectiva", "art. 877 cpc"] },
  { target: "CPC_LIV_T6", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["nombramiento de tutor", "designación de curador"] },
  { target: "CPC_LIV_T9", rama: "DERECHO_PROCESAL_CIVIL", keywords: ["declaración de derecho real", "art. 840 cpc"] },
];

async function main() {
  console.log("═══ BÚSQUEDA POR CONTENIDO BAJO TÍTULOS GENÉRICOS ═══\n");

  const summary: Array<{ target: string; flash: number; mcq: number; vf: number; def: number; samples: string[] }> = [];

  for (const s of SEARCHES) {
    let flash = 0, mcq = 0, vf = 0, def = 0;
    const samples: string[] = [];

    for (const kw of s.keywords) {
      // Flashcards
      const fc = await prisma.flashcard.findMany({
        where: { rama: s.rama as never, OR: [{ front: { contains: kw, mode: "insensitive" } }, { back: { contains: kw, mode: "insensitive" } }] },
        select: { id: true, titulo: true, front: true },
      });
      const fcWrong = fc.filter((f) => f.titulo !== s.target && !VALID_TITULOS.has(f.titulo));
      flash += fcWrong.length;
      if (fcWrong.length > 0 && samples.length < 3) {
        samples.push(`FC[${fcWrong[0].titulo}]: ${fcWrong[0].front.slice(0, 70)}`);
      }
      // MCQs
      const mc = await prisma.mCQ.findMany({
        where: { rama: s.rama as never, OR: [{ question: { contains: kw, mode: "insensitive" } }, { explanation: { contains: kw, mode: "insensitive" } }] },
        select: { id: true, titulo: true, question: true },
      });
      const mcWrong = mc.filter((m) => m.titulo !== s.target && !VALID_TITULOS.has(m.titulo));
      mcq += mcWrong.length;
      // V/F
      const vfs = await prisma.trueFalse.findMany({
        where: { rama: s.rama as never, OR: [{ statement: { contains: kw, mode: "insensitive" } }] },
        select: { id: true, titulo: true },
      });
      vf += vfs.filter((v) => v.titulo !== s.target && !VALID_TITULOS.has(v.titulo)).length;
      // Definicion
      const dfs = await prisma.definicion.findMany({
        where: { rama: s.rama, OR: [{ concepto: { contains: kw, mode: "insensitive" } }, { definicion: { contains: kw, mode: "insensitive" } }] },
        select: { id: true, titulo: true },
      });
      def += dfs.filter((d) => d.titulo !== s.target && (!d.titulo || !VALID_TITULOS.has(d.titulo))).length;
    }

    if (flash + mcq + vf + def > 0) {
      summary.push({ target: s.target, flash, mcq, vf, def, samples });
    }
  }

  console.log("Targets con contenido bajo título genérico:\n");
  console.log("  TARGET            FC   MCQ   VF   DEF");
  for (const r of summary.sort((a, b) => (b.flash + b.mcq + b.vf + b.def) - (a.flash + a.mcq + a.vf + a.def))) {
    console.log(`  ${r.target.padEnd(18)} ${String(r.flash).padStart(3)}  ${String(r.mcq).padStart(3)}  ${String(r.vf).padStart(3)}  ${String(r.def).padStart(3)}`);
    if (r.samples.length > 0) console.log(`    e.g. ${r.samples[0]}`);
  }
  if (summary.length === 0) console.log("  (sin coincidencias)");

  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
