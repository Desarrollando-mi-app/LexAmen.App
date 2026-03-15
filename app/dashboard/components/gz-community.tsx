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
          Insignias · Colegas · La Sala
        </span>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_300px]">
        {/* Col 1: Insignias */}
        <div className="px-0 lg:px-5 lg:first:pl-0 lg:border-r border-gz-rule pb-5 mb-5 lg:pb-0 lg:mb-0 border-b lg:border-b-0">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
            Títulos jurídicos
          </p>
          <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
            Mis Insignias
          </h3>

          <div>
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

        {/* Col 2: Colegas */}
        <div className="px-0 lg:px-5 lg:border-r border-gz-rule pb-5 mb-5 lg:pb-0 lg:mb-0 border-b lg:border-b-0">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
            Tu red de estudio
          </p>
          <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
            Colegas
          </h3>

          {colegas.length === 0 ? (
            <p className="text-[13px] text-gz-ink-light italic font-cormorant">
              Aún no tienes colegas. ¡Envía tu primera solicitud!
            </p>
          ) : (
            <div>
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

          <div className="mt-3">
            <Link
              href="/dashboard/colegas"
              className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
            >
              Ver todos los colegas →
            </Link>
          </div>
        </div>

        {/* Col 3: La Sala */}
        <div className="px-0 lg:px-5 lg:last:pr-0">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold mb-2">
            Novedades
          </p>
          <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink mb-3">
            La Sala
          </h3>

          {/* Próximo evento */}
          {salaResumen?.proximoEvento && (
            <div className="py-2.5 border-b border-gz-cream-dark">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-navy mb-1">
                📅 Próximo evento
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
            <div className="py-2.5 border-b border-gz-cream-dark space-y-1">
              {salaResumen.pasantiasNuevas > 0 && (
                <p className="text-[12px] text-gz-ink-mid">
                  💼 {salaResumen.pasantiasNuevas} pasantía{salaResumen.pasantiasNuevas !== 1 ? "s" : ""} nueva{salaResumen.pasantiasNuevas !== 1 ? "s" : ""} esta semana
                </p>
              )}
              {salaResumen.ayudantiasActivas > 0 && (
                <p className="text-[12px] text-gz-ink-mid">
                  🎓 {salaResumen.ayudantiasActivas} ayudantía{salaResumen.ayudantiasActivas !== 1 ? "s" : ""} disponible{salaResumen.ayudantiasActivas !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          )}

          {/* Ayudantías list */}
          {ayudantias.length > 0 && (
            <div>
              {ayudantias.map((a) => (
                <div
                  key={a.id}
                  className="py-2.5 border-b border-gz-cream-dark last:border-b-0"
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
                    {a.user.firstName} · {a.universidad} ·{" "}
                    {formatPrice(a.priceType, a.priceAmount)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {!salaResumen?.proximoEvento && ayudantias.length === 0 && (
            <p className="text-[13px] text-gz-ink-light italic font-cormorant">
              No hay novedades en La Sala.
            </p>
          )}

          <div className="mt-3">
            <Link
              href="/dashboard/sala"
              className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors inline-block"
            >
              Entrar a La Sala →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
