// ─── Helpers compartidos para la vista V4 de Ayudantías ──

export type AyudantiaType = "OFREZCO" | "BUSCO";

/** Materia → color class key (matches .c-* in mockups). */
export function subjectColor(materia: string): string {
  const m = materia.toLowerCase();
  if (m.includes("penal")) return "penal";
  if (m.includes("constitucional") || m.includes("const")) return "const";
  if (m.includes("administrativo")) return "admin";
  if (m.includes("comercial")) return "com";
  if (m.includes("trabajo") || m.includes("laboral")) return "lab";
  if (m.includes("internacional")) return "intl";
  if (m.includes("familia")) return "fam";
  if (m.includes("tributario")) return "trib";
  if (m.includes("romano") || m.includes("teoría")) return "teor";
  if (m.includes("procesal")) return "proc";
  return "civil";
}

/** Gradient lineal por materia, replicando el mockup V4. */
export const SUBJECT_GRADIENTS: Record<string, string> = {
  civil: "linear-gradient(135deg, #c49a50, #b88840 55%, #8a6428)",
  penal: "linear-gradient(135deg, #c2485a, #9a3040 55%, #6b1d2a)",
  const: "linear-gradient(135deg, #4a6a95, #324e75 55%, #12203a)",
  admin: "linear-gradient(135deg, #6a6a55, #4e4e3c 55%, #2a2a22)",
  com: "linear-gradient(135deg, #7a5a3a, #5e432c 55%, #3a2a1c)",
  lab: "linear-gradient(135deg, #5a7a55, #3f5a3a 55%, #223a22)",
  intl: "linear-gradient(135deg, #4a7080, #2e5868 55%, #1a3544)",
  fam: "linear-gradient(135deg, #b07c6e, #8a5e52 55%, #5a3a32)",
  trib: "linear-gradient(135deg, #8c7550, #6a5636 55%, #3a2e1e)",
  teor: "linear-gradient(135deg, #5f5245, #463b30 55%, #28211a)",
  proc: "linear-gradient(135deg, #6a5a4a, #4d4032 55%, #2a221a)",
};

/** "María Fernández" → "MF" */
export function initials(firstName?: string | null, lastName?: string | null): string {
  const f = (firstName ?? "").trim()[0] ?? "";
  const l = (lastName ?? "").trim()[0] ?? "";
  return `${f}${l}`.toUpperCase() || "—";
}

/** Cuenta "Mié / Vie 18:00", etc. Mantiene al menos una forma legible. */
export function formatSchedule(disponibilidad: string | null | undefined): string {
  if (!disponibilidad) return "A convenir";
  return disponibilidad.length > 30 ? disponibilidad.slice(0, 28) + "…" : disponibilidad;
}

/** Muestra "Gratuito" / "$X" / "$X /h", legible en tile y hero. */
export function priceLabel(priceType: string, priceAmount: number | null): string {
  if (priceType === "GRATUITO") return "Gratuito";
  if (!priceAmount) return "A convenir";
  return `$${priceAmount.toLocaleString("es-CL")} /h`;
}

/** Formato legible: ONLINE | PRESENCIAL | AMBOS → "Online" / "Presencial" / "Híbrido" */
export function formatLabel(format: string): string {
  if (format === "ONLINE") return "Online";
  if (format === "PRESENCIAL") return "Presencial";
  return "Híbrido";
}

/** Fecha compacta tipo "22 abr · 3h" — acepta ISO string. */
export function formatRelative(iso: string): string {
  const date = new Date(iso);
  const months = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  const day = date.getDate();
  const mo = months[date.getMonth()];
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  let rel = "";
  if (diffHours < 1) rel = "ahora";
  else if (diffHours < 24) rel = `${diffHours}h`;
  else if (diffDays === 1) rel = "1d";
  else if (diffDays < 7) rel = `${diffDays}d`;
  else if (diffDays < 30) rel = `${Math.floor(diffDays / 7)}sem`;
  else rel = `${Math.floor(diffDays / 30)}mes`;
  return `${day} ${mo} · ${rel}`;
}

/** ¿Publicado hace < 6h? → destaca punto fresh dorado. */
export function isFresh(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 6 * 60 * 60 * 1000;
}
