/**
 * Feature descriptions for info tooltips across the app.
 * Each entry has a title and description.
 */

export const FEATURE_INFO = {
  // Study modules
  flashcards: {
    title: "Flashcards",
    description: "Tarjetas de estudio con repetición espaciada SM-2. El algoritmo calcula cuándo necesitas repasar cada concepto para maximizar la retención a largo plazo.",
  },
  mcq: {
    title: "Preguntas MCQ",
    description: "Preguntas de selección múltiple con 4 opciones. Cada respuesta incluye una explicación doctrinal para reforzar el aprendizaje.",
  },
  vf: {
    title: "Verdadero / Falso",
    description: "Evalúa si afirmaciones jurídicas son verdaderas o falsas. Entrena tu capacidad de detectar errores en enunciados legales.",
  },
  definiciones: {
    title: "Definiciones",
    description: "Asocia términos jurídicos con sus definiciones correctas. Fortalece tu vocabulario técnico legal.",
  },
  completarEspacios: {
    title: "Completar Espacios",
    description: "Completa frases legales con la palabra o artículo correcto. Ejercita el recuerdo activo de normas.",
  },
  identificarErrores: {
    title: "Identificar Errores",
    description: "Encuentra errores deliberados en textos jurídicos. Desarrolla pensamiento crítico y precisión legal.",
  },
  ordenarSecuencias: {
    title: "Ordenar Secuencias",
    description: "Ordena los pasos de procedimientos legales en el orden correcto. Comprende procesos y plazos.",
  },
  relacionarColumnas: {
    title: "Relacionar Columnas",
    description: "Conecta conceptos con sus definiciones o artículos. Refuerza asociaciones entre ideas jurídicas.",
  },
  casosPracticos: {
    title: "Casos Prácticos",
    description: "Analiza mini-casos con 3 preguntas progresivas: identifica el problema, encuentra la norma y resuelve.",
  },
  dictado: {
    title: "Dictado Jurídico",
    description: "Escucha un artículo del código por audio y escríbelo. Entrena precisión y memorización auditiva.",
  },
  lineaTiempo: {
    title: "Líneas de Tiempo",
    description: "Ubica eventos y plazos procesales en su posición temporal correcta.",
  },
  simulacro: {
    title: "Simulacro Oral",
    description: "Practica tu examen de grado con 5 interrogadores virtuales con personalidades distintas y dificultad adaptativa.",
  },

  // Dashboard sections
  progreso: {
    title: "Tu Progreso",
    description: "Muestra qué porcentaje del temario has cubierto, basado en los títulos del Índice Maestro donde has respondido correctamente.",
  },
  liga: {
    title: "Liga Semanal",
    description: "Compite semanalmente con otros estudiantes de tu nivel. Los mejores ascienden de grado.",
  },
  ranking: {
    title: "Ranking",
    description: "Tu posición nacional, regional y por facultad basada en tu XP acumulado.",
  },
  racha: {
    title: "Racha de Estudio",
    description: "Días consecutivos que has estudiado. Mantén tu racha para ganar XP bonus.",
  },
  insignias: {
    title: "Insignias",
    description: "Logros desbloqueables por hitos de estudio, competencia y publicación.",
  },
  causas: {
    title: "Causas",
    description: "Desafíos 1v1 o grupales donde compites respondiendo preguntas contra otros estudiantes en tiempo real.",
  },
  diario: {
    title: "El Diario",
    description: "Espacio de publicación académica: reflexiones breves, análisis de sentencias, ensayos y debates jurídicos.",
  },
  sala: {
    title: "La Sala",
    description: "Tablón donde se ofrecen y buscan ayudantías. Conecta tutores con estudiantes.",
  },
  expediente: {
    title: "Expediente Abierto",
    description: "Debate semanal: la comunidad analiza un caso sin respuesta correcta. Elige bando y argumenta.",
  },
  noticias: {
    title: "Noticias Jurídicas",
    description: "Noticias jurídicas recopiladas de fuentes oficiales: BCN, Poder Judicial, Tribunal Constitucional.",
  },
  competencias: {
    title: "Mapa de Competencias",
    description: "Gráfico radar que muestra tu dominio relativo en cada libro de los 3 códigos.",
  },
  calendario: {
    title: "Actividad",
    description: "Visualización de tu actividad diaria de estudio en los últimos 90 días.",
  },
} as const;
