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
 * Convierte labels internos (DERECHO_CIVIL) o titulos largos
 * ("Definición de varias palabras de uso frecuente") en labels cortos.
 */
function prettifyMateria(raw: string): string {
  // Normaliza Rama enums
  const ramaMap: Record<string, string> = {
    DERECHO_CIVIL: "D. Civil",
    DERECHO_PROCESAL_CIVIL: "D. Procesal",
    DERECHO_ORGANICO: "D. Orgánico",
  };
  if (ramaMap[raw]) return ramaMap[raw];

  // Trunca con … si es muy largo
  if (raw.length > 18) return raw.slice(0, 16).trim() + "…";
  return raw;
}
