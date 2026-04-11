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
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 py-8">
        {/* Page Header — full bleed */}
        <div className="gz-section-header mb-8">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
              Panel de análisis
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
                <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-none">
                  Mis Estadísticas
                </h1>
              </div>
              <p className="font-cormorant text-[16px] italic text-gz-ink-mid mt-1">
                Análisis detallado de tu rendimiento académico
              </p>
            </div>

            {/* Period selector */}
            <div className="flex items-center gap-1 bg-white border border-gz-rule rounded-[3px] p-0.5 shrink-0">
              {PERIODOS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={`font-ibm-mono text-[10px] uppercase tracking-[1px] px-3 py-1.5 rounded-[2px] transition-colors ${
                    periodo === p.value
                      ? "bg-gz-navy text-white"
                      : "text-gz-ink-mid hover:text-gz-ink hover:bg-gz-cream"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[2px] bg-gz-ink mt-3" />
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
            {/* Bloque 1: Resumen Ejecutivo */}
            <BloqueResumen resumen={data.resumen} periodo={periodo} />

            {/* Percentil (if available) */}
            {data.percentil && <PercentilBadge percentil={data.percentil} />}

            {/* Bloque 2 + 3: Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bloque 2: Mapa de Competencias */}
              <BloqueCompetencias
                competencias={data.competencias}
                percentil={data.percentil}
              />

              {/* Bloque 3: Evolución Temporal */}
              <BloqueEvolucion evolucion={data.evolucion} />
            </div>

            {/* Bloque 4 + 6: Two column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bloque 4: Distribución */}
              <BloqueDistribucion
                distribucion={data.distribucion}
                totalItems={data.totalItems}
              />

              {/* Bloque 6: Materias Olvidadas */}
              <BloqueOlvidadas
                olvidadas={data.olvidadas}
                materiasAlDia={data.actividad.materiasAlDia}
              />
            </div>

            {/* Bloque 5: Calendario de Actividad (full width) */}
            <BloqueActividad
              dias={data.actividad.dias}
              mejorRacha={data.actividad.mejorRacha}
              diaMasActivo={data.actividad.diaMasActivo}
            />
          </div>
        )}
      </div>
    </div>
  );
}
