"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

type TrendingMateria = {
  materia: string;
  count: number;
  apoyos: number;
};

type TrendingObiter = {
  id: string;
  content: string;
  citasCount: number;
  apoyosCount: number;
  userName: string;
};

type TrendingData = {
  materias: TrendingMateria[];
  mostCited: TrendingObiter | null;
  unansweredQuestion: TrendingObiter | null;
};

const MATERIA_LABELS: Record<string, string> = {
  acto_juridico: "Acto Jurídico",
  obligaciones: "Obligaciones",
  contratos: "Contratos",
  procesal_civil: "Procesal Civil",
  bienes: "Bienes",
  familia: "Familia",
  sucesiones: "Sucesiones",
  otro: "Otro",
};

// Tarjeta editorial reutilizable — rail superior + dot-kicker + sombra
// "paper-stack" simulando hojas apiladas.
function EditorialCard({
  railColor,
  kicker,
  kickerColor = "text-gz-gold",
  children,
}: {
  railColor: string; // ej: "bg-gz-gold"
  kicker: string;
  kickerColor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {/* Sombras paper-stack — capas apiladas decorativas */}
      <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-gz-rule/40 bg-white/40" aria-hidden />
      <div className="absolute inset-0 translate-x-[1.5px] translate-y-[1.5px] rounded-[3px] border border-gz-rule/60 bg-white/60" aria-hidden />

      {/* Tarjeta principal */}
      <div className="relative rounded-[3px] border border-gz-rule bg-white overflow-hidden">
        {/* Rail superior color */}
        <div className={`h-[3px] ${railColor}`} />

        <div className="p-4">
          {/* Kicker con dot */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`h-1.5 w-1.5 rounded-full ${railColor}`} />
            <span className={`font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold ${kickerColor}`}>
              {kicker}
            </span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export function ObiterTrending({
  onFilterMateria,
}: {
  onFilterMateria?: (materia: string) => void;
}) {
  const [data, setData] = useState<TrendingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrending() {
      try {
        const res = await fetch("/api/obiter/trending", {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch {
        // Silent — trending is non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchTrending();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-[3px] border border-gz-rule bg-white p-4"
          >
            <div className="mb-3 h-2.5 w-24 animate-pulse rounded bg-gz-cream-dark" />
            <div className="space-y-2">
              <div className="h-9 animate-pulse rounded bg-gz-cream-dark" />
              <div className="h-9 animate-pulse rounded bg-gz-cream-dark" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const hasMaterias = data.materias.length > 0;
  const hasMostCited = !!data.mostCited;
  const hasUnanswered = !!data.unansweredQuestion;

  // If there's nothing trending at all, show a minimal placeholder
  if (!hasMaterias && !hasMostCited && !hasUnanswered) {
    return (
      <EditorialCard railColor="bg-gz-gold" kicker="Contingencia">
        <p className="font-cormorant text-[14px] italic text-gz-ink-light leading-relaxed">
          Aún no hay suficiente actividad para mostrar contingencias. Publica un
          Obiter para empezar.
        </p>
      </EditorialCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── Materias populares ─── */}
      {hasMaterias && (
        <EditorialCard railColor="bg-gz-gold" kicker="Contingencia · Materias">
          <div className="-mx-1">
            {data.materias.map((m, idx) => {
              const max = data.materias[0]?.count ?? 1;
              const pct = Math.round((m.count / max) * 100);
              return (
                <button
                  key={m.materia}
                  onClick={() => onFilterMateria?.(m.materia)}
                  className="group relative flex w-full items-start gap-2.5 px-1 py-2 text-left transition-colors hover:bg-gz-cream-dark/30 cursor-pointer"
                >
                  <span className="w-5 font-cormorant text-[15px] !font-bold text-gz-burgundy/80 shrink-0 mt-0.5">
                    {idx + 1}.
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-archivo text-[13px] font-semibold text-gz-ink leading-tight">
                      {MATERIA_LABELS[m.materia] ?? m.materia}
                    </p>
                    {/* Mini-barra de proporción */}
                    <div className="mt-1.5 h-[3px] w-full bg-gz-cream-dark/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gz-gold transition-all duration-500 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
                      {m.count} {m.count === 1 ? "obiter" : "obiters"} ·{" "}
                      {m.apoyos} {m.apoyos === 1 ? "apoyo" : "apoyos"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </EditorialCard>
      )}

      {/* ─── Obiter más citado ─── */}
      {hasMostCited && data.mostCited && (
        <EditorialCard
          railColor="bg-gz-burgundy"
          kicker="Más citado"
          kickerColor="text-gz-burgundy"
        >
          <Link
            href={`/dashboard/diario/obiter/${data.mostCited.id}`}
            className="block group cursor-pointer"
          >
            <span className="absolute -top-1.5 left-3 font-cormorant text-[44px] !font-bold text-gz-burgundy/15 select-none leading-none">
              &ldquo;
            </span>
            <p className="relative mb-2 line-clamp-3 font-cormorant text-[15px] leading-snug text-gz-ink italic group-hover:text-gz-burgundy transition-colors">
              {data.mostCited.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gz-rule/60">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light truncate">
                — {data.mostCited.userName}
              </span>
              <span className="font-ibm-mono text-[10px] font-semibold text-gz-burgundy shrink-0">
                {data.mostCited.citasCount} {data.mostCited.citasCount === 1 ? "cita" : "citas"}
              </span>
            </div>
          </Link>
        </EditorialCard>
      )}

      {/* ─── Pregunta sin respuesta ─── */}
      {hasUnanswered && data.unansweredQuestion && (
        <EditorialCard
          railColor="bg-gz-sage"
          kicker="Pregunta sin respuesta"
          kickerColor="text-gz-sage"
        >
          <Link
            href={`/dashboard/diario/obiter/${data.unansweredQuestion.id}`}
            className="block group cursor-pointer"
          >
            <p className="mb-3 line-clamp-3 font-cormorant text-[15px] leading-snug text-gz-ink group-hover:text-gz-sage transition-colors">
              {data.unansweredQuestion.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-gz-rule/60">
              <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light truncate">
                — {data.unansweredQuestion.userName}
              </span>
              <span className="font-archivo text-[10px] font-bold uppercase tracking-[1.5px] text-gz-sage hover:text-gz-ink transition-colors shrink-0 ml-2">
                Responde →
              </span>
            </div>
          </Link>
        </EditorialCard>
      )}
    </div>
  );
}
