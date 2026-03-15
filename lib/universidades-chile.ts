/**
 * Universidades chilenas con carreras de Derecho
 * Fuente: listado de universidades acreditadas con programas de Derecho
 */

export const UNIVERSIDADES_CHILE = [
  { value: "uc", label: "Pontificia Universidad Católica de Chile", sigla: "UC" },
  { value: "uch", label: "Universidad de Chile", sigla: "UCH" },
  { value: "udp", label: "Universidad Diego Portales", sigla: "UDP" },
  { value: "uah", label: "Universidad Alberto Hurtado", sigla: "UAH" },
  { value: "udla", label: "Universidad de Las Américas", sigla: "UDLA" },
  { value: "unab", label: "Universidad Andrés Bello", sigla: "UNAB" },
  { value: "udd", label: "Universidad del Desarrollo", sigla: "UDD" },
  { value: "uv", label: "Universidad de Valparaíso", sigla: "UV" },
  { value: "uct", label: "Universidad Católica de Temuco", sigla: "UCT" },
  { value: "ucv", label: "Pontificia Universidad Católica de Valparaíso", sigla: "PUCV" },
  { value: "udec", label: "Universidad de Concepción", sigla: "UdeC" },
  { value: "utal", label: "Universidad de Talca", sigla: "UTalca" },
  { value: "ufro", label: "Universidad de La Frontera", sigla: "UFRO" },
  { value: "ucn", label: "Universidad Católica del Norte", sigla: "UCN" },
  { value: "ubo", label: "Universidad Bernardo O'Higgins", sigla: "UBO" },
  { value: "ucentral", label: "Universidad Central de Chile", sigla: "UCentral" },
  { value: "uss", label: "Universidad San Sebastián", sigla: "USS" },
  { value: "uautonoma", label: "Universidad Autónoma de Chile", sigla: "UA" },
  { value: "umayor", label: "Universidad Mayor", sigla: "UMayor" },
  { value: "otra", label: "Otra universidad", sigla: "Otra" },
] as const;

export type UniversidadValue = (typeof UNIVERSIDADES_CHILE)[number]["value"];

/** Get university label by value */
export function getUniversidadLabel(value: string): string {
  const u = UNIVERSIDADES_CHILE.find((u) => u.value === value);
  return u?.label ?? value;
}

/** Get university sigla by value */
export function getUniversidadSigla(value: string): string {
  const u = UNIVERSIDADES_CHILE.find((u) => u.value === value);
  return u?.sigla ?? value;
}
