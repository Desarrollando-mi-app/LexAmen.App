"use client";

import { CHART_COLORS } from "@/lib/estadisticas-chart-config";

interface BloqueFunnelProps {
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
}

interface FunnelStage {
  label: string;
  value: number;
  color: string;
  pctDelTotal: number;
  pctDelAnterior: number | null;
}

export function BloqueFunnel({ competencias }: BloqueFunnelProps) {
  // Agregar globales — el funnel es: contenido total → intentado → correcto.
  let totalContenido = 0; // FC + MCQ + VF totales
  let totalIntentado = 0; // FC con repeticiones + MCQ intentos + VF intentos
  let totalCorrecto = 0; // FC dominadas (≥3 reps) + MCQ correctos + VF correctos

  for (const c of competencias) {
    totalContenido += c.fcTotal + c.mcqTotal + c.vfTotal;
    totalIntentado += c.fcTotal + c.mcqTotal + c.vfTotal; // mismo set
    // OJO: lo "intentado" real son las preguntas que tocó. Para funnel, mejor:
    //   Capa 1: contenido disponible (FC totales + MCQ totales + VF totales)
    //   Capa 2: contenido practicado (FC dominadas o repetidas + MCQ + VF)
    //   Capa 3: contenido dominado (FC ≥3 reps + MCQ correctos + VF correctos)
    totalCorrecto += c.fcDom + c.mcqCorrect + c.vfCorrect;
  }

  // Reemplazo capa 2: "practicadas/intentadas" = MCQ totales + VF totales + FC con al menos 1 review
  // Como no tenemos fcReviewed por libro acá, aproximamos: intentado = mcqTotal + vfTotal (intentos reales) + fcDom (proxy)
  // Esto es una aproximación — el dato exacto requeriría una nueva query en la API.
  totalIntentado = competencias.reduce(
    (s, c) => s + c.mcqTotal + c.vfTotal + c.fcDom,
    0,
  );

  const stages: FunnelStage[] = [
    {
      label: "Contenido disponible",
      value: totalContenido,
      color: CHART_COLORS.navy,
      pctDelTotal: 100,
      pctDelAnterior: null,
    },
    {
      label: "Practicado",
      value: totalIntentado,
      color: CHART_COLORS.gold,
      pctDelTotal: totalContenido > 0 ? (totalIntentado / totalContenido) * 100 : 0,
      pctDelAnterior: totalContenido > 0 ? (totalIntentado / totalContenido) * 100 : 0,
    },
    {
      label: "Dominado",
      value: totalCorrecto,
      color: CHART_COLORS.sage,
      pctDelTotal: totalContenido > 0 ? (totalCorrecto / totalContenido) * 100 : 0,
      pctDelAnterior: totalIntentado > 0 ? (totalCorrecto / totalIntentado) * 100 : 0,
    },
  ];

  const maxValue = Math.max(...stages.map((s) => s.value), 1);
  const isEmpty = totalContenido === 0;

  return (
    <section className="relative bg-white border border-gz-ink/15 rounded-[6px] overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04),0_8px_30px_-18px_rgba(15,15,15,0.30)]">
      {/* Rail superior */}
      <div className="h-[3px] w-full bg-gradient-to-r from-gz-navy via-gz-gold to-gz-sage" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gz-rule/60 bg-gradient-to-b from-gz-cream-dark/30 to-transparent">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-sage" />
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            Embudo de aprendizaje
          </p>
        </div>
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold bg-gz-gold/10 px-2 py-0.5 rounded-full">
          Disponible → practicado → dominado
        </span>
      </div>

      <div className="p-5">
        {isEmpty ? (
          <p className="italic text-gz-ink-light font-archivo text-[13px] text-center py-12">
            Aún no hay contenido suficiente para construir el embudo.
          </p>
        ) : (
          <div className="space-y-3">
            {stages.map((stage, idx) => {
              const widthPct = (stage.value / maxValue) * 100;
              return (
                <div key={stage.label} className="relative">
                  {/* Línea conectora entre etapas */}
                  {idx > 0 && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className="w-px h-2 bg-gz-rule" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {/* Numeración romana */}
                    <span
                      className="font-cormorant text-[20px] font-bold leading-none w-6 text-center shrink-0"
                      style={{ color: stage.color }}
                    >
                      {["I", "II", "III"][idx]}
                    </span>

                    {/* Barra trapecial */}
                    <div className="flex-1 relative">
                      <div
                        className="rounded-[4px] py-3 px-4 text-white shadow-md transition-all duration-500 mx-auto flex items-center justify-between gap-4"
                        style={{
                          width: `${widthPct}%`,
                          minWidth: 200,
                          backgroundColor: stage.color,
                          backgroundImage: `linear-gradient(135deg, ${stage.color}, ${stage.color}dd)`,
                        }}
                      >
                        <div>
                          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-white/75 leading-none">
                            {stage.label}
                          </p>
                          <p className="font-cormorant text-[26px] font-bold leading-none mt-1">
                            {stage.value.toLocaleString("es-CL")}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-cormorant text-[20px] font-bold leading-none">
                            {Math.round(stage.pctDelTotal)}%
                          </p>
                          <p className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] text-white/75">
                            del total
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Conversion del paso anterior */}
                    {stage.pctDelAnterior !== null && idx > 0 && (
                      <div className="font-ibm-mono text-[10px] text-gz-ink-mid w-16 text-right shrink-0">
                        <p
                          className="font-bold text-[14px]"
                          style={{ color: stage.color }}
                        >
                          {Math.round(stage.pctDelAnterior)}%
                        </p>
                        <p className="text-[8px] uppercase tracking-[1px] text-gz-ink-light leading-tight">
                          conv.
                        </p>
                      </div>
                    )}
                    {idx === 0 && <div className="w-16 shrink-0" />}
                  </div>
                </div>
              );
            })}

            {/* Insight footer */}
            <div className="mt-4 pt-3 border-t border-gz-rule/40">
              <p className="font-cormorant italic text-[14px] text-gz-ink-mid text-center leading-relaxed">
                {totalIntentado === 0 ? (
                  <>Empieza practicando para ver tu conversión a dominio.</>
                ) : totalCorrecto === 0 ? (
                  <>
                    Practicaste{" "}
                    <span className="text-gz-gold font-semibold">
                      {Math.round((totalIntentado / totalContenido) * 100)}%
                    </span>{" "}
                    del contenido. Sigue para dominar.
                  </>
                ) : (
                  <>
                    De cada 100 ítems disponibles, prácticas{" "}
                    <span className="text-gz-gold font-semibold">
                      {Math.round((totalIntentado / totalContenido) * 100)}
                    </span>{" "}
                    y dominas{" "}
                    <span className="text-gz-sage font-semibold">
                      {Math.round((totalCorrecto / totalContenido) * 100)}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
