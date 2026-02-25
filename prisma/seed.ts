import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Insertando flashcards de ejemplo...");

  const flashcards = await prisma.flashcard.createMany({
    data: [
      // ─── Civil / ACTO_JURIDICO (8) ───────────────────────────
      {
        front: "¿Qué es un acto jurídico?",
        back: "Es una manifestación de voluntad destinada a crear, modificar o extinguir derechos y obligaciones, realizada con la intención de producir efectos jurídicos.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son los requisitos de existencia del acto jurídico?",
        back: "Voluntad, objeto, causa y solemnidades (cuando la ley las exige como requisito de existencia).",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son los requisitos de validez del acto jurídico?",
        back: "Voluntad exenta de vicios, objeto lícito, causa lícita y capacidad de las partes.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son los vicios de la voluntad?",
        back: "Error, fuerza y dolo (Arts. 1451-1459 del Código Civil). El error vicia el consentimiento cuando recae sobre la identidad de la cosa, la sustancia o las cualidades esenciales.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Qué es el objeto ilícito?",
        back: "Es aquel que contraviene el derecho público chileno, la ley, las buenas costumbres o el orden público (Art. 1462 y ss. del Código Civil). Su sanción es la nulidad absoluta.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Cuál es la diferencia entre un acto jurídico unilateral y uno bilateral?",
        back: "Unilateral: requiere la manifestación de una sola voluntad para nacer (ej: testamento). Bilateral: requiere el acuerdo de dos o más voluntades (ej: contrato de compraventa).",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Qué es la causa en el acto jurídico?",
        back: "Es el motivo que induce al acto o contrato (Art. 1467 CC). No puede haber obligación sin una causa real y lícita, pero no es necesario expresarla.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },
      {
        front: "¿Cuál es la diferencia entre nulidad absoluta y relativa?",
        back: "Absoluta: por objeto/causa ilícito, omisión de solemnidad esencial o incapacidad absoluta. Puede ser declarada de oficio. Relativa: por vicios del consentimiento o incapacidad relativa. Solo puede alegarla el afectado.",
        tipo: "CIVIL",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        nivel: "BASICO",
      },

      // ─── Procesal / JURISDICCION (7) ─────────────────────────
      {
        front: "¿Qué es la jurisdicción?",
        back: "Es la facultad de conocer las causas civiles y criminales, de juzgarlas y de hacer ejecutar lo juzgado. Pertenece exclusivamente a los tribunales establecidos por la ley (Art. 76 CPR, Art. 1 COT).",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son los momentos jurisdiccionales?",
        back: "Conocimiento (fase de discusión y prueba), juzgamiento (dictación de sentencia) y ejecución (cumplimiento de lo resuelto).",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son las características de la jurisdicción?",
        back: "Es un poder-deber del Estado, es unitaria e indivisible, es improrrogable (a diferencia de la competencia relativa), es indelegable, genera cosa juzgada y tiene carácter temporal.",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Cuál es la diferencia entre jurisdicción y competencia?",
        back: "Jurisdicción: es el poder genérico de administrar justicia que tienen todos los tribunales. Competencia: es la medida o porción de jurisdicción asignada a cada tribunal para conocer de determinados asuntos.",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Qué son los equivalentes jurisdiccionales?",
        back: "Son actos procesales o extraprocesales que producen el mismo efecto que una sentencia firme (cosa juzgada): transacción, conciliación, avenimiento, sentencia extranjera y compromiso arbitral.",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Cuáles son las bases fundamentales de la jurisdicción?",
        back: "Legalidad, independencia, inamovilidad, responsabilidad, publicidad, territorialidad, inavocabilidad, sedentariedad y gratuidad.",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
      {
        front: "¿Qué es el principio de inexcusabilidad?",
        back: "Los tribunales no pueden excusarse de ejercer su autoridad, ni aun por falta de ley que resuelva la contienda o asunto sometido a su decisión (Art. 76 inc. 2° CPR, Art. 10 inc. 2° COT).",
        tipo: "PROCESAL",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        nivel: "BASICO",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ ${flashcards.count} flashcards insertadas exitosamente.`);

  // ─── MCQs de ejemplo ─────────────────────────────────────

  console.log("🌱 Insertando MCQs de ejemplo...");

  const mcqs = await prisma.mCQ.createMany({
    data: [
      // ─── Civil / ACTO_JURIDICO (5) ───────────────────────
      {
        question: "¿Cuáles son los requisitos de existencia del acto jurídico según la doctrina chilena?",
        optionA: "Voluntad, objeto, causa y solemnidades cuando la ley las exige",
        optionB: "Capacidad, voluntad, objeto y causa",
        optionC: "Voluntad, objeto lícito, causa lícita y capacidad",
        optionD: "Consentimiento, objeto, causa y formalidades",
        correctOption: "A",
        explanation: "Los requisitos de existencia son: voluntad (o consentimiento en actos bilaterales), objeto, causa, y solemnidades cuando la ley las exige como requisito de existencia. La capacidad es requisito de validez, no de existencia.",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        tipo: "CIVIL",
        nivel: "BASICO",
      },
      {
        question: "¿Cuál es la sanción para un acto jurídico con objeto ilícito?",
        optionA: "Nulidad relativa",
        optionB: "Inexistencia",
        optionC: "Nulidad absoluta",
        optionD: "Inoponibilidad",
        correctOption: "C",
        explanation: "El objeto ilícito es causal de nulidad absoluta (Art. 1682 del Código Civil). La nulidad absoluta puede ser declarada de oficio por el juez cuando aparece de manifiesto en el acto o contrato.",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        tipo: "CIVIL",
        nivel: "BASICO",
      },
      {
        question: "¿Cuáles son los vicios del consentimiento en el Código Civil chileno?",
        optionA: "Error, fuerza, dolo y lesión",
        optionB: "Error, fuerza y dolo",
        optionC: "Error, violencia, dolo y simulación",
        optionD: "Error, intimidación, dolo y fraude",
        correctOption: "B",
        explanation: "Los vicios del consentimiento son error, fuerza y dolo (Arts. 1451-1459 CC). La lesión enorme no es un vicio del consentimiento en Chile, sino una causal objetiva de rescisión en ciertos contratos.",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        tipo: "CIVIL",
        nivel: "BASICO",
      },
      {
        question: "¿Qué diferencia un acto jurídico unilateral de uno bilateral?",
        optionA: "El unilateral genera obligaciones para una parte; el bilateral para ambas",
        optionB: "El unilateral requiere una sola voluntad para nacer; el bilateral requiere dos o más",
        optionC: "El unilateral no requiere causa; el bilateral sí",
        optionD: "El unilateral es siempre gratuito; el bilateral siempre oneroso",
        correctOption: "B",
        explanation: "La clasificación atiende al número de voluntades necesarias para que el acto nazca a la vida del derecho. El testamento es unilateral (una voluntad); la compraventa es bilateral (dos voluntades).",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        tipo: "CIVIL",
        nivel: "BASICO",
      },
      {
        question: "¿Quién puede solicitar la declaración de nulidad absoluta?",
        optionA: "Solo la parte que sufrió el perjuicio",
        optionB: "Cualquier persona que tenga interés, el ministerio público y el juez de oficio",
        optionC: "Solo el ministerio público",
        optionD: "Solo el juez de oficio",
        correctOption: "B",
        explanation: "La nulidad absoluta puede y debe ser declarada de oficio por el juez cuando aparece de manifiesto en el acto, puede ser solicitada por el ministerio público y por cualquier persona que tenga interés en ello (Art. 1683 CC).",
        unidad: "DERECHO_CIVIL_1",
        materia: "TEORIA_DE_LA_LEY",
        submateria: "ACTO_JURIDICO",
        tipo: "CIVIL",
        nivel: "BASICO",
      },

      // ─── Procesal / JURISDICCION (5) ─────────────────────
      {
        question: "¿Cuáles son los momentos jurisdiccionales?",
        optionA: "Demanda, prueba y sentencia",
        optionB: "Conocimiento, juzgamiento y ejecución",
        optionC: "Inicio, tramitación y resolución",
        optionD: "Discusión, conciliación y fallo",
        correctOption: "B",
        explanation: "Los tres momentos de la jurisdicción son: conocimiento (fase de discusión y prueba), juzgamiento (dictación de sentencia) y ejecución (cumplimiento forzado de lo resuelto).",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        tipo: "PROCESAL",
        nivel: "BASICO",
      },
      {
        question: "¿Qué artículo de la Constitución consagra la jurisdicción en Chile?",
        optionA: "Artículo 19",
        optionB: "Artículo 73",
        optionC: "Artículo 76",
        optionD: "Artículo 82",
        correctOption: "C",
        explanation: "El Art. 76 de la Constitución Política de la República establece que la facultad de conocer las causas civiles y criminales, de resolverlas y de hacer ejecutar lo juzgado, pertenece exclusivamente a los tribunales establecidos por la ley.",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        tipo: "PROCESAL",
        nivel: "BASICO",
      },
      {
        question: "¿Cuál de las siguientes NO es una característica de la jurisdicción?",
        optionA: "Es improrrogable",
        optionB: "Genera cosa juzgada",
        optionC: "Es delegable a particulares",
        optionD: "Es un poder-deber del Estado",
        correctOption: "C",
        explanation: "La jurisdicción es indelegable; no puede ser transferida a particulares. Es un poder-deber del Estado, improrrogable (a diferencia de la competencia relativa) y genera cosa juzgada.",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        tipo: "PROCESAL",
        nivel: "BASICO",
      },
      {
        question: "¿Qué es el principio de inexcusabilidad?",
        optionA: "Los tribunales pueden rechazar casos sin fundamento legal",
        optionB: "Los tribunales no pueden excusarse de ejercer su autoridad, ni aun por falta de ley",
        optionC: "Los jueces están excusados de conocer asuntos fuera de su competencia",
        optionD: "Las partes no pueden excusarse de comparecer ante el tribunal",
        correctOption: "B",
        explanation: "El principio de inexcusabilidad (Art. 76 inc. 2° CPR, Art. 10 inc. 2° COT) obliga a los tribunales a resolver aun cuando no exista ley aplicable, recurriendo a los principios de equidad.",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        tipo: "PROCESAL",
        nivel: "BASICO",
      },
      {
        question: "¿Cuál es la diferencia fundamental entre jurisdicción y competencia?",
        optionA: "La jurisdicción se refiere a materias civiles; la competencia a materias penales",
        optionB: "La jurisdicción es el poder genérico de juzgar; la competencia es la porción asignada a cada tribunal",
        optionC: "La jurisdicción es territorial; la competencia es funcional",
        optionD: "No hay diferencia; son sinónimos",
        correctOption: "B",
        explanation: "La jurisdicción es el poder genérico de administrar justicia que tienen todos los tribunales. La competencia es la medida o porción de jurisdicción que corresponde a cada tribunal para conocer de determinados asuntos.",
        unidad: "DERECHO_PROCESAL_CIVIL_1",
        materia: "JURISDICCION_Y_COMPETENCIA",
        submateria: "JURISDICCION",
        tipo: "PROCESAL",
        nivel: "BASICO",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`✅ ${mcqs.count} MCQs insertadas exitosamente.`);
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
