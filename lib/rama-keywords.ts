/**
 * Fase 7 — Diccionarios de keywords por rama.
 * ────────────────────────────────────────────
 * Usado por `scripts/fase7-detect.ts` para detectar ejercicios que pueden aplicar
 * a una rama distinta de su `rama` asignada actualmente.
 *
 * Criterio: términos distintivos del derecho chileno. Se evita vocabulario
 * común ("ley", "artículo", "norma") que no discrimina rama.
 *
 * Fuente: manuales clásicos + texto del CC/CPC/COT. Auditado manualmente.
 */

export const RAMA_KEYWORDS: Record<string, ReadonlyArray<string>> = {
  DERECHO_CIVIL: [
    // Dominio y posesión
    "prescripción adquisitiva", "prescripción extintiva", "dominio", "posesión",
    "mera tenencia", "usufructo", "uso y habitación", "servidumbre", "hipoteca",
    "prenda", "fideicomiso", "tradición", "accesión", "reivindicatoria",
    "usucapión", "nudo propietario", "usufructuario",
    // Obligaciones y contratos civiles
    "novación", "compensación", "remisión", "confusión", "dación en pago",
    "arras", "cláusula penal", "mora del acreedor", "mora del deudor",
    "obligación alternativa", "obligación facultativa", "obligación divisible",
    "solidaridad pasiva", "solidaridad activa", "indivisibilidad",
    "compraventa", "permuta", "cesión", "arrendamiento", "comodato", "mutuo",
    "depósito", "mandato", "fianza", "hipoteca", "anticresis", "transacción",
    "donación entre vivos", "sociedad civil",
    // Familia
    "esponsales", "matrimonio civil", "nulidad matrimonial", "divorcio vincular",
    "separación de bienes", "sociedad conyugal", "participación en los gananciales",
    "capitulaciones matrimoniales", "filiación", "patria potestad", "autoridad parental",
    "guardas", "curaduría", "tutor", "adopción", "bienes familiares",
    // Sucesiones
    "heredero", "legatario", "testamento", "herencia yacente", "partición de herencia",
    "desheredamiento", "acervo hereditario", "legítima", "mejoras", "cuarta de libre disposición",
    "representación sucesoria", "transmisión hereditaria", "beneficio de inventario",
    "cesión del derecho real de herencia",
    // Personas
    "capacidad de goce", "capacidad de ejercicio", "persona natural",
    "domicilio civil", "estado civil", "atributos de la personalidad",
    "muerte presunta",
  ],

  DERECHO_PROCESAL_CIVIL: [
    // Actos de procedimiento
    "demanda", "contestación de la demanda", "réplica", "dúplica", "emplazamiento",
    "notificación personal", "notificación por cédula", "notificación por estado diario",
    "notificación por avisos", "notificación tácita", "notificación ficta",
    "rebeldía procesal", "allanamiento", "contumacia",
    // Prueba
    "carga de la prueba", "onus probandi", "medios de prueba", "prueba instrumental",
    "prueba testimonial", "prueba confesional", "confesión provocada", "absolución de posiciones",
    "prueba pericial", "peritaje", "inspección personal del tribunal",
    "tacha de testigo", "contraprueba",
    // Incidentes y nulidades
    "incidente", "incidente de nulidad", "nulidad procesal", "reposición",
    "abandono del procedimiento", "desistimiento de la demanda", "acumulación de autos",
    // Recursos
    "recurso de apelación", "recurso de casación en la forma", "recurso de casación en el fondo",
    "recurso de queja", "recurso de hecho", "recurso de amparo económico",
    "orden de no innovar", "consulta",
    // Procedimientos
    "juicio ordinario de mayor cuantía", "juicio sumario", "juicio ejecutivo",
    "gestión preparatoria", "procedimiento arbitral", "procedimiento incidental",
    "actos judiciales no contenciosos",
    // Medidas cautelares
    "medida precautoria", "medida prejudicial precautoria", "secuestro",
    "retención de bienes", "prohibición de celebrar actos y contratos",
    "nombramiento de interventor",
    // Ejecución
    "título ejecutivo", "mandamiento de ejecución y embargo", "requerimiento de pago",
    "embargo", "depositario provisional", "tercería de dominio", "tercería de posesión",
    "tercería de prelación", "tercería de pago", "remate", "subasta pública",
    "cédula de remate", "consignación",
    // Partes y representación procesal
    "mandato judicial", "patrocinio", "procurador del número", "poder especial",
    "poder general para pleitos", "legitimación procesal",
  ],

  DERECHO_ORGANICO: [
    // Tribunales
    "corte suprema", "corte de apelaciones", "juzgado de letras", "juzgado de garantía",
    "tribunal oral en lo penal", "juzgado de familia", "juzgado laboral",
    "juzgado de policía local", "tribunal arbitral", "jueces árbitros", "juez árbitro",
    "árbitro de derecho", "árbitro arbitrador", "árbitro mixto",
    "tribunales ordinarios", "tribunales especiales", "tribunales arbitrales",
    // Organización interna
    "sala", "pleno", "ministro", "ministro instructor", "juez titular", "juez suplente",
    "juez subrogante", "juez interino", "relator", "fiscal judicial", "defensor público",
    // Jurisdicción y competencia
    "jurisdicción", "competencia absoluta", "competencia relativa", "cuantía",
    "fuero personal", "fuero real", "prórroga de competencia", "conflicto de competencia",
    "contienda de competencia", "declinatoria", "inhibitoria", "reglas de la competencia",
    // Auxiliares de la administración de justicia
    "receptor judicial", "procurador del número", "notario público", "conservador de bienes raíces",
    "conservador de comercio", "archivero judicial", "bibliotecario judicial",
    "asistente social judicial",
    // Funciones administrativas
    "turno", "distribución de causas", "subrogación", "integración de sala",
    "recusación", "implicancia", "causales de inhabilidad",
    // Carrera funcionaria
    "nombramiento judicial", "calificación funcionaria", "escalafón primario",
    "escalafón secundario", "antigüedad judicial", "ternas", "quinas",
    // Supervigilancia y disciplina
    "supervigilancia correccional", "jurisdicción disciplinaria", "queja disciplinaria",
    "visita ordinaria", "visita extraordinaria",
  ],
};

export const RAMAS = Object.keys(RAMA_KEYWORDS);

/**
 * Cuenta ocurrencias de keywords de cada rama en un texto dado.
 * Devuelve un Record<rama, hits>. Matching case-insensitive, multi-word.
 *
 * Normaliza "decreto ley", "dl", etc. No intenta stemming (el español legal
 * es suficientemente distintivo con matching literal de frases).
 */
export function countKeywordHits(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const result: Record<string, number> = {};
  for (const rama of RAMAS) {
    let hits = 0;
    for (const kw of RAMA_KEYWORDS[rama]) {
      // Contamos TODAS las ocurrencias (no solo 1 por keyword)
      const re = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
      const matches = lower.match(re);
      if (matches) hits += matches.length;
    }
    result[rama] = hits;
  }
  return result;
}

/**
 * Cuenta keywords ÚNICOS (distintas frases) matcheadas de cada rama.
 * Es más robusto que countKeywordHits cuando un texto repite la misma keyword.
 */
export function countUniqueKeywords(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const result: Record<string, number> = {};
  for (const rama of RAMAS) {
    let unique = 0;
    for (const kw of RAMA_KEYWORDS[rama]) {
      const re = new RegExp(`\\b${kw.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
      if (re.test(lower)) unique++;
    }
    result[rama] = unique;
  }
  return result;
}
