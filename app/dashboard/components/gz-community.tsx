import Link from "next/link";
import { BADGE_RULES } from "@/lib/badge-constants";

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

export function GzCommunity({
  badges,
  colegas,
  ayudantias,
  salaResumen,
}: GzCommunityProps) {
  const earnedSlugs = new Set(badges.map((b) => b.badge));

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
          Insignias &middot; Colegas &middot; La Sala
        </span>
      </div>

      {/* Vertical stack */}
      <div className="flex flex-col">
        {/* Row 1: Insignias */}
        <div className="border-b border-gz-rule pb-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                T&iacute;tulos jur&iacute;dicos
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
                Mis Insignias
              </h3>
              <p className="font-cormorant text-[15px] leading-[1.65] text-gz-ink-mid">
                Desbloquea insignias completando hitos de estudio. Cada una reconoce un logro espec&iacute;fico en tu preparaci&oacute;n.
              </p>
            </div>
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                {BADGE_RULES.map((badge) => {
                  const earned = earnedSlugs.has(badge.slug);
                  return (
                    <div
                      key={badge.slug}
                      className="flex items-center gap-3 py-2.5 border-b border-gz-cream-dark last:border-b-0"
                    >
                      <span className="text-[24px]">{badge.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gz-ink">
                          {badge.label}
                        </p>
                        <p className="text-[11px] text-gz-ink-light">
                          {badge.description}
                        </p>
                      </div>
                      <span
                        className={`font-ibm-mono text-[9px] uppercase tracking-[1px] px-2.5 py-0.5 rounded-sm shrink-0 ${
                          earned
                            ? "bg-[var(--gz-gold)]/[0.12] text-gz-gold"
                            : "bg-gz-cream-dark text-gz-ink-light"
                        }`}
                      >
                        {earned ? "Obtenido" : "Bloqueado"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
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
                Ver todos los colegas \u2192
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

        {/* Row 3: La Sala */}
        <div>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
                Novedades
              </p>
              <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
                La Sala
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
                    {salaResumen.proximoEvento.lugar && ` \u00B7 ${salaResumen.proximoEvento.lugar}`}
                    {" \u00B7 "}{salaResumen.proximoEvento.interesadosCount} interesado{salaResumen.proximoEvento.interesadosCount !== 1 ? "s" : ""}
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
                Entrar a La Sala \u2192
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
                          ? "Ofrezco ayudant\u00EDa"
                          : "Busco ayudant\u00EDa"}
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
                  No hay novedades en La Sala.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
