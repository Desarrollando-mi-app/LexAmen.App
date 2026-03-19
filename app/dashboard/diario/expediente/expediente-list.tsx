"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface ExpedienteSummary {
  id: string;
  numero: number;
  titulo: string;
  rama: string;
  materias: string | null;
  estado: string;
  bandoDemandante: string;
  bandoDemandado: string;
  fechaApertura: string;
  fechaCierre: string;
  totalArgumentos: number;
  demandanteCount: number;
  demandadoCount: number;
  mejorAlegato: {
    authorName: string;
    authorAvatar: string | null;
    votos: number;
  } | null;
}

// ─── Countdown Hook ─────────────────────────────────────────

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeLeft(new Date(targetDate))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(targetDate)));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function getTimeLeft(target: Date) {
  const now = Date.now();
  const diff = target.getTime() - now;
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds, expired: false };
}

function CountdownDisplay({ fechaCierre }: { fechaCierre: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(fechaCierre);

  if (expired) {
    return (
      <span className="font-ibm-mono text-[11px] font-semibold text-gz-burgundy">
        CERRADO
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1 font-ibm-mono text-[11px] tracking-[0.5px] text-gz-ink">
      <span className="text-gz-ink-light">Cierra en</span>
      {days > 0 && (
        <span className="rounded bg-gz-navy/10 px-1.5 py-0.5 font-semibold">
          {days}d
        </span>
      )}
      <span className="rounded bg-gz-navy/10 px-1.5 py-0.5 font-semibold">
        {String(hours).padStart(2, "0")}h
      </span>
      <span className="rounded bg-gz-navy/10 px-1.5 py-0.5 font-semibold">
        {String(minutes).padStart(2, "0")}m
      </span>
      <span className="rounded bg-gz-navy/10 px-1.5 py-0.5 font-semibold">
        {String(seconds).padStart(2, "0")}s
      </span>
    </div>
  );
}

// ─── Bando Split Bar ────────────────────────────────────────

function BandoSplitBar({
  demandanteCount,
  demandadoCount,
  bandoDemandante,
  bandoDemandado,
}: {
  demandanteCount: number;
  demandadoCount: number;
  bandoDemandante: string;
  bandoDemandado: string;
}) {
  const total = demandanteCount + demandadoCount;
  const demPct = total > 0 ? Math.round((demandanteCount / total) * 100) : 50;
  const defPct = total > 0 ? 100 - demPct : 50;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-ibm-mono text-[9px] tracking-[0.5px]">
        <span className="text-gz-gold">{bandoDemandante} ({demPct}%)</span>
        <span className="text-gz-burgundy">{bandoDemandado} ({defPct}%)</span>
      </div>
      <div className="flex h-[6px] overflow-hidden rounded-full bg-gz-cream-dark">
        <div
          className="bg-gz-gold transition-all duration-500"
          style={{ width: `${demPct}%` }}
        />
        <div
          className="bg-gz-burgundy transition-all duration-500"
          style={{ width: `${defPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Rama Label ─────────────────────────────────────────────

const RAMA_LABELS: Record<string, string> = {
  DERECHO_CIVIL: "Derecho Civil",
  DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil",
  DERECHO_ORGANICO: "Derecho Organico",
};

// ─── Main Component ─────────────────────────────────────────

export function ExpedienteList({
  expedientes,
}: {
  expedientes: ExpedienteSummary[];
}) {
  const activo = expedientes.find((e) => e.estado === "abierto");
  const cerrados = expedientes.filter((e) => e.estado !== "abierto");

  return (
    <div className="space-y-8">
      {/* ── Active Expediente ────────────────────────────────── */}
      {activo && (
        <div className="rounded-[4px] border-2 border-gz-gold bg-white p-6 shadow-sm">
          {/* Label */}
          <div className="mb-3 flex items-center justify-between">
            <p className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[2px] text-gz-gold">
              Expediente N&deg; {activo.numero}
            </p>
            <span className="rounded-full bg-green-100 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-green-700">
              Abierto
            </span>
          </div>

          {/* Title */}
          <h2 className="mb-3 font-cormorant text-[26px] font-bold leading-tight text-gz-ink">
            {activo.titulo}
          </h2>

          {/* Rama + Materias */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-sm bg-gz-navy/10 px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-navy">
              {RAMA_LABELS[activo.rama] ?? activo.rama}
            </span>
            {activo.materias &&
              activo.materias.split(",").map((m) => (
                <span
                  key={m.trim()}
                  className="rounded-sm bg-gz-gold/[0.08] px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-gold"
                >
                  {m.trim()}
                </span>
              ))}
          </div>

          {/* Countdown */}
          <div className="mb-4">
            <CountdownDisplay fechaCierre={activo.fechaCierre} />
          </div>

          {/* Stats */}
          <div className="mb-4 flex items-center gap-4 font-ibm-mono text-[11px] text-gz-ink-light">
            <span>{activo.totalArgumentos} argumentos</span>
            <span className="text-gz-rule-dark">|</span>
            <span>
              {activo.demandanteCount + activo.demandadoCount} participantes
            </span>
          </div>

          {/* Bando Split Bar */}
          <div className="mb-5">
            <BandoSplitBar
              demandanteCount={activo.demandanteCount}
              demandadoCount={activo.demandadoCount}
              bandoDemandante={activo.bandoDemandante}
              bandoDemandado={activo.bandoDemandado}
            />
          </div>

          {/* CTA */}
          <Link
            href={`/dashboard/diario/expediente/${activo.id}`}
            className="inline-block rounded-[3px] bg-gz-navy px-6 py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            Leer caso y argumentar &rarr;
          </Link>
        </div>
      )}

      {/* ── Closed Expedientes ───────────────────────────────── */}
      {cerrados.length > 0 && (
        <div>
          <h3 className="mb-4 font-ibm-mono text-[10px] font-semibold uppercase tracking-[2px] text-gz-ink-mid">
            Expedientes Cerrados
          </h3>
          <div className="space-y-3">
            {cerrados.map((exp) => (
              <Link
                key={exp.id}
                href={`/dashboard/diario/expediente/${exp.id}`}
                className="block rounded-[4px] border border-gz-rule bg-white p-4 transition-colors hover:border-gz-gold/40"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
                        N&deg; {exp.numero}
                      </span>
                      <span className="rounded-sm bg-gz-burgundy/10 px-1.5 py-0.5 font-ibm-mono text-[8px] font-semibold uppercase text-gz-burgundy">
                        Cerrado
                      </span>
                    </div>
                    <h4 className="mb-1 font-cormorant text-[17px] font-bold text-gz-ink">
                      {exp.titulo}
                    </h4>
                    <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                      Cerrado el{" "}
                      {new Date(exp.fechaCierre).toLocaleDateString("es-CL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {exp.totalArgumentos} argumentos
                    </p>
                  </div>

                  {/* Best argument author */}
                  {exp.mejorAlegato && (
                    <div className="flex-shrink-0 text-right">
                      <p className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-gold">
                        Mejor alegato
                      </p>
                      <p className="font-archivo text-[12px] font-semibold text-gz-ink">
                        {exp.mejorAlegato.authorName}
                      </p>
                      <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                        {exp.mejorAlegato.votos} votos
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── No expedientes ───────────────────────────────────── */}
      {!activo && cerrados.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-2 font-cormorant text-[20px] italic text-gz-ink-light">
            Aun no hay expedientes publicados.
          </p>
          <p className="font-archivo text-[13px] text-gz-ink-light">
            Vuelve pronto o propone un caso para debatir.
          </p>
        </div>
      )}

      {/* ── Proponer caso ────────────────────────────────────── */}
      <div className="rounded-[4px] border border-dashed border-gz-rule bg-gz-cream-dark/30 p-6 text-center">
        <p className="mb-2 font-cormorant text-[18px] font-bold text-gz-ink">
          Tienes un caso interesante?
        </p>
        <p className="mb-4 font-archivo text-[13px] text-gz-ink-mid">
          Propone un caso para que la comunidad lo debata.
        </p>
        <Link
          href="/dashboard/diario/expediente/proponer"
          className="inline-block rounded-[3px] border border-gz-gold bg-gz-gold/[0.06] px-5 py-2.5 font-archivo text-[13px] font-semibold text-gz-gold transition-colors hover:bg-gz-gold hover:text-white"
        >
          Proponer un caso
        </Link>
      </div>
    </div>
  );
}
