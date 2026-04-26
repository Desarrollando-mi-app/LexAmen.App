"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { BloqueResumen } from "./components/bloque-resumen";
import { BloqueCompetencias } from "./components/bloque-competencias";
import { BloqueEvolucion } from "./components/bloque-evolucion";
import { BloqueDistribucion } from "./components/bloque-distribucion";
import { BloqueActividad } from "./components/bloque-actividad";
import { BloqueOlvidadas } from "./components/bloque-olvidadas";
import { PercentilBadge } from "./components/percentil-badge";
import { BloqueRamasComparado } from "./components/bloque-ramas-comparado";
import { BloqueXpRing } from "./components/bloque-xp-ring";
import { BloqueFunnel } from "./components/bloque-funnel";

// ─── Types ──────────────────────────────────────────────

interface EstadisticasData {
  resumen: {
    xp: number;
    racha: number;
    tasaAcierto: number;
    diasActivos: number;
    tendencias: {
      tasaCambio: number;
      intentosCambio: number;
    };
    frase: string;
  };
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
  evolucion: Array<{
    semana: string;
    tasa: number;
    intentos: number;
    flashcards: number;
  }>;
  distribucion: Array<{
    modulo: string;
    cantidad: number;
    porcentaje: number;
  }>;
  totalItems: number;
  actividad: {
    dias: Array<{
      date: string;
      count: number;
      detalle: { fc: number; mcq: number; vf: number; sim: number };
    }>;
    mejorRacha: number;
    diaMasActivo: string;
    materiasAlDia: number;
  };
  olvidadas: Array<{
    libro: string;
    label: string;
    diasSinPracticar: number;
    nivelDominio: number;
    enCedulario: boolean;
  }>;
  percentil: {
    global: number;
    porMateria: Array<{ libro: string; label: string; percentil: number }>;
    totalUsuarios: number;
    universidad: string;
  } | null;
  contenidoGlobal?: {
    total: number;
    practicado: number;
    dominado: number;
  };
}

// ─── Period selector ────────────────────────────────────

const PERIODOS = [
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
  { value: "90d", label: "90 días" },
  { value: "all", label: "Todo" },
] as const;

// ─── Component ──────────────────────────────────────────

export function EstadisticasClient() {
  const [periodo, setPeriodo] = useState("30d");
  const [data, setData] = useState<EstadisticasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/estadisticas?periodo=${p}`);
      if (!res.ok) throw new Error("Error al cargar estadísticas");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(periodo);
  }, [periodo, fetchData]);

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1320px] mx-auto px-4 lg:px-10 py-8">
        {/* ─── Page Header — editorial premium ─── */}
        <div className="gz-section-header mb-7 relative">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-end gap-4 mb-2">
                <Image
                  src="/brand/logo-sello.svg"
                  alt="Studio Iuris"
                  width={80}
                  height={80}
                  className="h-[60px] w-[60px] lg:h-[78px] lg:w-[78px] shrink-0"
                />
                <h1 className="font-cormorant text-[42px] sm:text-[48px] lg:text-[56px] font-bold text-gz-ink leading-[0.95] tracking-tight">
                  Mis <span className="text-gz-burgundy italic">Estadísticas</span>
                </h1>
              </div>
              <p className="font-cormorant italic text-[15px] sm:text-[16px] text-gz-ink-mid pl-1">
                Tu rendimiento bajo la lupa — datos, gráficos y tendencias.
              </p>
            </div>

            {/* Period selector — pill toggle editorial */}
            <div className="inline-flex rounded-full border border-gz-rule overflow-hidden bg-white shrink-0 self-start lg:self-end">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`font-ibm-mono text-[11px] uppercase tracking-[1.5px] px-4 py-1.5 transition-all duration-300 ease-out cursor-pointer active:scale-95 ${
                    periodo === p.value
                      ? "bg-gz-navy text-white"
                      : "text-gz-ink-mid hover:bg-gz-cream-dark/60 hover:text-gz-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Triple regla editorial */}
          <div className="mt-5 h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-gz-gold border-t-transparent rounded-full animate-spin mb-4" />
            <p className="font-archivo text-[13px] text-gz-ink-mid">
              Cargando estadísticas...
            </p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-gz-burgundy/5 border border-gz-burgundy/20 rounded-[4px] p-6 text-center">
            <p className="font-archivo text-[14px] text-gz-burgundy mb-2">
              {error}
            </p>
            <button
              onClick={() => fetchData(periodo)}
              className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors"
            >
              Reintentar →
            </button>
          </div>
        )}

        {/* Data loaded */}
        {data && !loading && (
          <div className="space-y-6 animate-gz-slide-up">
            {/* ═══ FILA 1 — Resumen ejecutivo (KPIs hero + sparklines) ═══ */}
            <BloqueResumen
              resumen={data.resumen}
              periodo={periodo}
              evolucion={data.evolucion}
            />

            {/* ═══ FILA 2 — Percentil + XP ring ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
              {data.percentil ? (
                <PercentilBadge percentil={data.percentil} />
              ) : (
                <div className="hidden lg:block" />
              )}
              <BloqueXpRing
                competencias={data.competencias}
                xpTotal={data.resumen.xp}
              />
            </div>

            {/* ═══ FILA 3 — Competencias (radar) + Evolución (line) ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BloqueCompetencias
                competencias={data.competencias}
                percentil={data.percentil}
              />
              <BloqueEvolucion evolucion={data.evolucion} />
            </div>

            {/* ═══ FILA 4 — Comparativo por rama (full width) ═══ */}
            <BloqueRamasComparado competencias={data.competencias} />

            {/* ═══ FILA 5 — Funnel + Distribución ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BloqueFunnel
                competencias={data.competencias}
                contenidoGlobal={data.contenidoGlobal}
              />
              <BloqueDistribucion
                distribucion={data.distribucion}
                totalItems={data.totalItems}
              />
            </div>

            {/* ═══ FILA 6 — Calendario de actividad (full width heatmap) ═══ */}
            <BloqueActividad
              dias={data.actividad.dias}
              mejorRacha={data.actividad.mejorRacha}
              diaMasActivo={data.actividad.diaMasActivo}
            />

            {/* ═══ FILA 7 — Materias olvidadas (full width) ═══ */}
            <BloqueOlvidadas
              olvidadas={data.olvidadas}
              materiasAlDia={data.actividad.materiasAlDia}
            />
          </div>
        )}
      </div>
    </div>
  );
}
