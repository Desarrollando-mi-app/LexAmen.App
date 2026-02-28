"use client";

import { useState } from "react";

// ─── Tipos ──────────────────────────────────────────────────

type SubmatProgress = {
  total: number;
  dominated: number;
  completions: number;
};

export type ProgressData = Record<string, SubmatProgress>;

type Titulo = {
  label: string;
  submaterias: string[];
};

type Materia = {
  label: string;
  titulos: Titulo[];
};

type Unidad = {
  unidad: string;
  label: string;
  materias: Materia[];
};

// ─── Mapa curricular ───────────────────────────────────────

const CURRICULUM: Unidad[] = [
  {
    unidad: "DERECHO_CIVIL_1",
    label: "Unidad 1 — Derecho Civil I",
    materias: [
      {
        label: "El Derecho, el Ordenamiento Jurídico y la Ley",
        titulos: [
          {
            label: "El Derecho y el Ordenamiento Jurídico",
            submaterias: [
              "REGULACION_CONDUCTA",
              "CONCEPTO_DERECHO",
              "ORDENAMIENTO_JURIDICO",
              "NORMA_JURIDICA",
              "COMPONENTES_NORMA",
              "TAXONOMIA_NORMAS",
              "COSTUMBRE_JURISPRUDENCIA",
              "ESTADO_DE_DERECHO",
            ],
          },
          {
            label: "Teoría de la Ley",
            submaterias: [
              "ORIGEN_DEFINICION_LEY",
              "REQUISITOS_CARACTERISTICAS",
              "CLASIFICACION_LEYES",
              "JERARQUIA_NORMAS",
              "CONSTITUCIONALIDAD",
              "POTESTAD_REGLAMENTARIA",
              "DECRETOS_Y_DFL",
              "INTERPRETACION_LEY",
              "INTEGRACION_LEY",
              "EFECTOS_LEY",
            ],
          },
          {
            label: "El Derecho Civil y su Codificación",
            submaterias: [
              "CONCEPTO_ORIGEN_DERECHO_CIVIL",
              "CODIFICACION_CODIGO_CIVIL",
              "ESTRUCTURA_PROYECCION",
              "PRINCIPIOS_FUNDAMENTALES",
              "DERECHO_CIVIL_ACTUALIDAD",
            ],
          },
          {
            label: "La relación jurídica, el deber y los derechos subjetivos",
            submaterias: [],
          },
        ],
      },
      {
        label: "Los Sujetos de Derecho",
        titulos: [
          {
            label: "Las Personas Naturales",
            submaterias: ["PERSONA_NATURAL", "MUERTE_PRESUNTA"],
          },
          {
            label: "Las Personas Jurídicas",
            submaterias: ["NATURALEZA_CLASIFICACION", "RESPONSABILIDAD"],
          },
          {
            label: "Los Atributos de la Personalidad",
            submaterias: [
              "ATRIBUTOS_PERSONALIDAD",
              "NOMBRE_ESTADO_CIVIL",
              "CAPACIDAD_PATRIMONIO",
              "DOMICILIO",
            ],
          },
        ],
      },
    ],
  },
  {
    unidad: "DERECHO_CIVIL_2",
    label: "Unidad 2 — Acto Jurídico",
    materias: [],
  },
  {
    unidad: "DERECHO_CIVIL_3",
    label: "Unidad 3 — Derecho de Bienes",
    materias: [],
  },
];

// ─── Labels legibles para submaterias ──────────────────────

const SUBMATERIA_LABELS: Record<string, string> = {
  REGULACION_CONDUCTA: "Regulación de la Conducta",
  CONCEPTO_DERECHO: "Concepto de Derecho",
  ORDENAMIENTO_JURIDICO: "Ordenamiento Jurídico",
  NORMA_JURIDICA: "Norma Jurídica",
  COMPONENTES_NORMA: "Componentes de la Norma",
  TAXONOMIA_NORMAS: "Taxonomía de las Normas",
  COSTUMBRE_JURISPRUDENCIA: "Costumbre y Jurisprudencia",
  ESTADO_DE_DERECHO: "Estado de Derecho",
  ORIGEN_DEFINICION_LEY: "Origen y Definición de la Ley",
  REQUISITOS_CARACTERISTICAS: "Requisitos y Características",
  CLASIFICACION_LEYES: "Clasificación de las Leyes",
  JERARQUIA_NORMAS: "Jerarquía de las Normas",
  CONSTITUCIONALIDAD: "Constitucionalidad",
  POTESTAD_REGLAMENTARIA: "Potestad Reglamentaria",
  DECRETOS_Y_DFL: "Decretos y DFL",
  INTERPRETACION_LEY: "Interpretación de la Ley",
  INTEGRACION_LEY: "Integración de la Ley",
  EFECTOS_LEY: "Efectos de la Ley",
  CONCEPTO_ORIGEN_DERECHO_CIVIL: "Concepto y Origen del Derecho Civil",
  CODIFICACION_CODIGO_CIVIL: "Codificación y Código Civil",
  ESTRUCTURA_PROYECCION: "Estructura y Proyección",
  PRINCIPIOS_FUNDAMENTALES: "Principios Fundamentales",
  DERECHO_CIVIL_ACTUALIDAD: "Derecho Civil en la Actualidad",
  PERSONA_NATURAL: "Persona Natural",
  MUERTE_PRESUNTA: "Muerte Presunta",
  NATURALEZA_CLASIFICACION: "Naturaleza y Clasificación",
  RESPONSABILIDAD: "Responsabilidad",
  ATRIBUTOS_PERSONALIDAD: "Atributos de la Personalidad",
  NOMBRE_ESTADO_CIVIL: "Nombre y Estado Civil",
  CAPACIDAD_PATRIMONIO: "Capacidad y Patrimonio",
  DOMICILIO: "Domicilio",
};

