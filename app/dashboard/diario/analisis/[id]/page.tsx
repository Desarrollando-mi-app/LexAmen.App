import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "../../components/obiter-legal-ref";
import { AnalisisActions } from "./analisis-actions";
import { getRamaLabel } from "@/lib/ramas-derecho";

// ─── Metadata ────────────────────────────────────────────────

export const metadata = {
  title: "Análisis de Sentencia — Studio Iuris",
};

// ─── Rendered Content (with legal reference parsing) ─────────

function RenderedContent({ content }: { content: string }) {
  const parsed = parseObiterContent(content);
  return (
    <>
      {parsed.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
        }
        return (
          <ObiterLegalRef
            key={i}
            article={segment.article}
            code={segment.code}
            originalText={segment.original}
          />
        );
      })}
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function timeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`;
  const years = Math.floor(months / 12);
  return `hace ${years} año${years > 1 ? "s" : ""}`;
}

const ROMAN: Record<number, string> = { 1: "I", 2: "II", 3: "III", 4: "IV", 5: "V" };

// ─── Section editorial con drop cap romano ───────────────────

function ContentSection({
  number,
  title,
  content,
}: {
  number: number;
  title: string;
  content: string;
}) {
  const roman = ROMAN[number] ?? String(number);
  return (
    <section className="mb-10 relative">
      <div className="flex items-baseline gap-4 mb-4 border-b border-gz-rule pb-3">
        <span
          className="font-cormorant text-[40px] sm:text-[48px] !font-bold text-gz-burgundy/40 leading-none"
          aria-hidden
        >
          {roman}
        </span>
        <h2 className="font-cormorant text-[22px] sm:text-[24px] !font-bold text-gz-ink leading-none">
          {title}
        </h2>
      </div>
      <div
        className="font-cormorant text-[17px] leading-[1.8] text-gz-ink"
        style={{ whiteSpace: "pre-wrap" }}
      >
        <RenderedContent content={content} />
      </div>
    </section>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default async function AnalisisSentenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Fetch analysis with user info
  const analisis = await prisma.analisisSentencia.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
    },
  });

  let coAuthorUsers: { id: string; firstName: string; lastName: string; avatarUrl: string | null }[] = [];
  if (analisis?.colaborativo && analisis.coAutores) {
    try {
      const coAutorIds: string[] = JSON.parse(analisis.coAutores);
      if (coAutorIds.length > 0) {
        coAuthorUsers = await prisma.user.findMany({
          where: { id: { in: coAutorIds } },
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        });
      }
    } catch { /* invalid JSON */ }
  }

  if (!analisis || !analisis.isActive || analisis.isHidden) {
    notFound();
  }

  // Check interaction flags
  const [apoyo, guardado, comunicado] = await Promise.all([
    prisma.analisisApoyo.findUnique({
      where: { analisisId_userId: { analisisId: id, userId: authUser.id } },
      select: { id: true },
    }),
    prisma.analisisGuardado.findUnique({
      where: { analisisId_userId: { analisisId: id, userId: authUser.id } },
      select: { id: true },
    }),
    prisma.analisisComuniquese.findUnique({
      where: { analisisId_userId: { analisisId: id, userId: authUser.id } },
      select: { id: true },
    }),
  ]);

  // Increment view count
  await prisma.analisisSentencia.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
  });

  // Peer review
  let peerReviewPromedio: { general: number; totalReviewers: number } | null = null;
  if ((analisis as typeof analisis & { estadoReview?: string | null }).estadoReview === "revisado") {
    const completedReviews = await prisma.peerReview.findMany({
      where: { publicacionId: id, estado: "completado" },
      select: { claridadScore: true, rigorScore: true, originalidadScore: true },
    });
    if (completedReviews.length > 0) {
      const n = completedReviews.length;
      const avgClaridad = completedReviews.reduce((s, r) => s + (r.claridadScore ?? 0), 0) / n;
      const avgRigor = completedReviews.reduce((s, r) => s + (r.rigorScore ?? 0), 0) / n;
      const avgOriginalidad = completedReviews.reduce((s, r) => s + (r.originalidadScore ?? 0), 0) / n;
      const general = Math.round(((avgClaridad + avgRigor + avgOriginalidad) / 3) * 10) / 10;
      peerReviewPromedio = { general, totalReviewers: n };
    }
  }

  // Citing OD
  const citingObiters = await prisma.obiterDictum.findMany({
    where: { citedAnalisisId: id },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  // Otros análisis del mismo autor
  const masDelAutor = await prisma.analisisSentencia.findMany({
    where: {
      userId: analisis.userId,
      id: { not: id },
      isActive: true,
      isHidden: false,
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, materia: true, createdAt: true, apoyosCount: true },
  });

  const fechaFallo = analisis.fechaFallo.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const createdDate = analisis.createdAt.toLocaleDateString("es-CL", {
    day: "long" as never,
    weekday: "long",
    month: "long",
    year: "numeric",
  } as Intl.DateTimeFormatOptions);
  const fechaPublicacion = analisis.createdAt.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials = `${analisis.user.firstName[0]}${analisis.user.lastName[0]}`.toUpperCase();
  const tags = analisis.tags
    ? analisis.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  const isMini = (analisis as typeof analisis & { formato?: string }).formato === "mini";

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-16">
        {/* ─── Top bar ─── */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/dashboard/diario?tab=analisis"
            className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-burgundy transition-colors cursor-pointer"
          >
            <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
            Volver a los análisis
          </Link>
          <span className="hidden sm:inline font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            {fechaPublicacion}
          </span>
        </div>

        {/* ═══ Layout 2-col ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* ─── HERO EDITORIAL ─── */}
            <header className="gz-section-header relative mb-8">
              <div className="h-px bg-gz-ink/35 mb-3" />

              {/* Kicker + chip de formato */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Image
                  src="/brand/logo-sello.svg"
                  alt="Studio Iuris"
                  width={48}
                  height={48}
                  className="h-10 w-10 shrink-0"
                />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy font-semibold flex items-center gap-1.5">
                  <span aria-hidden>⚖</span>
                  Análisis de Sentencia
                </p>
                <span
                  className={`rounded-full px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] ${
                    isMini
                      ? "bg-gz-gold/15 text-gz-gold"
                      : "bg-gz-burgundy/15 text-gz-burgundy"
                  }`}
                >
                  {isMini ? "Mini-análisis" : "Completo"}
                </span>
              </div>

              {/* Título grande */}
              <h1 className="font-cormorant text-[34px] sm:text-[44px] lg:text-[52px] !font-bold leading-[1.05] tracking-tight text-gz-ink mb-3">
                {analisis.titulo}
              </h1>

              {/* Lead (resumen como bajada) */}
              {analisis.resumen && (
                <p className="font-cormorant italic text-[18px] sm:text-[20px] leading-[1.5] text-gz-ink-mid mb-5 max-w-[60ch]">
                  {analisis.resumen}
                </p>
              )}

              {/* Author byline editorial */}
              <div className="flex items-center gap-3 pt-4 border-t border-gz-rule">
                <Link href={`/dashboard/perfil/${analisis.user.id}`} className="shrink-0 cursor-pointer">
                  {analisis.user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={analisis.user.avatarUrl}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover ring-1 ring-gz-rule/60"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gz-navy font-archivo text-[12px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/60">
                      {initials}
                    </div>
                  )}
                </Link>
                <div className="min-w-0">
                  {coAuthorUsers.length > 0 ? (
                    <p className="font-archivo text-[14px] font-semibold text-gz-ink leading-tight">
                      Por{" "}
                      <Link href={`/dashboard/perfil/${analisis.user.id}`} className="hover:text-gz-burgundy transition-colors cursor-pointer">
                        {analisis.user.firstName} {analisis.user.lastName}
                      </Link>
                      {coAuthorUsers.map((ca, i) => (
                        <span key={ca.id}>
                          {i === coAuthorUsers.length - 1 ? " y " : ", "}
                          <Link href={`/dashboard/perfil/${ca.id}`} className="hover:text-gz-burgundy transition-colors cursor-pointer">
                            {ca.firstName} {ca.lastName}
                          </Link>
                        </span>
                      ))}
                    </p>
                  ) : (
                    <Link
                      href={`/dashboard/perfil/${analisis.user.id}`}
                      className="font-archivo text-[14px] font-semibold text-gz-ink hover:text-gz-burgundy transition-colors cursor-pointer leading-tight block"
                    >
                      {analisis.user.firstName} {analisis.user.lastName}
                    </Link>
                  )}
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light capitalize mt-0.5">
                    {analisis.user.universidad && (
                      <>
                        <span>{analisis.user.universidad}</span>
                        <span className="mx-1.5 text-gz-rule-dark">·</span>
                      </>
                    )}
                    <span>{createdDate}</span>
                    <span className="mx-1.5 text-gz-rule-dark">·</span>
                    <span>{analisis.tiempoLectura} min de lectura</span>
                  </p>
                </div>
              </div>

              {/* Triple regla */}
              <div className="mt-5 h-[3px] bg-gz-ink/85" />
              <div className="h-px bg-gz-ink/85 mt-[2px]" />
              <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
            </header>

            {/* ─── Peer Review Badge ─── */}
            {peerReviewPromedio && (
              <div className="mb-8 rounded-[3px] border border-gz-sage/30 bg-gz-sage/[0.06] overflow-hidden">
                <div className="h-[3px] bg-gz-sage" />
                <div className="px-5 py-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gz-sage/15 text-gz-sage" aria-hidden>
                    ✓
                  </span>
                  <div>
                    <p className="font-archivo text-[14px] font-bold text-gz-sage">
                      Revisado por pares · {peerReviewPromedio.general}/5
                    </p>
                    <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-sage/80">
                      {peerReviewPromedio.totalReviewers} revisor{peerReviewPromedio.totalReviewers > 1 ? "es" : ""}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Ficha técnica (case file premium) ─── */}
            <FichaTecnica
              tribunal={analisis.tribunal}
              numeroRol={analisis.numeroRol}
              fechaFallo={fechaFallo}
              partes={analisis.partes}
              materia={getRamaLabel(analisis.materia)}
              falloUrl={analisis.falloUrl}
              falloPdfUrl={analisis.falloPdfUrl}
            />

            {/* ─── Content sections ─── */}
            <ContentSection number={1} title="Hechos relevantes" content={analisis.hechos} />
            <ContentSection number={2} title="Ratio decidendi" content={analisis.ratioDecidendi} />
            <ContentSection number={3} title="Opinión del autor" content={analisis.opinion} />

            {/* ─── Tags ─── */}
            {tags.length > 0 && (
              <div className="mb-8 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gz-burgundy/[0.08] border border-gz-burgundy/20 px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[1px] font-semibold text-gz-burgundy"
                  >
                    #{tag.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            )}

            {/* ─── Stats footer editorial ─── */}
            <div className="mb-6 rounded-[3px] border border-gz-rule bg-white overflow-hidden">
              <div className="h-[3px] bg-gz-burgundy" />
              <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  El registro
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-ibm-mono text-[11px] tabular-nums text-gz-ink-mid">
                  <span><span className="font-bold text-gz-ink">{analisis.viewsCount + 1}</span> vistas</span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-burgundy">♥ {analisis.apoyosCount}</span></span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-ink">❝ {analisis.citasCount}</span></span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-ink">🔖 {analisis.guardadosCount}</span></span>
                </div>
              </div>
            </div>

            {/* ─── Actions client component ─── */}
            <AnalisisActions
              analisisId={analisis.id}
              currentUserId={authUser.id}
              initialApoyado={!!apoyo}
              initialGuardado={!!guardado}
              initialComunicado={!!comunicado}
              apoyosCount={analisis.apoyosCount}
              guardadosCount={analisis.guardadosCount}
              comuniqueseCount={analisis.comuniqueseCount}
            />

            {/* ─── Debate (citing ODs) ─── */}
            <section className="mt-10">
              <div className="border-b border-gz-ink/85 pb-2 mb-5">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy font-semibold mb-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
                  Conversación pública
                </p>
                <h2 className="font-cormorant text-[26px] !font-bold text-gz-ink leading-none">
                  Obiter que citan este análisis
                </h2>
              </div>

              {citingObiters.length > 0 ? (
                <div className="space-y-3">
                  {citingObiters.map((od) => {
                    const odInitials = `${od.user.firstName[0]}${od.user.lastName[0]}`.toUpperCase();
                    const preview = od.content.length > 280 ? od.content.slice(0, 280) + "…" : od.content;
                    return (
                      <Link
                        key={od.id}
                        href={`/dashboard/diario/obiter/${od.id}`}
                        className="block rounded-[3px] border border-gz-rule bg-white p-4 hover:border-gz-burgundy/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {od.user.avatarUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={od.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-gz-rule/50" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/50">
                              {odInitials}
                            </div>
                          )}
                          <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                            {od.user.firstName} {od.user.lastName}
                          </span>
                          <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                            {timeAgo(od.createdAt)}
                          </span>
                        </div>
                        <p
                          className="font-cormorant text-[15px] leading-[1.55] text-gz-ink-mid line-clamp-3"
                          style={{ whiteSpace: "pre-wrap" }}
                        >
                          {preview}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center font-cormorant italic text-[16px] text-gz-ink-light">
                  Aún no hay debate. Cita este análisis desde un Obiter para abrir la conversación.
                </p>
              )}
            </section>
          </article>

          {/* ═══ SIDEBAR ═══════════════════════════════════════════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] space-y-5">
              {/* Sobre el autor */}
              <SidebarAutor
                userId={analisis.user.id}
                firstName={analisis.user.firstName}
                lastName={analisis.user.lastName}
                avatarUrl={analisis.user.avatarUrl}
                universidad={analisis.user.universidad}
              />

              {/* Más del autor */}
              {masDelAutor.length > 0 && (
                <SidebarMasDelAutor
                  items={masDelAutor.map((m) => ({
                    id: m.id,
                    titulo: m.titulo,
                    materia: getRamaLabel(m.materia),
                    apoyos: m.apoyosCount,
                    fecha: m.createdAt.toLocaleDateString("es-CL", { day: "numeric", month: "short" }),
                  }))}
                  authorFirstName={analisis.user.firstName}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// ─── FichaTecnica (premium card) ─────────────────────────

function FichaTecnica({
  tribunal,
  numeroRol,
  fechaFallo,
  partes,
  materia,
  falloUrl,
  falloPdfUrl,
}: {
  tribunal: string;
  numeroRol: string;
  fechaFallo: string;
  partes: string;
  materia: string;
  falloUrl: string | null;
  falloPdfUrl: string | null;
}) {
  return (
    <div className="mb-10 rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gradient-to-r from-gz-burgundy to-gz-gold" />
      <div className="px-5 sm:px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-burgundy">
            Ficha de la causa
          </span>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
          <FichaItem label="Tribunal" value={tribunal} />
          <FichaItem label="Rol" value={numeroRol} mono />
          <FichaItem label="Fecha del fallo" value={fechaFallo} />
          <FichaItem label="Materia" value={materia} accent />
          <div className="sm:col-span-2">
            <FichaItem label="Partes" value={partes} />
          </div>
        </dl>

        {(falloUrl || falloPdfUrl) && (
          <div className="mt-5 pt-4 border-t border-gz-rule flex flex-wrap items-center gap-4">
            {falloUrl && (
              <a
                href={falloUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-archivo text-[12px] font-semibold text-gz-burgundy border-b border-gz-burgundy/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
              >
                Ver fallo original →
              </a>
            )}
            {falloPdfUrl && (
              <a
                href={falloPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-archivo text-[12px] font-semibold text-gz-burgundy border-b border-gz-burgundy/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
              >
                Descargar PDF →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FichaItem({
  label,
  value,
  mono = false,
  accent = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div>
      <dt className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light font-semibold mb-0.5">
        {label}
      </dt>
      <dd
        className={`font-archivo text-[14px] ${
          accent ? "text-gz-gold font-semibold" : "text-gz-ink"
        } ${mono ? "font-ibm-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Sidebar autor ──────────────────────────────────────

function SidebarAutor({
  userId,
  firstName,
  lastName,
  avatarUrl,
  universidad,
}: {
  userId: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
}) {
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-burgundy" />
      <div className="p-4 text-center">
        <div className="flex items-center gap-2 justify-center mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-burgundy">
            Sobre el autor
          </span>
        </div>
        <Link href={`/dashboard/perfil/${userId}`} className="inline-block group cursor-pointer">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="h-16 w-16 mx-auto rounded-full object-cover ring-2 ring-gz-rule/50 group-hover:ring-gz-burgundy/40 transition-all" />
          ) : (
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gz-navy font-archivo text-[18px] font-bold text-gz-gold-bright ring-2 ring-gz-rule/50 group-hover:ring-gz-burgundy/40 transition-all">
              {initials}
            </div>
          )}
          <p className="mt-2 font-archivo text-[14px] font-bold text-gz-ink group-hover:text-gz-burgundy transition-colors">
            {firstName} {lastName}
          </p>
        </Link>
        {universidad && (
          <p className="mt-1 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
            {universidad}
          </p>
        )}
        <Link
          href={`/dashboard/perfil/${userId}`}
          className="mt-3 inline-block font-archivo text-[11px] font-semibold text-gz-burgundy border-b border-gz-burgundy/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
        >
          Ver perfil →
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar más del autor ──────────────────────────────

function SidebarMasDelAutor({
  items,
  authorFirstName,
}: {
  items: { id: string; titulo: string; materia: string; apoyos: number; fecha: string }[];
  authorFirstName: string;
}) {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-gold" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-gold" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-gold">
            Más de {authorFirstName}
          </span>
        </div>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/dashboard/diario/analisis/${item.id}`}
                className="block group cursor-pointer rounded-[2px] -mx-1 px-1 py-1 transition-colors hover:bg-gz-cream-dark/30"
              >
                <p className="font-cormorant text-[14px] font-bold text-gz-ink leading-snug line-clamp-2 group-hover:text-gz-burgundy transition-colors">
                  {item.titulo}
                </p>
                <p className="mt-0.5 font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                  {item.materia}
                  {item.apoyos > 0 && (
                    <>
                      <span className="mx-1 text-gz-rule-dark">·</span>
                      <span className="text-gz-burgundy">♥ {item.apoyos}</span>
                    </>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
