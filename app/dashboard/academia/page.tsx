import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MastheadAcademia } from "@/components/academia/masthead-academia";
import {
  ramaGradient,
  ramaLabel,
  debateEstadoLabel,
  debateEstadoBadgeClass,
  expedienteSplitGradient,
  eventoFormatoGradient,
  eventoFormatoLabel,
  formatFechaEditorial,
} from "@/lib/academia-helpers";

export const metadata = {
  title: "Academia — Studio Iuris",
  description:
    "Tabla de contenidos del módulo Academia: debates, expediente, peer review, ranking y eventos.",
};

/**
 * Hub editorial del tab Academia. Server thin con previews mínimos de
 * cada sub-sección — un debate activo, el próximo expediente abierto,
 * el siguiente evento académico — más cards de Ranking y Peer Review
 * que enlazan a sus respectivas páginas. Pensado como una "tabla de
 * contenidos" editorial: un golpe de vista de qué se está cocinando en
 * cada rincón de Academia.
 */
export default async function AcademiaHubPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const now = new Date();

  // Previews paralelos — todos opcionales: si la sección está vacía la
  // tarjeta muestra un fallback editorial.
  const [debateActivo, expedienteAbierto, eventoProximo, totales] =
    await Promise.all([
      prisma.debateJuridico.findFirst({
        where: { estado: { in: ["argumentos", "replicas", "votacion"] } },
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          titulo: true,
          rama: true,
          estado: true,
          votosAutor1: true,
          votosAutor2: true,
        },
      }),
      prisma.expediente.findFirst({
        where: { aprobado: true, estado: "abierto" },
        orderBy: { fechaCierre: "asc" },
        select: {
          id: true,
          numero: true,
          titulo: true,
          rama: true,
          fechaCierre: true,
          materias: true,
        },
      }),
      prisma.eventoAcademico.findFirst({
        where: {
          isActive: true,
          isHidden: false,
          approvalStatus: "aprobado",
          fecha: { gte: now },
        },
        orderBy: { fecha: "asc" },
        select: {
          id: true,
          titulo: true,
          organizador: true,
          fecha: true,
          formato: true,
          hora: true,
          lugar: true,
        },
      }),
      Promise.all([
        prisma.debateJuridico.count({
          where: {
            estado: { in: ["argumentos", "replicas", "votacion"] },
          },
        }),
        prisma.expediente.count({
          where: { aprobado: true, estado: "abierto" },
        }),
        prisma.eventoAcademico.count({
          where: {
            isActive: true,
            isHidden: false,
            approvalStatus: "aprobado",
            fecha: { gte: now },
          },
        }),
      ]),
    ]);

  const [debatesActivos, expedientesAbiertos, eventosProximos] = totales;

  return (
    <main
      className="min-h-screen pb-24"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <MastheadAcademia
        seccion="Academia"
        glyph="✦"
        subtitulo="Debates, expediente, peer review, ranking y eventos — un solo módulo, cinco columnas."
        eyebrowExtra="Índice editorial"
      />

      {/* Resumen de cifras */}
      <section className="max-w-[1400px] mx-auto px-7 mt-8">
        <div className="grid grid-cols-3 border-l border-t border-gz-rule bg-white">
          <SummaryCell
            label="Debates activos"
            value={debatesActivos}
            href="/dashboard/diario/debates"
          />
          <SummaryCell
            label="Expedientes abiertos"
            value={expedientesAbiertos}
            href="/dashboard/diario/expediente"
          />
          <SummaryCell
            label="Eventos próximos"
            value={eventosProximos}
            href="/dashboard/academia/eventos"
          />
        </div>
      </section>

      {/* Tres previews destacados — Debate / Expediente / Evento */}
      <section className="max-w-[1400px] mx-auto px-7 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 border-l border-t border-gz-rule">
          <PreviewCard
            kicker="Sección I"
            section="Debates"
            href="/dashboard/diario/debates"
            cover={
              debateActivo ? (
                <div
                  className="absolute inset-0"
                  style={{ background: ramaGradient(debateActivo.rama) }}
                >
                  <span
                    className={`absolute top-3 left-3 px-2 py-0.5 font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px] ${debateEstadoBadgeClass(debateActivo.estado)}`}
                  >
                    {debateEstadoLabel(debateActivo.estado)}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center text-gz-cream">
                    <span className="font-cormorant italic text-[60px] opacity-90">
                      vs
                    </span>
                  </div>
                </div>
              ) : (
                <FallbackCover label="Sin debates activos" />
              )
            }
            title={debateActivo?.titulo ?? "Próximamente, un duelo nuevo"}
            meta={
              debateActivo
                ? `${ramaLabel(debateActivo.rama)} · ${debateActivo.votosAutor1 + debateActivo.votosAutor2} votos`
                : "Cuando se abra un debate, aparecerá aquí."
            }
            ctaLabel={debateActivo ? "Leer el debate" : "Ver debates"}
          />

          <PreviewCard
            kicker="Sección II"
            section="Expediente Abierto"
            href="/dashboard/diario/expediente"
            cover={
              expedienteAbierto ? (
                <div className="absolute inset-0 flex">
                  <div
                    className="flex-1"
                    style={{
                      background: expedienteSplitGradient(expedienteAbierto.rama)
                        .demandante,
                    }}
                  />
                  <div
                    className="flex-1"
                    style={{
                      background: expedienteSplitGradient(expedienteAbierto.rama)
                        .demandado,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-gz-cream">
                    <span className="font-cormorant text-[68px] opacity-90 leading-none">
                      ⚖
                    </span>
                  </div>
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-gz-cream/95 text-gz-ink font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px]">
                    Expediente N°{expedienteAbierto.numero}
                  </span>
                </div>
              ) : (
                <FallbackCover label="Sin expedientes abiertos" />
              )
            }
            title={expedienteAbierto?.titulo ?? "Aún no hay caso abierto"}
            meta={
              expedienteAbierto
                ? `${ramaLabel(expedienteAbierto.rama)} · cierra ${formatFechaEditorial(expedienteAbierto.fechaCierre)}`
                : "Pronto se publicará un caso para alegar."
            }
            ctaLabel={expedienteAbierto ? "Alegar →" : "Ver expedientes"}
          />

          <PreviewCard
            kicker="Sección III"
            section="Próximo evento"
            href="/dashboard/academia/eventos"
            cover={
              eventoProximo ? (
                <div
                  className="absolute inset-0 flex flex-col items-center justify-center text-gz-cream"
                  style={{
                    background: eventoFormatoGradient(eventoProximo.formato),
                  }}
                >
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-gz-cream/95 text-gz-ink font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase rounded-[2px]">
                    {eventoFormatoLabel(eventoProximo.formato)}
                  </span>
                  <span className="font-cormorant text-[60px] font-semibold leading-none">
                    {new Date(eventoProximo.fecha).getDate()}
                  </span>
                  <span className="mt-1 font-ibm-mono text-[11px] tracking-[2.5px] uppercase">
                    {[
                      "ENE", "FEB", "MAR", "ABR", "MAY", "JUN",
                      "JUL", "AGO", "SEP", "OCT", "NOV", "DIC",
                    ][new Date(eventoProximo.fecha).getMonth()]}
                  </span>
                </div>
              ) : (
                <FallbackCover label="Sin eventos próximos" />
              )
            }
            title={eventoProximo?.titulo ?? "Sin agenda por ahora"}
            meta={
              eventoProximo
                ? `${eventoProximo.organizador}${eventoProximo.hora ? ` · ${eventoProximo.hora}` : ""}`
                : "Vuelve pronto, la programación se actualiza."
            }
            ctaLabel={eventoProximo ? "Inscribirme →" : "Ver eventos"}
          />
        </div>
      </section>

      {/* Dos secciones secundarias — Ranking y Peer Review */}
      <section className="max-w-[1400px] mx-auto px-7 mt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-l border-t border-gz-rule">
          <SecondaryCard
            kicker="Sección IV"
            title="Ranking de autores"
            description="Las plumas más activas de la comunidad — debates, ensayos, análisis y alegatos. Período semanal, mensual e histórico."
            href="/dashboard/diario/ranking"
            cta="Consultar el podio"
            glyph="❦"
          />
          <SecondaryCard
            kicker="Sección V"
            title="Peer Review"
            description="Antes de imprenta, cada ensayo pasa por la mirada de tres colegas de la misma rama. En preparación."
            href="/dashboard/diario/peer-review"
            cta="Ver el módulo"
            glyph="✠"
            soon
          />
        </div>
      </section>
    </main>
  );
}

