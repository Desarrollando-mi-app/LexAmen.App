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
      <div className="rounded-[4px] border border-gz-rule bg-white p-4">
        <div className="mb-3 h-3 w-24 animate-pulse rounded bg-gz-cream-dark" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded bg-gz-cream-dark"
            />
          ))}
        </div>
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
      <div className="rounded-[4px] border border-gz-rule bg-white p-4">
        <p className="mb-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
          📊 Contingencia
        </p>
        <p className="font-cormorant text-[14px] italic text-gz-ink-light">
          Aún no hay suficiente actividad para mostrar contingencias. ¡Publica un
          Obiter para empezar!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-4">
      {/* ── Materias populares ──────────────────────────────── */}
      {hasMaterias && (
        <>
          <p className="mb-3 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
            📊 Contingencia
          </p>

          <div className="mb-1">
            <p className="mb-2 font-archivo text-[11px] font-medium text-gz-ink-mid">
              Materias populares
            </p>
            {data.materias.map((m, idx) => (
              <button
                key={m.materia}
                onClick={() => onFilterMateria?.(m.materia)}
                className="flex w-full items-start gap-2.5 py-2 text-left transition-colors hover:bg-gz-cream-dark/30"
              >
                <span className="w-4 font-ibm-mono text-[11px] font-bold text-gz-ink-light">
                  {idx + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-archivo text-[13px] font-semibold text-gz-ink">
                    {MATERIA_LABELS[m.materia] ?? m.materia}
                  </p>
                  <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                    {m.count} {m.count === 1 ? "obiter" : "obiters"} ·{" "}
                    {m.apoyos} {m.apoyos === 1 ? "apoyo" : "apoyos"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Obiter más citado ──────────────────────────────── */}
      {hasMostCited && data.mostCited && (
        <>
          <div className="mx-0 my-4 border-t border-gz-cream-dark" />
          <p className="mb-2 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
            🔥 Obiter más citado
          </p>

          <Link
            href={`/dashboard/diario/obiter/${data.mostCited.id}`}
            className="mt-2 block cursor-pointer rounded-[3px] border border-gz-rule p-3 transition-colors hover:border-gz-gold"
          >
            <p className="mb-1 line-clamp-2 font-cormorant text-[14px] text-gz-ink">
              &ldquo;{data.mostCited.content}&rdquo;
            </p>
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {data.mostCited.userName} · {data.mostCited.citasCount}{" "}
              {data.mostCited.citasCount === 1 ? "cita" : "citas"}
            </p>
          </Link>
        </>
      )}

      {/* ── Pregunta sin respuesta ─────────────────────────── */}
      {hasUnanswered && data.unansweredQuestion && (
        <>
          <div className="mx-0 my-4 border-t border-gz-cream-dark" />
          <p className="mb-2 font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
            ❓ Pregunta sin respuesta
          </p>

          <Link
            href={`/dashboard/diario/obiter/${data.unansweredQuestion.id}`}
            className="mt-2 block cursor-pointer rounded-[3px] border border-gz-rule p-3 transition-colors hover:border-gz-gold"
          >
            <p className="mb-1 line-clamp-2 font-cormorant text-[14px] text-gz-ink">
              &ldquo;{data.unansweredQuestion.content}&rdquo;
            </p>
            <div className="flex items-center justify-between">
              <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                {data.unansweredQuestion.userName} ·{" "}
                {data.unansweredQuestion.apoyosCount} apoyos · 0 citas
              </p>
              <span className="font-archivo text-[10px] font-semibold text-gz-gold">
                ¡Responde!
              </span>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}
