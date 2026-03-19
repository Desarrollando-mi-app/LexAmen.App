// ═══ CONFIGURACIÓN EL DIARIO ═══

export const ANALISIS_LIMITS = {
  mini: {
    label: "Mini-Análisis",
    maxHechos: 500,
    maxRatio: 500,
    maxOpinion: 500,
    maxResumen: 300,
    maxTotal: 2500,
    xp: 10,
    tiempoEstimado: "15 minutos",
    descripcion: "Análisis breve, ideal para empezar a publicar",
  },
  completo: {
    label: "Análisis Completo",
    maxHechos: 2000,
    maxRatio: 3500,
    maxOpinion: 0, // sin límite
    maxResumen: 1000,
    maxTotal: 0, // sin límite
    xp: 25,
    tiempoEstimado: "1-2 horas",
    descripcion: "Análisis profundo con argumentación extensa",
  },
} as const;

export type AnalisisFormato = keyof typeof ANALISIS_LIMITS;

// XP para Fallo de la Semana
export const XP_FALLO_SEMANA_PARTICIPAR = 5;
export const XP_FALLO_SEMANA_1 = 10;
export const XP_FALLO_SEMANA_2 = 7;
export const XP_FALLO_SEMANA_3 = 5;

// Tribunales para el selector
export const TRIBUNALES = [
  "Corte Suprema",
  "C.A. de Arica",
  "C.A. de Iquique",
  "C.A. de Antofagasta",
  "C.A. de Copiapó",
  "C.A. de La Serena",
  "C.A. de Valparaíso",
  "C.A. de Santiago",
  "C.A. de San Miguel",
  "C.A. de Rancagua",
  "C.A. de Talca",
  "C.A. de Chillán",
  "C.A. de Concepción",
  "C.A. de Temuco",
  "C.A. de Valdivia",
  "C.A. de Puerto Montt",
  "C.A. de Coyhaique",
  "C.A. de Punta Arenas",
  "Juzgado Civil",
  "Juzgado de Letras",
  "Juzgado de Garantía",
  "Tribunal Oral en lo Penal",
  "Tribunal de Familia",
  "Juzgado de Policía Local",
  "Tribunal Constitucional",
  "Otro",
];
