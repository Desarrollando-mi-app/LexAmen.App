"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface AreasRadarProps {
  data: Array<{ materia: string; porcentaje: number }>;
  /** Alto del chart en px. Default 220. */
  height?: number;
  /** Color del trazo/relleno. Default gold. Pasa "burgundy" | "navy" para variar. */
  accent?: "gold" | "burgundy" | "navy";
}

const ACCENT_MAP: Record<NonNullable<AreasRadarProps["accent"]>, string> = {
  gold: CHART_COLORS.gold,
  burgundy: CHART_COLORS.burgundy,
  navy: CHART_COLORS.navy,
};

/**
 * Muestra un radar editorial con las áreas practicadas por XP.
 * - Con ≥3 ejes: radar completo (triángulo/polígono).
 * - Con <3 ejes: retorna null (el caller debería mostrar un fallback).
 *
 * Normaliza los labels largos (titulos de código) a ~18 chars.
 */
export function AreasRadar({ data, height = 220, accent = "gold" }: AreasRadarProps) {
  if (!data || data.length < 3) return null;

  const color = ACCENT_MAP[accent];

  const chartData = data.map((d) => ({
    materia: prettifyMateria(d.materia),
    porcentaje: d.porcentaje,
    full: d.materia,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke={CHART_COLORS.rule} strokeOpacity={0.6} />
        <PolarAngleAxis
          dataKey="materia"
          tick={{
            fontSize: 10,
            fill: CHART_COLORS.inkMid,
            fontFamily: "var(--font-ibm-plex-mono), monospace",
          }}
        />
        <Radar
          name="Actividad"
          dataKey="porcentaje"
          stroke={color}
          fill={color}
          fillOpacity={0.22}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/**
 * Convierte labels de rama canónica ("Derecho Civil"), enums crudos
 * ("DERECHO_CIVIL") o sub-materias largas en labels cortos para los ejes
 * del radar. Mantenemos acentos y prefijamos con "D." cuando aplica.
 */
function prettifyMateria(raw: string): string {
  // 1) Mapa explícito para ramas conocidas — labels cortos y consistentes
  const ramaMap: Record<string, string> = {
    // Enums crudos (por compatibilidad con otras fuentes)
    DERECHO_CIVIL: "D. Civil",
    DERECHO_PROCESAL_CIVIL: "D. Procesal Civil",
    DERECHO_PROCESAL_PENAL: "D. Procesal Penal",
    DERECHO_ORGANICO: "D. Orgánico",
    // Labels canónicos producidos por page.tsx
    "Derecho Civil": "D. Civil",
    "Derecho Penal": "D. Penal",
    "Derecho Procesal": "D. Procesal",
    "Derecho Procesal Civil": "D. Procesal Civil",
    "Derecho Procesal Penal": "D. Procesal Penal",
    "Derecho Constitucional": "D. Constitucional",
    "Derecho Administrativo": "D. Administrativo",
    "Derecho Orgánico": "D. Orgánico",
    "Derecho Comercial": "D. Comercial",
    "Derecho del Trabajo": "D. Trabajo",
    "Derecho Internacional": "D. Internacional",
    "Derecho Tributario": "D. Tributario",
    "Derecho Económico": "D. Económico",
  };
  if (ramaMap[raw]) return ramaMap[raw];

  // 2) Heurística general: "Derecho X" → "D. X"
  if (/^derecho\s+/i.test(raw)) {
    return "D. " + raw.replace(/^derecho\s+/i, "");
  }

  // 3) Trunca con … si es muy largo
  if (raw.length > 18) return raw.slice(0, 16).trim() + "…";
  return raw;
}
