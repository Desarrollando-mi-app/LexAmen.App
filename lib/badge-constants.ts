// ─── Constantes de Insignias (client-safe, sin imports de prisma) ──

// ─── Categorías ──────────────────────────────────────────

export type BadgeCategory =
  | "estudio"
  | "simulacro"
  | "rachas"
  | "causas"
  | "diario"
  | "comunidad"
  | "grados"
  | "xp"
  | "plan_estudios";

export const BADGE_CATEGORIES: Record<
  BadgeCategory,
  { label: string; emoji: string }
> = {
  estudio: { label: "Estudio", emoji: "📚" },
  simulacro: { label: "Simulacro Oral", emoji: "🎤" },
  rachas: { label: "Rachas", emoji: "🔥" },
  causas: { label: "Causas", emoji: "⚔" },
  diario: { label: "El Diario", emoji: "📰" },
  comunidad: { label: "Comunidad", emoji: "👥" },
  grados: { label: "Grados y Niveles", emoji: "⚜" },
  xp: { label: "Experiencia", emoji: "💎" },
  plan_estudios: { label: "Plan de Estudios", emoji: "📋" },
};

// ─── BadgeRule ────────────────────────────────────────────

export interface BadgeRule {
  slug: BadgeSlug;
  label: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "special" | "unique";
  description: string;
  category: BadgeCategory;
  check: {
    type: string;
    threshold?: number;
    minAttempts?: number;
    minRating?: number;
  };
}

// ─── BadgeSlug ───────────────────────────────────────────

export type BadgeSlug =
  // Grados (33)
  | "GRADO_01_OYENTE"
  | "GRADO_02_ALUMNO_REGULAR"
  | "GRADO_03_EGRESADO"
  | "GRADO_04_POSTULANTE"
  | "GRADO_05_PRACTICANTE"
  | "GRADO_06_PROCURADOR"
  | "GRADO_07_RECEPTOR"
  | "GRADO_08_OFICIAL_SALA"
  | "GRADO_09_DEFENSOR"
  | "GRADO_10_ABOGADO"
  | "GRADO_11_PATROCINANTE"
  | "GRADO_12_RELATOR"
  | "GRADO_13_ARBITRO"
  | "GRADO_14_MAESTRO_FORO"
  | "GRADO_15_JUEZ_SUPLENTE"
  | "GRADO_16_JUEZ_LETRAS"
  | "GRADO_17_JUEZ_GARANTIA"
  | "GRADO_18_JUEZ_ORAL"
  | "GRADO_19_SECRETARIO_CORTE"
  | "GRADO_20_FISCAL_ADJUNTO"
  | "GRADO_21_FISCAL_REGIONAL"
  | "GRADO_22_MINISTRO_SUPLENTE"
  | "GRADO_23_MINISTRO_CORTE"
  | "GRADO_24_PRESIDENTE_SALA"
  | "GRADO_25_PRESIDENTE_CORTE"
  | "GRADO_26_FISCAL_NACIONAL"
  | "GRADO_27_MINISTRO_CS"
  | "GRADO_28_PRESIDENTE_SALA_CS"
  | "GRADO_29_FISCAL_JUDICIAL"
  | "GRADO_30_DECANO_CS"
  | "GRADO_31_PRESIDENTE_CS"
  | "GRADO_32_CONTRALOR"
  | "GRADO_33_JURISCONSULTO"
  // Niveles (5)
  | "NIVEL_ESCUELA"
  | "NIVEL_PRACTICA"
  | "NIVEL_ESTRADO"
  | "NIVEL_MAGISTRATURA"
  | "NIVEL_CONSEJO"
  // Estudio (10)
  | "ALUMNO_APLICADO"
  | "MEMORISTA"
  | "ERUDITO"
  | "PRIMERA_INSTANCIA"
  | "SEGUNDA_INSTANCIA"
  | "CASACIONISTA"
  | "DETECTOR_DE_FALACIAS"
  | "LEXICOGRAFO"
  | "INFALIBLE"
  | "ESTUDIANTE_INTEGRAL"
  // Simulacro (6)
  | "PRIMER_ALEGATO"
  | "ORADOR"
  | "TRIBUNO"
  | "SOBRESALIENTE"
  | "DOMADOR_DE_AUGUSTO"
  | "CINCO_VOCES"
  // Rachas (6)
  | "CONSTANTE"
  | "DISCIPLINADO"
  | "IMPLACABLE"
  | "ESPARTANO"
  | "MADRUGADOR"
  | "NOCTAMBULO"
  // Causas (9)
  | "PASANTE"
  | "PROCURADOR"
  | "ABOGADO_LITIGANTE"
  | "PENALISTA_EN_SERIE"
  | "JURISCONSULTO_SEMANA"
  | "SOCIEDAD_DE_HECHO"
  | "INVICTO"
  | "GLADIADOR"
  | "CONTENDOR"
  // Diario (7)
  | "VOZ_DEL_FORO"
  | "DOCTRINARIO"
  | "CONTROVERSIA"
  | "PLUMA_NOVEL"
  | "COMENTARISTA"
  | "ENSAYISTA"
  | "TRATADISTA"
  // Comunidad (6)
  | "PRIMER_COLEGA"
  | "RED_DE_CONTACTOS"
  | "INFLUYENTE"
  | "TUTOR"
  | "MAESTRO"
  | "ORGANIZADOR"
  // XP (10)
  | "NOVATO"
  | "AVANZADO"
  | "EXPERTO"
  | "LEYENDA"
  | "ASCENDIDO"
  | "ESCALADOR"
  | "CUMBRE"
  | "MAGISTRADO"
  | "CONSEJERO"
  | "JURISCONSULTO_SUPREMO"
  // Plan de Estudios (5)
  | "PLANIFICADOR"
  | "CUMPLIDOR"
  | "METODICO"
  | "IMPARABLE"
  | "RESILIENTE"
  // Expediente Abierto (3)
  | "PRIMER_ALEGATO_EXPEDIENTE"
  | "MEJOR_ALEGATO"
  | "JURISTA_DE_EXPEDIENTES";

