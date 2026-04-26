// ─── Obiter Dictum — tipos compartidos ──────────────────────

export type LinkPreview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  kind: "noticia" | "external";
};

export type ObiterData = {
  id: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad?: string | null;
  };
  content: string;
  materia: string | null;
  tipo: string | null;
  threadId: string | null;
  threadOrder: number | null;
  threadPartsCount?: number | null;
  // === Respuestas (modelo unificado) ===
  // Si parentObiterId está presente, este OD es una respuesta a otro.
  // replyCount es el total de respuestas directas que recibió este OD
  // (no recursivo).
  parentObiterId?: string | null;
  replyCount?: number;
  linkPreviews?: LinkPreview[];
  citedObiterId: string | null;
  citedObiter: {
    id: string;
    content: string;
    user: { id?: string; firstName: string; lastName: string };
  } | null;
  citedAnalisisId: string | null;
  citedAnalisis: {
    id: string;
    titulo: string;
    tribunal: string;
    materia: string;
  } | null;
  citedEnsayoId: string | null;
  citedEnsayo: {
    id: string;
    titulo: string;
    tipo: string;
    materia: string;
  } | null;
  apoyosCount: number;
  citasCount: number;
  guardadosCount: number;
  comuniqueseCount: number;
  hasApoyado?: boolean;
  hasGuardado?: boolean;
  hasComunicado?: boolean;
  colegasQueApoyaron?: { firstName: string; lastName: string }[];
  createdAt: string; // ISO string

  // Para items de tipo "comuniquese" en el feed
  comuniquesePor?: {
    firstName: string;
    lastName: string;
  };
};

// ─── Análisis Preview (para feed de OD) ──────────────────────

export type UserMini = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad?: string | null;
};

export type AnalisisPreview = {
  id: string;
  titulo: string;
  resumen: string;
  tribunal: string;
  numeroRol: string;
  materia: string;
  tiempoLectura: number;
  user: UserMini;
  apoyosCount: number;
  citasCount: number;
  guardadosCount: number;
  comuniqueseCount: number;
  hasApoyado?: boolean;
  hasGuardado?: boolean;
  hasComunicado?: boolean;
  createdAt: string;
};

export type EnsayoPreview = {
  id: string;
  titulo: string;
  resumen: string | null;
  materia: string;
  tipo: string;
  archivoFormato: string;
  user: UserMini;
  apoyosCount: number;
  citasCount: number;
  guardadosCount: number;
  comuniqueseCount: number;
  downloadsCount: number;
  hasApoyado?: boolean;
  hasGuardado?: boolean;
  hasComunicado?: boolean;
  createdAt: string;
};

export type FeedItem =
  | { type: "obiter"; data: ObiterData }
  | { type: "analisis_preview"; data: AnalisisPreview }
  | { type: "ensayo_preview"; data: EnsayoPreview };

export type UnifiedFeedResponse = {
  items: FeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ObiterFeedResponse = {
  obiters: ObiterData[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type PublishResult = {
  allowed: boolean;
  remaining: number;
  isPremium: boolean;
};

export const MATERIAS = [
  { value: "acto_juridico", label: "Acto Jurídico" },
  { value: "obligaciones", label: "Obligaciones" },
  { value: "contratos", label: "Contratos" },
  { value: "procesal_civil", label: "Procesal Civil" },
  { value: "bienes", label: "Bienes" },
  { value: "familia", label: "Familia" },
  { value: "sucesiones", label: "Sucesiones" },
  { value: "otro", label: "Otro" },
] as const;

export const TIPOS = [
  { value: "reflexion", label: "Reflexión" },
  { value: "pregunta", label: "Pregunta abierta" },
  { value: "cita_doctrinal", label: "Cita doctrinal" },
  { value: "opinion", label: "Opinión" },
  { value: "dato", label: "Dato curioso" },
] as const;
