// ─── Universidades de Chile con Sedes (Derecho) ─────────────
// Estructura: universidad → sedes (campus que imparten Derecho)

export interface UniversidadData {
  nombre: string;
  sedes: string[];
}

export const UNIVERSIDADES: UniversidadData[] = [
  {
    nombre: "Universidad de Chile",
    sedes: ["Santiago"],
  },
  {
    nombre: "Pontificia Universidad Católica de Chile",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad de Concepción",
    sedes: ["Concepción"],
  },
  {
    nombre: "Universidad de Valparaíso",
    sedes: ["Valparaíso"],
  },
  {
    nombre: "Pontificia Universidad Católica de Valparaíso",
    sedes: ["Valparaíso"],
  },
  {
    nombre: "Universidad Diego Portales",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad Adolfo Ibáñez",
    sedes: ["Santiago", "Viña del Mar"],
  },
  {
    nombre: "Universidad de los Andes",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad del Desarrollo",
    sedes: ["Santiago", "Concepción"],
  },
  {
    nombre: "Universidad Andrés Bello",
    sedes: ["Santiago", "Viña del Mar", "Concepción"],
  },
  {
    nombre: "Universidad Autónoma de Chile",
    sedes: ["Santiago", "Temuco", "Talca"],
  },
  {
    nombre: "Universidad Central de Chile",
    sedes: ["Santiago", "La Serena"],
  },
  {
    nombre: "Universidad San Sebastián",
    sedes: ["Santiago", "Concepción", "Valdivia", "Puerto Montt"],
  },
  {
    nombre: "Universidad Mayor",
    sedes: ["Santiago", "Temuco"],
  },
  {
    nombre: "Universidad Finis Terrae",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad de Las Américas",
    sedes: ["Santiago", "Viña del Mar", "Concepción"],
  },
  {
    nombre: "Universidad Alberto Hurtado",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad Católica del Norte",
    sedes: ["Antofagasta", "Coquimbo"],
  },
  {
    nombre: "Universidad de Talca",
    sedes: ["Talca"],
  },
  {
    nombre: "Universidad de Atacama",
    sedes: ["Copiapó"],
  },
  {
    nombre: "Universidad Católica de Temuco",
    sedes: ["Temuco"],
  },
  {
    nombre: "Universidad de La Frontera",
    sedes: ["Temuco"],
  },
  {
    nombre: "Universidad Austral de Chile",
    sedes: ["Valdivia"],
  },
  {
    nombre: "Universidad de Antofagasta",
    sedes: ["Antofagasta"],
  },
  {
    nombre: "Universidad de Tarapacá",
    sedes: ["Arica"],
  },
  {
    nombre: "Universidad Arturo Prat",
    sedes: ["Iquique"],
  },
  {
    nombre: "Universidad Católica de la Santísima Concepción",
    sedes: ["Concepción"],
  },
  {
    nombre: "Universidad de Magallanes",
    sedes: ["Punta Arenas"],
  },
  {
    nombre: "Universidad Bernardo O'Higgins",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad Pedro de Valdivia",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad Gabriela Mistral",
    sedes: ["Santiago"],
  },
  {
    nombre: "Universidad Santo Tomás",
    sedes: ["Santiago", "Viña del Mar", "Concepción", "Temuco", "Antofagasta", "La Serena", "Talca", "Arica"],
  },
];

/** Lista plana de nombres de universidades (para selects) */
export const UNIVERSIDAD_NOMBRES = UNIVERSIDADES.map((u) => u.nombre);

/** Obtiene las sedes de una universidad */
export function getSedesForUniversidad(nombre: string): string[] {
  return UNIVERSIDADES.find((u) => u.nombre === nombre)?.sedes ?? [];
}

/** Obtiene todas las sedes únicas */
export function getAllSedes(): string[] {
  const sedes = new Set<string>();
  for (const u of UNIVERSIDADES) {
    for (const s of u.sedes) {
      sedes.add(s);
    }
  }
  return Array.from(sedes).sort();
}
