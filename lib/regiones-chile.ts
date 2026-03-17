// ─── Regiones de Chile ──────────────────────────────────────────

export const REGIONES_CHILE = [
  "Región de Arica y Parinacota",
  "Región de Tarapacá",
  "Región de Antofagasta",
  "Región de Atacama",
  "Región de Coquimbo",
  "Región de Valparaíso",
  "Región Metropolitana de Santiago",
  "Región del Libertador General Bernardo O'Higgins",
  "Región del Maule",
  "Región de Ñuble",
  "Región del Biobío",
  "Región de La Araucanía",
  "Región de Los Ríos",
  "Región de Los Lagos",
  "Región de Aysén",
  "Región de Magallanes y de la Antártica Chilena",
] as const;

export type RegionChile = (typeof REGIONES_CHILE)[number];

// ─── Cortes de Apelaciones ─────────────────────────────────────

export interface CorteApelaciones {
  corte: string;
  region: RegionChile;
}

export const CORTES_APELACIONES: CorteApelaciones[] = [
  { corte: "Arica", region: "Región de Arica y Parinacota" },
  { corte: "Iquique", region: "Región de Tarapacá" },
  { corte: "Antofagasta", region: "Región de Antofagasta" },
  { corte: "Copiapó", region: "Región de Atacama" },
  { corte: "La Serena", region: "Región de Coquimbo" },
  { corte: "Valparaíso", region: "Región de Valparaíso" },
  { corte: "Santiago", region: "Región Metropolitana de Santiago" },
  { corte: "San Miguel", region: "Región Metropolitana de Santiago" },
  { corte: "Rancagua", region: "Región del Libertador General Bernardo O'Higgins" },
  { corte: "Talca", region: "Región del Maule" },
  { corte: "Chillán", region: "Región de Ñuble" },
  { corte: "Concepción", region: "Región del Biobío" },
  { corte: "Temuco", region: "Región de La Araucanía" },
  { corte: "Valdivia", region: "Región de Los Ríos" },
  { corte: "Puerto Montt", region: "Región de Los Lagos" },
  { corte: "Coyhaique", region: "Región de Aysén" },
  { corte: "Punta Arenas", region: "Región de Magallanes y de la Antártica Chilena" },
];

/** Get cortes for a given region */
export function getCortesForRegion(region: string): string[] {
  return CORTES_APELACIONES
    .filter((c) => c.region === region)
    .map((c) => c.corte);
}

/** Get region for a given corte */
export function getRegionForCorte(corte: string): string | null {
  return CORTES_APELACIONES.find((c) => c.corte === corte)?.region ?? null;
}