// ─── BADGE_RULES ─────────────────────────────────────────

export const BADGE_RULES: BadgeRule[] = [
  // ── GRADOS (33) ──────────────────────────────────────
  { slug: "GRADO_01_OYENTE", label: "Oyente", emoji: "👂", tier: "bronze", category: "grados", description: "Grado 1 — La Escuela", check: { type: "grado_reached", threshold: 1 } },
  { slug: "GRADO_02_ALUMNO_REGULAR", label: "Alumno Regular", emoji: "📖", tier: "bronze", category: "grados", description: "Grado 2 — La Escuela", check: { type: "grado_reached", threshold: 2 } },
  { slug: "GRADO_03_EGRESADO", label: "Egresado", emoji: "🎓", tier: "bronze", category: "grados", description: "Grado 3 — La Escuela", check: { type: "grado_reached", threshold: 3 } },
  { slug: "GRADO_04_POSTULANTE", label: "Postulante", emoji: "📋", tier: "bronze", category: "grados", description: "Grado 4 — La Práctica", check: { type: "grado_reached", threshold: 4 } },
  { slug: "GRADO_05_PRACTICANTE", label: "Practicante", emoji: "⚙", tier: "bronze", category: "grados", description: "Grado 5 — La Práctica", check: { type: "grado_reached", threshold: 5 } },
  { slug: "GRADO_06_PROCURADOR", label: "Procurador", emoji: "📜", tier: "silver", category: "grados", description: "Grado 6", check: { type: "grado_reached", threshold: 6 } },
  { slug: "GRADO_07_RECEPTOR", label: "Receptor", emoji: "📨", tier: "silver", category: "grados", description: "Grado 7", check: { type: "grado_reached", threshold: 7 } },
  { slug: "GRADO_08_OFICIAL_SALA", label: "Oficial de Sala", emoji: "🏛", tier: "silver", category: "grados", description: "Grado 8", check: { type: "grado_reached", threshold: 8 } },
  { slug: "GRADO_09_DEFENSOR", label: "Defensor Público", emoji: "🛡", tier: "silver", category: "grados", description: "Grado 9", check: { type: "grado_reached", threshold: 9 } },
  { slug: "GRADO_10_ABOGADO", label: "Abogado Habilitado", emoji: "⚖", tier: "silver", category: "grados", description: "Grado 10", check: { type: "grado_reached", threshold: 10 } },
  { slug: "GRADO_11_PATROCINANTE", label: "Abogado Patrocinante", emoji: "👔", tier: "gold", category: "grados", description: "Grado 11", check: { type: "grado_reached", threshold: 11 } },
  { slug: "GRADO_12_RELATOR", label: "Relator", emoji: "🗣", tier: "gold", category: "grados", description: "Grado 12", check: { type: "grado_reached", threshold: 12 } },
  { slug: "GRADO_13_ARBITRO", label: "Árbitro", emoji: "⚔", tier: "gold", category: "grados", description: "Grado 13", check: { type: "grado_reached", threshold: 13 } },
  { slug: "GRADO_14_MAESTRO_FORO", label: "Maestro del Foro", emoji: "🏆", tier: "gold", category: "grados", description: "Grado 14", check: { type: "grado_reached", threshold: 14 } },
  { slug: "GRADO_15_JUEZ_SUPLENTE", label: "Juez Suplente", emoji: "👨‍⚖️", tier: "gold", category: "grados", description: "Grado 15", check: { type: "grado_reached", threshold: 15 } },
  { slug: "GRADO_16_JUEZ_LETRAS", label: "Juez de Letras", emoji: "📝", tier: "gold", category: "grados", description: "Grado 16", check: { type: "grado_reached", threshold: 16 } },
  { slug: "GRADO_17_JUEZ_GARANTIA", label: "Juez de Garantía", emoji: "🔒", tier: "gold", category: "grados", description: "Grado 17", check: { type: "grado_reached", threshold: 17 } },
  { slug: "GRADO_18_JUEZ_ORAL", label: "Juez de Tribunal Oral", emoji: "🎤", tier: "gold", category: "grados", description: "Grado 18", check: { type: "grado_reached", threshold: 18 } },
  { slug: "GRADO_19_SECRETARIO_CORTE", label: "Secretario de Corte", emoji: "📑", tier: "special", category: "grados", description: "Grado 19", check: { type: "grado_reached", threshold: 19 } },
  { slug: "GRADO_20_FISCAL_ADJUNTO", label: "Fiscal Adjunto", emoji: "🔍", tier: "special", category: "grados", description: "Grado 20", check: { type: "grado_reached", threshold: 20 } },
  { slug: "GRADO_21_FISCAL_REGIONAL", label: "Fiscal Regional", emoji: "🏴", tier: "special", category: "grados", description: "Grado 21", check: { type: "grado_reached", threshold: 21 } },
  { slug: "GRADO_22_MINISTRO_SUPLENTE", label: "Ministro Suplente", emoji: "⭐", tier: "special", category: "grados", description: "Grado 22", check: { type: "grado_reached", threshold: 22 } },
  { slug: "GRADO_23_MINISTRO_CORTE", label: "Ministro de Corte", emoji: "🌟", tier: "special", category: "grados", description: "Grado 23", check: { type: "grado_reached", threshold: 23 } },
  { slug: "GRADO_24_PRESIDENTE_SALA", label: "Presidente de Sala", emoji: "💫", tier: "special", category: "grados", description: "Grado 24", check: { type: "grado_reached", threshold: 24 } },
  { slug: "GRADO_25_PRESIDENTE_CORTE", label: "Presidente de Corte", emoji: "👑", tier: "special", category: "grados", description: "Grado 25", check: { type: "grado_reached", threshold: 25 } },
  { slug: "GRADO_26_FISCAL_NACIONAL", label: "Fiscal Nacional", emoji: "🦅", tier: "special", category: "grados", description: "Grado 26", check: { type: "grado_reached", threshold: 26 } },
  { slug: "GRADO_27_MINISTRO_CS", label: "Ministro de Corte Suprema", emoji: "🏛", tier: "special", category: "grados", description: "Grado 27", check: { type: "grado_reached", threshold: 27 } },
  { slug: "GRADO_28_PRESIDENTE_SALA_CS", label: "Presidente de Sala CS", emoji: "💎", tier: "special", category: "grados", description: "Grado 28", check: { type: "grado_reached", threshold: 28 } },
  { slug: "GRADO_29_FISCAL_JUDICIAL", label: "Fiscal Judicial", emoji: "⚡", tier: "special", category: "grados", description: "Grado 29", check: { type: "grado_reached", threshold: 29 } },
  { slug: "GRADO_30_DECANO_CS", label: "Decano de la Corte Suprema", emoji: "🌿", tier: "special", category: "grados", description: "Grado 30", check: { type: "grado_reached", threshold: 30 } },
  { slug: "GRADO_31_PRESIDENTE_CS", label: "Presidente de la Corte Suprema", emoji: "🏆", tier: "unique", category: "grados", description: "Grado 31", check: { type: "grado_reached", threshold: 31 } },
  { slug: "GRADO_32_CONTRALOR", label: "Contralor General", emoji: "🗡", tier: "unique", category: "grados", description: "Grado 32", check: { type: "grado_reached", threshold: 32 } },
  { slug: "GRADO_33_JURISCONSULTO", label: "Jurisconsulto de la República", emoji: "⚜", tier: "unique", category: "grados", description: "Grado 33 — Máximo grado", check: { type: "grado_reached", threshold: 33 } },

  // ── NIVELES (5) ──────────────────────────────────────
  { slug: "NIVEL_ESCUELA", label: "La Escuela", emoji: "🏫", tier: "bronze", category: "grados", description: "Alcanzar Grado 3 — Egresado", check: { type: "grado_reached", threshold: 3 } },
  { slug: "NIVEL_PRACTICA", label: "La Práctica", emoji: "⚙", tier: "silver", category: "grados", description: "Alcanzar Grado 14 — Maestro del Foro", check: { type: "grado_reached", threshold: 14 } },
  { slug: "NIVEL_ESTRADO", label: "El Estrado", emoji: "🏛", tier: "gold", category: "grados", description: "Alcanzar Grado 18 — Juez de Tribunal Oral", check: { type: "grado_reached", threshold: 18 } },
  { slug: "NIVEL_MAGISTRATURA", label: "La Magistratura", emoji: "👑", tier: "special", category: "grados", description: "Alcanzar Grado 30 — Decano de la Corte Suprema", check: { type: "grado_reached", threshold: 30 } },
  { slug: "NIVEL_CONSEJO", label: "El Consejo", emoji: "⚜", tier: "unique", category: "grados", description: "Alcanzar Grado 33 — Jurisconsulto de la República", check: { type: "grado_reached", threshold: 33 } },

  // ── ESTUDIO (10) ─────────────────────────────────────
  { slug: "ALUMNO_APLICADO", label: "Alumno Aplicado", emoji: "📚", tier: "bronze", category: "estudio", description: "Completar 50 flashcards", check: { type: "flashcards_completed", threshold: 50 } },
  { slug: "MEMORISTA", label: "Memorista", emoji: "🧠", tier: "silver", category: "estudio", description: "Completar 200 flashcards", check: { type: "flashcards_completed", threshold: 200 } },
  { slug: "ERUDITO", label: "Erudito", emoji: "🎓", tier: "gold", category: "estudio", description: "Completar 500 flashcards", check: { type: "flashcards_completed", threshold: 500 } },
  { slug: "PRIMERA_INSTANCIA", label: "Primera Instancia", emoji: "📝", tier: "bronze", category: "estudio", description: "Completar 100 preguntas de alternativas", check: { type: "mcq_completed", threshold: 100 } },
  { slug: "SEGUNDA_INSTANCIA", label: "Segunda Instancia", emoji: "📋", tier: "silver", category: "estudio", description: "Completar 500 preguntas de alternativas", check: { type: "mcq_completed", threshold: 500 } },
  { slug: "CASACIONISTA", label: "Casacionista", emoji: "⚖", tier: "gold", category: "estudio", description: "Completar 1000 preguntas de alternativas", check: { type: "mcq_completed", threshold: 1000 } },
  { slug: "DETECTOR_DE_FALACIAS", label: "Detector de Falacias", emoji: "🔎", tier: "silver", category: "estudio", description: "Completar 100 preguntas V/F", check: { type: "vf_completed", threshold: 100 } },
  { slug: "LEXICOGRAFO", label: "Lexicógrafo", emoji: "📖", tier: "silver", category: "estudio", description: "Completar 50 definiciones", check: { type: "definitions_completed", threshold: 50 } },
  { slug: "INFALIBLE", label: "Infalible", emoji: "🎯", tier: "special", category: "estudio", description: "90% de precisión con mínimo 200 intentos", check: { type: "accuracy", threshold: 90, minAttempts: 200 } },
  { slug: "ESTUDIANTE_INTEGRAL", label: "Estudiante Integral", emoji: "🌟", tier: "gold", category: "estudio", description: "Usar los 5 módulos de estudio en una semana", check: { type: "all_modules_week", threshold: 5 } },

  // ── SIMULACRO (6) ────────────────────────────────────
  { slug: "PRIMER_ALEGATO", label: "Primer Alegato", emoji: "🎤", tier: "bronze", category: "simulacro", description: "Completar tu primer simulacro oral", check: { type: "simulacros_completed", threshold: 1 } },
  { slug: "ORADOR", label: "Orador", emoji: "🗣", tier: "silver", category: "simulacro", description: "Completar 10 simulacros orales", check: { type: "simulacros_completed", threshold: 10 } },
  { slug: "TRIBUNO", label: "Tribuno", emoji: "🏛", tier: "gold", category: "simulacro", description: "Completar 50 simulacros orales", check: { type: "simulacros_completed", threshold: 50 } },
  { slug: "SOBRESALIENTE", label: "Sobresaliente", emoji: "💯", tier: "special", category: "simulacro", description: "Obtener 10/10 en un simulacro", check: { type: "perfect_score", threshold: 10 } },
  { slug: "DOMADOR_DE_AUGUSTO", label: "Domador de Augusto", emoji: "🦁", tier: "special", category: "simulacro", description: "Obtener 8+ con Don Augusto en modo avanzado", check: { type: "augusto_advanced", threshold: 8 } },
  { slug: "CINCO_VOCES", label: "Cinco Voces", emoji: "🎭", tier: "gold", category: "simulacro", description: "Completar simulacro con los 5 interrogadores", check: { type: "all_interrogators", threshold: 5 } },

  // ── RACHAS (6) ───────────────────────────────────────
  { slug: "CONSTANTE", label: "Constante", emoji: "🔥", tier: "bronze", category: "rachas", description: "Racha de 7 días consecutivos", check: { type: "streak_days", threshold: 7 } },
  { slug: "DISCIPLINADO", label: "Disciplinado", emoji: "💪", tier: "silver", category: "rachas", description: "Racha de 30 días consecutivos", check: { type: "streak_days", threshold: 30 } },
  { slug: "IMPLACABLE", label: "Implacable", emoji: "⚡", tier: "gold", category: "rachas", description: "Racha de 100 días consecutivos", check: { type: "streak_days", threshold: 100 } },
  { slug: "ESPARTANO", label: "Espartano", emoji: "🛡", tier: "unique", category: "rachas", description: "Racha de 365 días consecutivos", check: { type: "streak_days", threshold: 365 } },
  { slug: "MADRUGADOR", label: "Madrugador", emoji: "🌅", tier: "bronze", category: "rachas", description: "5 días de estudio antes de las 7am", check: { type: "early_study_days", threshold: 5 } },
  { slug: "NOCTAMBULO", label: "Noctámbulo", emoji: "🌙", tier: "bronze", category: "rachas", description: "5 días de estudio después de las 11pm", check: { type: "late_study_days", threshold: 5 } },

  // ── CAUSAS (9) — incluye los 6 existentes ────────────
  { slug: "PASANTE", label: "Pasante", emoji: "📜", tier: "bronze", category: "causas", description: "1ª victoria en Causa grupal", check: { type: "causas_won", threshold: 1 } },
  { slug: "PROCURADOR", label: "Procurador", emoji: "⚖️", tier: "silver", category: "causas", description: "10 victorias en Causas", check: { type: "causas_won", threshold: 10 } },
  { slug: "ABOGADO_LITIGANTE", label: "Abogado Litigante", emoji: "🏛️", tier: "gold", category: "causas", description: "50 victorias en Causas", check: { type: "causas_won", threshold: 50 } },
  { slug: "PENALISTA_EN_SERIE", label: "Penalista en Serie", emoji: "🔥", tier: "special", category: "causas", description: "5 victorias consecutivas", check: { type: "causas_win_streak", threshold: 5 } },
  { slug: "JURISCONSULTO_SEMANA", label: "Jurisconsulto de la Semana", emoji: "🏆", tier: "unique", category: "causas", description: "Campeón semanal de liga", check: { type: "weekly_champion", threshold: 1 } },
  { slug: "SOCIEDAD_DE_HECHO", label: "Sociedad de Hecho", emoji: "🤝", tier: "bronze", category: "causas", description: "Próximamente...", check: { type: "sociedad_de_hecho", threshold: 1 } },
  { slug: "INVICTO", label: "Invicto", emoji: "🏅", tier: "gold", category: "causas", description: "10 causas sin perder", check: { type: "causas_undefeated", threshold: 10 } },
  { slug: "GLADIADOR", label: "Gladiador", emoji: "⚔", tier: "special", category: "causas", description: "Participar en 100 causas", check: { type: "causas_participated", threshold: 100 } },
  { slug: "CONTENDOR", label: "Contendor", emoji: "👥", tier: "bronze", category: "causas", description: "Primera causa grupal con 3+ jugadores", check: { type: "group_causa_players", threshold: 3 } },

  // ── DIARIO (7) — incluye los 3 existentes ────────────
  { slug: "VOZ_DEL_FORO", label: "Voz del Foro", emoji: "🗣️", tier: "bronze", category: "diario", description: "Tu primer Obiter fue citado", check: { type: "obiters_cited", threshold: 1 } },
  { slug: "DOCTRINARIO", label: "Doctrinario", emoji: "📜", tier: "silver", category: "diario", description: "10 de tus Obiters fueron citados", check: { type: "obiters_cited", threshold: 10 } },
  { slug: "CONTROVERSIA", label: "Controversia", emoji: "⚡", tier: "gold", category: "diario", description: "Un Obiter tuyo generó más de 5 citas", check: { type: "obiter_citations", threshold: 5 } },
  { slug: "PLUMA_NOVEL", label: "Pluma Novel", emoji: "✒", tier: "bronze", category: "diario", description: "Publicar tu primer análisis", check: { type: "analisis_published", threshold: 1 } },
  { slug: "COMENTARISTA", label: "Comentarista", emoji: "💬", tier: "silver", category: "diario", description: "Publicar 10 análisis", check: { type: "analisis_published", threshold: 10 } },
  { slug: "ENSAYISTA", label: "Ensayista", emoji: "📝", tier: "silver", category: "diario", description: "Publicar tu primer ensayo", check: { type: "ensayos_published", threshold: 1 } },
  { slug: "TRATADISTA", label: "Tratadista", emoji: "📚", tier: "gold", category: "diario", description: "Publicar 5 ensayos", check: { type: "ensayos_published", threshold: 5 } },

  // ── EXPEDIENTE ABIERTO (3) ─────────────────────────
  { slug: "PRIMER_ALEGATO_EXPEDIENTE", label: "Primer Alegato", emoji: "⚖", tier: "bronze", category: "diario", description: "Publicar tu primer argumento en un Expediente Abierto", check: { type: "expediente_argumentos", threshold: 1 } },
  { slug: "MEJOR_ALEGATO", label: "Mejor Alegato", emoji: "🏆", tier: "gold", category: "diario", description: "Tu argumento fue el más votado en un Expediente Abierto", check: { type: "expediente_mejor_alegato", threshold: 1 } },
  { slug: "JURISTA_DE_EXPEDIENTES", label: "Jurista de Expedientes", emoji: "📂", tier: "silver", category: "diario", description: "Participar en 10 Expedientes Abiertos distintos", check: { type: "expediente_participaciones", threshold: 10 } },

  // ── COMUNIDAD (6) ────────────────────────────────────
  { slug: "PRIMER_COLEGA", label: "Primer Colega", emoji: "🤝", tier: "bronze", category: "comunidad", description: "Agregar tu primer colega", check: { type: "colegas_count", threshold: 1 } },
  { slug: "RED_DE_CONTACTOS", label: "Red de Contactos", emoji: "🌐", tier: "silver", category: "comunidad", description: "Tener 10 colegas", check: { type: "colegas_count", threshold: 10 } },
  { slug: "INFLUYENTE", label: "Influyente", emoji: "⭐", tier: "gold", category: "comunidad", description: "Tener 50 colegas", check: { type: "colegas_count", threshold: 50 } },
  { slug: "TUTOR", label: "Tutor", emoji: "🎓", tier: "bronze", category: "comunidad", description: "Dar tu primera sesión de tutoría", check: { type: "tutor_sessions", threshold: 1 } },
  { slug: "MAESTRO", label: "Maestro", emoji: "👨‍🏫", tier: "gold", category: "comunidad", description: "Dar 20 sesiones de tutoría con rating 4+", check: { type: "tutor_sessions", threshold: 20, minRating: 4 } },
  { slug: "ORGANIZADOR", label: "Organizador", emoji: "📅", tier: "silver", category: "comunidad", description: "Crear 3 eventos", check: { type: "events_created", threshold: 3 } },

  // ── XP (4) ───────────────────────────────────────────
  { slug: "NOVATO", label: "Novato", emoji: "🌱", tier: "bronze", category: "xp", description: "Acumular 100 XP", check: { type: "xp_total", threshold: 100 } },
  { slug: "AVANZADO", label: "Avanzado", emoji: "📈", tier: "silver", category: "xp", description: "Acumular 1.000 XP", check: { type: "xp_total", threshold: 1000 } },
  { slug: "EXPERTO", label: "Experto", emoji: "💎", tier: "gold", category: "xp", description: "Acumular 10.000 XP", check: { type: "xp_total", threshold: 10000 } },
  { slug: "LEYENDA", label: "Leyenda", emoji: "👑", tier: "unique", category: "xp", description: "Acumular 50.000 XP", check: { type: "xp_total", threshold: 50000 } },
  { slug: "ASCENDIDO", label: "Ascendido", emoji: "⬆", tier: "bronze", category: "xp", description: "Asciende de grado por primera vez", check: { type: "grado_reached", threshold: 2 } },
  { slug: "ESCALADOR", label: "Escalador", emoji: "🧗", tier: "silver", category: "xp", description: "Alcanza el grado 10 (Abogado Habilitado)", check: { type: "grado_reached", threshold: 10 } },
  { slug: "CUMBRE", label: "Cumbre", emoji: "🏔", tier: "gold", category: "xp", description: "Alcanza el grado 18 (Juez de Tribunal Oral)", check: { type: "grado_reached", threshold: 18 } },
  { slug: "MAGISTRADO", label: "Magistrado", emoji: "👑", tier: "gold", category: "xp", description: "Alcanza el nivel Magistratura (grado 19+)", check: { type: "grado_reached", threshold: 19 } },
  { slug: "CONSEJERO", label: "Consejero", emoji: "⚜", tier: "special", category: "xp", description: "Alcanza el nivel Consejo (grado 31+)", check: { type: "grado_reached", threshold: 31 } },
  { slug: "JURISCONSULTO_SUPREMO", label: "Jurisconsulto de la República", emoji: "🏛", tier: "special", category: "xp", description: "Alcanza el grado 33 — la máxima autoridad", check: { type: "grado_reached", threshold: 33 } },

  // ── PLAN DE ESTUDIOS (5) ─────────────────────────────
  { slug: "PLANIFICADOR", label: "Planificador", emoji: "📋", tier: "bronze", category: "plan_estudios", description: "Crear tu plan de estudios", check: { type: "plan_created", threshold: 1 } },
  { slug: "CUMPLIDOR", label: "Cumplidor", emoji: "✅", tier: "bronze", category: "plan_estudios", description: "Completar 7 sesiones del plan", check: { type: "plan_sessions", threshold: 7 } },
  { slug: "METODICO", label: "Metódico", emoji: "📊", tier: "silver", category: "plan_estudios", description: "Completar 30 sesiones del plan", check: { type: "plan_sessions", threshold: 30 } },
  { slug: "IMPARABLE", label: "Imparable", emoji: "🚀", tier: "gold", category: "plan_estudios", description: "Completar el 100% de tu plan de estudios", check: { type: "plan_completion", threshold: 100 } },
  { slug: "RESILIENTE", label: "Resiliente", emoji: "🔄", tier: "special", category: "plan_estudios", description: "Recalcular tu plan y completarlo", check: { type: "plan_recalculated_completed", threshold: 1 } },
];

// ─── GRADO_THRESHOLDS ────────────────────────────────────

export const GRADO_THRESHOLDS: Record<number, number> = {
  1: 0, 2: 50, 3: 150, 4: 300, 5: 500, 6: 750, 7: 1000, 8: 1500, 9: 2000, 10: 2750,
  11: 3500, 12: 4500, 13: 5500, 14: 7000, 15: 9000, 16: 11000, 17: 14000, 18: 17000,
  19: 20000, 20: 24000, 21: 28000, 22: 33000, 23: 38000, 24: 44000, 25: 50000,
  26: 57000, 27: 65000, 28: 75000, 29: 85000, 30: 100000, 31: 120000, 32: 150000, 33: 200000,
};

// ─── Helper: calcula grado según XP ─────────────────────

export function calculateGrado(xp: number): number {
  let grado = 1;
  for (let i = 33; i >= 1; i--) {
    if (xp >= GRADO_THRESHOLDS[i]) {
      grado = i;
      break;
    }
  }
  return grado;
}

// ─── BADGE_MAP ───────────────────────────────────────────

export const BADGE_MAP = Object.fromEntries(
  BADGE_RULES.map((b) => [b.slug, b])
) as Record<string, BadgeRule>;
