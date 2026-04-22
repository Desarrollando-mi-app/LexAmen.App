"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BADGE_RULES } from "@/lib/badge-constants";

// ─── Compact Badges Component ─────────────────────────

function CompactBadges({ badges, totalBadges }: { badges: UserBadgeData[]; totalBadges: number }) {
  // Sort by earnedAt desc to get most recent
  const sorted = [...badges].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );
  const recent = sorted.slice(0, 3);
  const badgeMap = Object.fromEntries(BADGE_RULES.map((b) => [b.slug, b]));

  return (
    <div className="border border-gz-rule rounded-sm p-5" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-cormorant text-[18px] !font-bold text-gz-ink">
          Mis Insignias
        </h3>
        <span className="font-ibm-mono text-[10px] text-gz-ink-light">
          {badges.length}/{totalBadges}
        </span>
      </div>

      {recent.length === 0 ? (
        <p className="font-archivo text-[13px] text-gz-ink-light italic text-center py-6">
          Aún no has desbloqueado insignias
        </p>
      ) : (
        <div className="flex flex-col items-center gap-2">
          {/* Top: most recent badge (large) */}
          {recent[0] && (() => {
            const b = badgeMap[recent[0].badge];
            return (
              <div className="flex flex-col items-center">
                <span
                  className="text-[48px] drop-shadow-sm"
                  style={{ filter: "drop-shadow(0 0 8px rgba(154,114,48,0.3))" }}
                >
                  {b?.emoji ?? "🏅"}
                </span>
                <span className="font-ibm-mono text-[10px] text-gz-ink-mid mt-1">
                  {b?.label ?? recent[0].badge}
                </span>
              </div>
            );
          })()}

          {/* Bottom row: 2nd and 3rd (smaller) */}
          {recent.length > 1 && (
            <div className="flex items-end gap-8">
              {recent.slice(1, 3).map((badge, i) => {
                const b = badgeMap[badge.badge];
                return (
                  <div key={badge.badge} className="flex flex-col items-center">
                    <span className={i === 0 ? "text-[36px]" : "text-[28px]"}>
                      {b?.emoji ?? "🏅"}
                    </span>
                    <span className="font-ibm-mono text-[9px] text-gz-ink-light mt-0.5">
                      {b?.label ?? badge.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 text-center">
        <Link
          href="/dashboard/insignias"
          className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
        >
          Ver todas las insignias →
        </Link>
      </div>
    </div>
  );
}

// ─── Types ─────────────────────────────────────────────

export interface UserBadgeData {
  badge: string;
  earnedAt: string;
}

export interface ColegaData {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface AyudantiaData {
  id: string;
  type: string; // "OFREZCO" | "BUSCO"
  materia: string;
  description: string;
  format: string;
  priceType: string;
  priceAmount: number | null;
  universidad: string;
  user: { firstName: string };
}

export interface ExpedienteActivoData {
  id: string;
  numero: number;
  titulo: string;
  fechaCierre: string;
  _count: { argumentos: number };
}

export interface SalaResumenData {
  proximoEvento: {
    titulo: string;
    fecha: string;
    lugar: string | null;
    interesadosCount: number;
  } | null;
  pasantiasNuevas: number;
  ayudantiasActivas: number;
}

interface GzCommunityProps {
  badges: UserBadgeData[];
  colegas: ColegaData[];
  ayudantias: AyudantiaData[];
  userId: string;
  salaResumen?: SalaResumenData;
  expedienteActivo?: ExpedienteActivoData | null;
}

// ─── Helpers ───────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function formatPrice(priceType: string, amount: number | null): string {
  if (priceType === "GRATIS") return "Gratis";
  if (priceType === "A_CONVENIR") return "A convenir";
  if (amount) return `$${new Intl.NumberFormat("es-CL").format(amount)}/hr`;
  return "";
}

// ─── Component ─────────────────────────────────────────

function useCountdown(targetDate: string | undefined) {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    if (!targetDate) return;
    function calc() {
      const diff = new Date(targetDate!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Cerrado"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setTimeLeft(`${d}d ${h}h`);
      else setTimeLeft(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [targetDate]);
  return timeLeft;
}

export function GzCommunity({
  badges,
  colegas,
  ayudantias,
  salaResumen,
  expedienteActivo,
}: GzCommunityProps) {
  return (
    <div
      className="animate-gz-slide-up"
      style={{ animationDelay: "0.4s" }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-cormorant text-[22px] !font-bold text-gz-ink whitespace-nowrap">
          Comunidad
        </h2>
        <div className="flex-1 h-px bg-gz-rule" />
        <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold whitespace-nowrap">
          Insignias &middot; Colegas &middot; Profesi&oacute;n
        </span>
      </div>

      {/* Vertical stack */}
      <div className="flex flex-col">
        {/* Row 1: Insignias (compact pyramidal view) */}
        <div className="border-b border-gz-rule pb-6 mb-6">
          <CompactBadges badges={badges} totalBadges={BADGE_RULES.length} />
        </div>

        {/* Row 2: Colegas */}
        <div className="border-b border-gz-rule pb-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                Tu red de estudio
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
                Colegas
              </h3>
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mb-3">
                Conecta con otros estudiantes para estudiar juntos, compartir apuntes y motivarse mutuamente.
              </p>
              <Link
                href="/dashboard/colegas"
                className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
              >
                Ver todos los colegas →
              </Link>
            </div>
            <div>
              {colegas.length === 0 ? (
                <p className="text-[13px] text-gz-ink-light italic font-cormorant">
                  A&uacute;n no tienes colegas. &iexcl;Env&iacute;a tu primera solicitud!
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {colegas.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2.5 py-2 border-b border-gz-cream-dark last:border-b-0"
                    >
                      <div className="w-7 h-7 rounded-full bg-gz-navy text-gz-gold-bright flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <span className="text-[13px] font-semibold text-gz-ink flex-1 truncate">
                        {c.firstName} {c.lastName[0]}.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 3: Profesión */}
        <div className={expedienteActivo ? "border-b border-gz-rule pb-6 mb-6" : ""}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                Novedades
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
                Profesi&oacute;n
              </h3>

              {/* Próximo evento */}
              {salaResumen?.proximoEvento && (
                <div className="py-2.5 border-b border-gz-cream-dark mb-2">
                  <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-navy mb-1">
                    Pr&oacute;ximo evento
                  </p>
                  <p className="font-cormorant text-[15px] !font-bold text-gz-ink">
                    {salaResumen.proximoEvento.titulo}
                  </p>
                  <p className="text-[11px] text-gz-ink-light mt-0.5">
                    {new Date(salaResumen.proximoEvento.fecha).toLocaleDateString("es-CL", { weekday: "short", day: "numeric", month: "short" })}
                    {salaResumen.proximoEvento.lugar && ` · ${salaResumen.proximoEvento.lugar}`}
                    {" · "}{salaResumen.proximoEvento.interesadosCount} interesado{salaResumen.proximoEvento.interesadosCount !== 1 ? "s" : ""}
                  </p>
                </div>
              )}

              {/* Quick counts */}
              {salaResumen && (salaResumen.pasantiasNuevas > 0 || salaResumen.ayudantiasActivas > 0) && (
                <div className="py-2.5 border-b border-gz-cream-dark space-y-1 mb-2">
                  {salaResumen.pasantiasNuevas > 0 && (
                    <p className="text-[12px] text-gz-ink-mid">
                      {salaResumen.pasantiasNuevas} pasant&iacute;a{salaResumen.pasantiasNuevas !== 1 ? "s" : ""} nueva{salaResumen.pasantiasNuevas !== 1 ? "s" : ""} esta semana
                    </p>
                  )}
                  {salaResumen.ayudantiasActivas > 0 && (
                    <p className="text-[12px] text-gz-ink-mid">
                      {salaResumen.ayudantiasActivas} ayudant&iacute;a{salaResumen.ayudantiasActivas !== 1 ? "s" : ""} disponible{salaResumen.ayudantiasActivas !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              <Link
                href="/dashboard/sala"
                className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block mt-2"
              >
                Entrar a Profesi&oacute;n →
              </Link>
            </div>
            <div>
              {ayudantias.length > 0 ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  {ayudantias.map((a) => (
                    <div
                      key={a.id}
                      className="flex-1 py-2.5 px-3 border border-gz-cream-dark rounded-sm"
                    >
                      <p
                        className={`font-ibm-mono text-[9px] uppercase tracking-[1.5px] mb-1 ${
                          a.type === "OFREZCO" ? "text-gz-sage" : "text-gz-burgundy"
                        }`}
                      >
                        {a.type === "OFREZCO"
                          ? "Ofrezco ayudantía"
                          : "Busco ayudantía"}
                      </p>
                      <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
                        {a.materia}
                      </p>
                      <p className="text-[11px] text-gz-ink-light mt-0.5">
                        {a.user.firstName} &middot; {a.universidad} &middot;{" "}
                        {formatPrice(a.priceType, a.priceAmount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : !salaResumen?.proximoEvento ? (
                <p className="text-[13px] text-gz-ink-light italic font-cormorant">
                  No hay novedades en Profesi&oacute;n.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Row 4: Expediente Abierto */}
        {expedienteActivo && (
          <ExpedienteActivoCard expediente={expedienteActivo} />
        )}
      </div>
    </div>
  );
}

/* ─── Expediente Activo mini-card ─── */
function ExpedienteActivoCard({ expediente }: { expediente: ExpedienteActivoData }) {
  const countdown = useCountdown(expediente.fechaCierre);
  const argCount = expediente._count.argumentos;

  return (
    <div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
        <div>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
            Debate activo
          </p>
          <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
            Expediente Abierto
          </h3>
          <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid mb-3">
            Participa en el debate jur&iacute;dico abierto. Argumenta tu posici&oacute;n y vota por los mejores alegatos.
          </p>
          <Link
            href={`/dashboard/diario/expediente/${expediente.id}`}
            className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
          >
            Leer y argumentar &rarr;
          </Link>
        </div>
        <div>
          <div
            className="py-3 px-4 rounded-sm"
            style={{ borderLeft: "3px solid var(--gz-gold)", backgroundColor: "rgba(var(--gz-gold-rgb, 154, 114, 48), 0.04)" }}
          >
            <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-1">
              Expediente N.{expediente.numero}
            </p>
            <p className="font-cormorant text-[16px] !font-bold text-gz-ink leading-snug mb-2">
              {expediente.titulo}
            </p>
            <div className="flex items-center gap-3">
              <span className="font-ibm-mono text-[10px] text-gz-ink-mid">
                Cierra en: <span className="font-semibold text-gz-ink">{countdown}</span>
              </span>
              <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                {argCount} argumento{argCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