// ─── Funciones de cálculo ──────────────────────────────────

function getSubPercent(data: ProgressData, sub: string): number {
  const d = data[sub];
  if (!d || d.total === 0) return 0;
  return Math.round((d.dominated / d.total) * 100);
}

function getTituloPercent(data: ProgressData, titulo: Titulo): number {
  const subs = titulo.submaterias.filter(
    (s) => data[s] && data[s].total > 0
  );
  if (subs.length === 0) return 0;
  return Math.round(subs.reduce((sum, s) => sum + getSubPercent(data, s), 0) / subs.length);
}

function getMateriaPercent(data: ProgressData, materia: Materia): number {
  const tits = materia.titulos.filter((t) =>
    t.submaterias.some((s) => data[s] && data[s].total > 0)
  );
  if (tits.length === 0) return 0;
  return Math.round(
    tits.reduce((sum, t) => sum + getTituloPercent(data, t), 0) / tits.length
  );
}

function getUnidadPercent(data: ProgressData, unidad: Unidad): number {
  if (unidad.materias.length === 0) return 0;
  const mats = unidad.materias.filter((m) =>
    m.titulos.some((t) =>
      t.submaterias.some((s) => data[s] && data[s].total > 0)
    )
  );
  if (mats.length === 0) return 0;
  return Math.round(
    mats.reduce((sum, m) => sum + getMateriaPercent(data, m), 0) / mats.length
  );
}

function getMaxCompletions(data: ProgressData, submaterias: string[]): number {
  return submaterias.reduce(
    (max, s) => Math.max(max, data[s]?.completions ?? 0),
    0
  );
}