// ─── Subcomponentes ───────────────────────────────────────────────

function SummaryCell({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block px-6 py-5 border-r border-b border-gz-rule hover:bg-gz-cream transition cursor-pointer"
    >
      <p className="font-ibm-mono text-[9.5px] tracking-[1.6px] uppercase text-gz-ink-light">
        {label}
      </p>
      <p className="mt-1 font-cormorant text-[40px] font-semibold leading-none text-gz-ink">
        {value}
      </p>
    </Link>
  );
}

function PreviewCard({
  kicker,
  section,
  href,
  cover,
  title,
  meta,
  ctaLabel,
}: {
  kicker: string;
  section: string;
  href: string;
  cover: React.ReactNode;
  title: string;
  meta: string;
  ctaLabel: string;
}) {
  return (
    <article className="flex flex-col bg-gz-cream border-r border-b border-gz-rule">
      <div className="relative aspect-[16/9] w-full overflow-hidden">
        {cover}
      </div>
      <div className="flex-1 flex flex-col p-5 gap-2">
        <p className="font-ibm-mono text-[9.5px] tracking-[1.6px] uppercase text-gz-gold">
          {kicker} · {section}
        </p>
        <div className="h-px w-10 bg-gz-gold" />
        <h2 className="font-cormorant font-semibold text-[24px] leading-[1.15] text-gz-ink">
          {title}
        </h2>
        <p className="font-archivo text-[13px] text-gz-ink-mid leading-snug">
          {meta}
        </p>
        <Link
          href={href}
          className="mt-auto pt-3 inline-flex items-center gap-1 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase text-gz-ink hover:text-gz-burgundy transition cursor-pointer"
        >
          {ctaLabel} →
        </Link>
      </div>
    </article>
  );
}

function SecondaryCard({
  kicker,
  title,
  description,
  href,
  cta,
  glyph,
  soon,
}: {
  kicker: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  glyph: string;
  soon?: boolean;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-5 px-7 py-7 border-r border-b border-gz-rule bg-white hover:bg-gz-cream transition cursor-pointer"
    >
      <span className="font-cormorant italic text-[44px] text-gz-gold leading-none mt-1 select-none">
        {glyph}
      </span>
      <div className="flex-1">
        <p className="font-ibm-mono text-[9.5px] tracking-[1.6px] uppercase text-gz-ink-light">
          {kicker}
          {soon ? " · En preparación" : ""}
        </p>
        <h3 className="mt-1 font-cormorant font-semibold text-[24px] text-gz-ink leading-[1.15] group-hover:text-gz-burgundy transition">
          {title}
        </h3>
        <p className="mt-2 font-archivo text-[13px] text-gz-ink-mid leading-[1.55]">
          {description}
        </p>
        <span className="mt-3 inline-flex items-center gap-1 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase text-gz-ink">
          {cta} →
        </span>
      </div>
    </Link>
  );
}

function FallbackCover({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gz-cream-dark">
      <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
        {label}
      </span>
    </div>
  );
}
