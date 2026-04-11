/**
 * Colores representativos de cada rama del Derecho.
 *
 * Cada rama tiene:
 * - `bg` — fondo claro para light mode (toda la página)
 * - `bgDark` — fondo oscuro para dark mode
 * - `accent` — color de acento para badges, líneas, bordes
 * - `accentLight` — tono más suave del acento (para badges secundarios)
 * - `label` — nombre legible para UI
 */

export interface RamaColor {
  bg: string;
  bgDark: string;
  accent: string;
  accentLight: string;
  label: string;
}

export const RAMA_DERECHO_COLORS: Record<string, RamaColor> = {
  civil: {
    bg: "#e8f0f2",
    bgDark: "#0b1a1d",
    accent: "#1a5c6b",
    accentLight: "#1a5c6b20",
    label: "Civil",
  },
  penal: {
    bg: "#f2e8ea",
    bgDark: "#1d0b0e",
    accent: "#8b1a2b",
    accentLight: "#8b1a2b20",
    label: "Penal",
  },
  constitucional: {
    bg: "#efe8f5",
    bgDark: "#140b1d",
    accent: "#5c3d8f",
    accentLight: "#5c3d8f20",
    label: "Constitucional",
  },
  laboral: {
    bg: "#e8f2ed",
    bgDark: "#0b1d14",
    accent: "#2d6a4f",
    accentLight: "#2d6a4f20",
    label: "Laboral",
  },
  administrativo: {
    bg: "#eaeff4",
    bgDark: "#0c1119",
    accent: "#3d5a80",
    accentLight: "#3d5a8020",
    label: "Administrativo",
  },
  comercial: {
    bg: "#f2efe5",
    bgDark: "#1a170b",
    accent: "#8b6914",
    accentLight: "#8b691420",
    label: "Comercial",
  },
  procesal: {
    bg: "#ececee",
    bgDark: "#111113",
    accent: "#4a5568",
    accentLight: "#4a556820",
    label: "Procesal",
  },
  tributario: {
    bg: "#eeeee9",
    bgDark: "#13130e",
    accent: "#6b705c",
    accentLight: "#6b705c20",
    label: "Tributario",
  },
  familia: {
    bg: "#f4eaee",
    bgDark: "#1d0e14",
    accent: "#b56576",
    accentLight: "#b5657620",
    label: "Familia",
  },
  internacional: {
    bg: "#e8ecf2",
    bgDark: "#0b0e1a",
    accent: "#1a3055",
    accentLight: "#1a305520",
    label: "Internacional",
  },
};

/** Get color for a rama, with fallback to default gold */
export function getRamaColor(rama: string | null | undefined): RamaColor {
  if (!rama) return DEFAULT_COLOR;
  return RAMA_DERECHO_COLORS[rama.toLowerCase()] ?? DEFAULT_COLOR;
}

const DEFAULT_COLOR: RamaColor = {
  bg: "var(--gz-cream)",
  bgDark: "var(--gz-cream)",
  accent: "var(--gz-gold)",
  accentLight: "var(--gz-gold)/10",
  label: "Todas",
};

/** All ramas as an array for dropdown rendering */
export const RAMAS_DERECHO = [
  { value: "", label: "Todas las materias" },
  ...Object.entries(RAMA_DERECHO_COLORS).map(([key, c]) => ({
    value: key,
    label: c.label,
  })),
];

/** Categoría labels and order */
export const CATEGORIA_NOTICIAS = [
  { value: "", label: "Todas" },
  { value: "nueva_ley", label: "Proyectos de Ley" },
  { value: "normativa", label: "Normativa" },
  { value: "sentencia", label: "Sentencias" },
  { value: "gremial", label: "Gremial" },
  { value: "doctrina", label: "Doctrina" },
  { value: "internacional", label: "Internacional" },
  { value: "columna_opinion", label: "Columna de Opinión" },
  { value: "carta_director", label: "Carta al Director" },
  { value: "editorial", label: "Editorial" },
];

/**
 * Colores especiales para categorías que pintan el fondo
 * (igual que las ramas del derecho).
 */
export interface CategoriaColor {
  bg: string;
  bgDark: string;
  accent: string;
  accentLight: string;
}

export const CATEGORIA_COLORS: Record<string, CategoriaColor> = {
  columna_opinion: {
    bg: "#f5ede3",
    bgDark: "#1a150e",
    accent: "#8b6914",
    accentLight: "#8b691420",
  },
  carta_director: {
    bg: "#e3ecf5",
    bgDark: "#0e141a",
    accent: "#2b5e91",
    accentLight: "#2b5e9120",
  },
  editorial: {
    bg: "#f0e8e8",
    bgDark: "#1a0e0e",
    accent: "#7a3030",
    accentLight: "#7a303020",
  },
};

export function getCategoriaColor(cat: string | null | undefined): CategoriaColor | null {
  if (!cat) return null;
  return CATEGORIA_COLORS[cat] ?? null;
}
