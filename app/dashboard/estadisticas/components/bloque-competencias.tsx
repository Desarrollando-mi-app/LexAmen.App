"use client";

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "@/lib/estadisticas-chart-config";
import { InfoTooltip } from "@/app/components/info-tooltip";
import { FEATURE_INFO } from "@/lib/feature-info";

interface BloqueCompetenciasProps {
  competencias: Array<{
    libro: string;
    label: string;
    score: number;
    fcDom: number;
    fcTotal: number;
    mcqCorrect: number;
    mcqTotal: number;
    vfCorrect: number;
    vfTotal: number;
  }>;
  percentil: {
    global: number;
    porMateria: Array<{ libro: string; label: string; percentil: number }>;
    totalUsuarios: number;
    universidad: string;
  } | null;
}

export function BloqueCompetencias({
  competencias,
  percentil,
}: BloqueCompetenciasProps) {
  if (!competencias || competencias.length === 0) {
    return (
      <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
        <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold to-gz-burgundy" />
        <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
            <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light flex items-center gap-2">
              Mapa de competencias
              <InfoTooltip title={FEATURE_INFO.competencias.title} description={FEATURE_INFO.competencias.description} />
            </p>
          </div>
          <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
            Dominio por materia
          </span>
        </div>
        <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-12 px-5">
          Aún no hay datos de competencias. Completa actividades en distintas
          materias para ver tu mapa.
        </p>
      </section>
    );
  }

  // Truncate labels for better display in radar chart
  const SHORT_LABELS: Record<string, string> = {
    "Título Preliminar (Arts. 1–53)": "T. Preliminar",
    "Libro Primero: De las Personas (Arts. 54–564)": "L.I Personas",
    "Libro Segundo: De los Bienes, y de su Dominio, Posesión, Uso y Goce (Arts. 565–950)": "L.II Bienes",
    "Libro Tercero: De la Sucesión por Causa de Muerte, y de las Donaciones entre Vivos (Arts. 951–1436)": "L.III Sucesión",
    "Libro Cuarto: De las Obligaciones en General y de los Contratos (Arts. 1437–2524)": "L.IV Obligaciones",
    "Libro Primero: Disposiciones Comunes a Todo Procedimiento": "CPC I Comunes",
    "Libro Segundo: Del Juicio Ordinario": "CPC II Ordinario",
    "Libro Tercero: De los Juicios Especiales": "CPC III Especiales",
    "Libro Cuarto: De los Actos Judiciales No Contenciosos": "CPC IV No Contenc.",
  };

  const data = competencias.map((c) => ({
    materia: SHORT_LABELS[c.label] ?? (c.label.length > 18 ? c.label.slice(0, 16) + "…" : c.label),
    usuario: c.score,
    plataforma: 50,
  }));

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-gold to-gz-burgundy" />
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Mapa de competencias
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Dominio por materia
        </span>
      </div>

      <div className="p-5">

      {/* Radar Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
          <PolarGrid stroke={CHART_COLORS.rule} />
          <PolarAngleAxis
            dataKey="materia"
            tick={{ fontSize: 10, fill: CHART_COLORS.inkMid }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: CHART_COLORS.inkLight }}
            tickCount={5}
          />
          <Radar
            name="Plataforma"
            dataKey="plataforma"
            stroke={CHART_COLORS.rule}
            fill="none"
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
          <Radar
            name="Tu dominio"
            dataKey="usuario"
            stroke={CHART_COLORS.gold}
            fill={CHART_COLORS.gold}
            fillOpacity={0.3}
            strokeWidth={2.5}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-3 font-archivo text-[11px] text-gz-ink-mid">
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-[2px]"
            style={{ backgroundColor: CHART_COLORS.gold }}
          />
          <span>Tu dominio</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-[2px]"
            style={{
              backgroundColor: CHART_COLORS.rule,
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 3px, white 3px, white 5px)",
            }}
          />
          <span>Promedio plataforma</span>
        </div>
      </div>

      {/* Percentil badge */}
      {percentil && (
        <div className="mt-4 text-center">
          <span className="inline-block font-ibm-mono text-[10px] uppercase tracking-[1.5px] bg-gz-navy text-white px-3 py-1 rounded-full">
            Percentil {percentil.global} en {percentil.universidad}
          </span>
        </div>
      )}
      </div>
    </section>
  );
}