// ─── Chevron icon ──────────────────────────────────────────

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-navy/40 transition-transform duration-200 ${
        open ? "rotate-90" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

// ─── Barra de progreso ─────────────────────────────────────

function ProgressBar({
  percent,
  size = "md",
}: {
  percent: number;
  size?: "sm" | "md";
}) {
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={`${h} w-full overflow-hidden rounded-full bg-border/30`}>
      <div
        className={`${h} rounded-full transition-all duration-500 ${
          percent >= 100 ? "bg-green-500" : "bg-gold"
        }`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

// ─── Badge de vuelta ───────────────────────────────────────

function VueltaBadge({ completions }: { completions: number }) {
  if (completions < 1) return null;
  return (
    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
      Vuelta {completions + 1}
    </span>
  );
}

// ─── Componente principal ──────────────────────────────────

export function CurriculumProgress({
  progressData,
}: {
  progressData: ProgressData;
}) {
  const [openUnidad, setOpenUnidad] = useState<string | null>(
    "DERECHO_CIVIL_1"
  );
  const [openMateria, setOpenMateria] = useState<string | null>(null);
  const [openTitulo, setOpenTitulo] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {CURRICULUM.map((unidad) => {
        const isUnidadOpen = openUnidad === unidad.unidad;
        const unidadPercent = getUnidadPercent(progressData, unidad);

        return (
          <div
            key={unidad.unidad}
            className="overflow-hidden rounded-xl border border-border bg-white"
          >
            {/* Header unidad */}
            <button
              onClick={() =>
                setOpenUnidad(isUnidadOpen ? null : unidad.unidad)
              }
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-paper/50"
            >
              <Chevron open={isUnidadOpen} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">
                    {unidad.label}
                  </span>
                  {unidadPercent > 0 && (
                    <span className="text-xs text-navy/40">
                      {unidadPercent}%
                    </span>
                  )}
                </div>
                {unidad.materias.length > 0 && (
                  <div className="mt-1.5">
                    <ProgressBar percent={unidadPercent} size="sm" />
                  </div>
                )}
              </div>
            </button>

            {/* Contenido unidad */}
            {isUnidadOpen && (
              <div className="border-t border-border/50 px-5 pb-4">
                {unidad.materias.length === 0 ? (
                  <p className="py-4 text-center text-sm italic text-navy/30">
                    Proximamente
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {unidad.materias.map((materia, mIdx) => {
                      const materiaKey = `${unidad.unidad}-m${mIdx}`;
                      const isMateriaOpen = openMateria === materiaKey;
                      const materiaPercent = getMateriaPercent(
                        progressData,
                        materia
                      );

                      return (
                        <div
                          key={materiaKey}
                          className="rounded-lg border border-border/40 bg-paper/30"
                        >
                          {/* Header materia */}
                          <button
                            onClick={() =>
                              setOpenMateria(
                                isMateriaOpen ? null : materiaKey
                              )
                            }
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/60"
                          >
                            <Chevron open={isMateriaOpen} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-navy/80">
                                  {materia.label}
                                </span>
                                <span className="text-xs text-navy/40">
                                  {materiaPercent}%
                                </span>
                              </div>
                              <div className="mt-1">
                                <ProgressBar
                                  percent={materiaPercent}
                                  size="sm"
                                />
                              </div>
                            </div>
                          </button>

                          {/* Contenido materia */}
                          {isMateriaOpen && (
                            <div className="border-t border-border/30 px-4 pb-3">
                              <div className="mt-2 space-y-2">
                                {materia.titulos.map((titulo, tIdx) => {
                                  const tituloKey = `${materiaKey}-t${tIdx}`;
                                  const isTituloOpen =
                                    openTitulo === tituloKey;
                                  const tituloPercent = getTituloPercent(
                                    progressData,
                                    titulo
                                  );
                                  const allSubs = titulo.submaterias.flatMap(
                                    (s) => s
                                  );
                                  const maxComp = getMaxCompletions(
                                    progressData,
                                    allSubs
                                  );

                                  return (
                                    <div
                                      key={tituloKey}
                                      className="rounded-md border border-border/30 bg-white/60"
                                    >
                                      {/* Header título */}
                                      <button
                                        onClick={() =>
                                          setOpenTitulo(
                                            isTituloOpen ? null : tituloKey
                                          )
                                        }
                                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-paper/40"
                                      >
                                        <Chevron open={isTituloOpen} />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-navy/70">
                                              {titulo.label}
                                            </span>
                                            {titulo.submaterias.length > 0 && (
                                              <span className="text-xs text-navy/35">
                                                {tituloPercent}%
                                              </span>
                                            )}
                                            {maxComp >= 1 && (
                                              <VueltaBadge
                                                completions={maxComp}
                                              />
                                            )}
                                          </div>
                                          {titulo.submaterias.length > 0 && (
                                            <div className="mt-1">
                                              <ProgressBar
                                                percent={tituloPercent}
                                                size="sm"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </button>

                                      {/* Contenido título — submaterias */}
                                      {isTituloOpen && (
                                        <div className="border-t border-border/20 px-3 pb-3">
                                          {titulo.submaterias.length === 0 ? (
                                            <p className="py-3 text-center text-xs italic text-navy/25">
                                              Sin contenido aun
                                            </p>
                                          ) : (
                                            <div className="mt-2 space-y-3">
                                              {titulo.submaterias.map(
                                                (sub) => {
                                                  const d =
                                                    progressData[sub];
                                                  const pct =
                                                    getSubPercent(
                                                      progressData,
                                                      sub
                                                    );
                                                  const comp =
                                                    d?.completions ?? 0;
                                                  const total =
                                                    d?.total ?? 0;
                                                  const dom =
                                                    d?.dominated ?? 0;

                                                  return (
                                                    <div key={sub}>
                                                      <div className="mb-1 flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                          <span className="text-xs font-medium text-navy/60">
                                                            {SUBMATERIA_LABELS[
                                                              sub
                                                            ] ?? sub}
                                                          </span>
                                                          {comp >= 1 && (
                                                            <VueltaBadge
                                                              completions={
                                                                comp
                                                              }
                                                            />
                                                          )}
                                                        </div>
                                                        <span className="text-xs text-navy/35">
                                                          {total > 0
                                                            ? `${dom}/${total} · ${pct}%`
                                                            : "Sin contenido aun"}
                                                        </span>
                                                      </div>
                                                      {total > 0 && (
                                                        <ProgressBar
                                                          percent={pct}
                                                        />
                                                      )}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
