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
}

main()
  .catch((e) => {
    console.error("❌ Error ejecutando seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
