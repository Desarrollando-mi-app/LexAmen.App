// ─── Constantes de Insignias (client-safe, sin imports de prisma) ──

export type BadgeSlug =
  | "PASANTE"
  | "PROCURADOR"
  | "ABOGADO_LITIGANTE"
  | "PENALISTA_EN_SERIE"
  | "JURISCONSULTO_SEMANA"
  | "SOCIEDAD_DE_HECHO"
  | "VOZ_DEL_FORO"
  | "DOCTRINARIO"
  | "CONTROVERSIA";

export interface BadgeRule {
  slug: BadgeSlug;
  label: string;
  emoji: string;
  tier: "bronze" | "silver" | "gold" | "special" | "unique";
  description: string;
}

export const BADGE_RULES: BadgeRule[] = [
  {
    slug: "PASANTE",
    label: "Pasante",
    emoji: "📜",
    tier: "bronze",
    description: "1ª victoria en Causa grupal",
  },
  {
    slug: "PROCURADOR",
    label: "Procurador",
    emoji: "⚖️",
    tier: "silver",
    description: "10 victorias en Causas",
  },
  {
    slug: "ABOGADO_LITIGANTE",
    label: "Abogado Litigante",
    emoji: "🏛️",
    tier: "gold",
    description: "50 victorias en Causas",
  },
  {
    slug: "PENALISTA_EN_SERIE",
    label: "Penalista en Serie",
    emoji: "🔥",
    tier: "special",
    description: "5 victorias consecutivas",
  },
  {
    slug: "JURISCONSULTO_SEMANA",
    label: "Jurisconsulto de la Semana",
    emoji: "🏆",
    tier: "unique",
    description: "Campeón semanal de liga",
  },
  {
    slug: "SOCIEDAD_DE_HECHO",
    label: "Sociedad de Hecho",
    emoji: "🤝",
    tier: "bronze",
    description: "Próximamente...",
  },
  {
    slug: "VOZ_DEL_FORO",
    label: "Voz del Foro",
    emoji: "🗣️",
    tier: "bronze",
    description: "Tu primer Obiter fue citado",
  },
  {
    slug: "DOCTRINARIO",
    label: "Doctrinario",
    emoji: "📜",
    tier: "silver",
    description: "10 de tus Obiters fueron citados",
  },
  {
    slug: "CONTROVERSIA",
    label: "Controversia",
    emoji: "⚡",
    tier: "gold",
    description: "Un Obiter tuyo generó más de 5 citas",
  },
];

export const BADGE_MAP = Object.fromEntries(
  BADGE_RULES.map((b) => [b.slug, b])
) as Record<BadgeSlug, BadgeRule>;
