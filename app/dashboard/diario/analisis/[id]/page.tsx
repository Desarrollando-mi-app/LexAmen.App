import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "../../components/obiter-legal-ref";
import { AnalisisActions } from "./analisis-actions";

// ─── Metadata ────────────────────────────────────────────────

export const metadata = {
  title: "Analisis — Studio Iuris",
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
  return `hace ${years} ano${years > 1 ? "s" : ""}`;
}

// ─── Content Section ─────────────────────────────────────────

function ContentSection({
  number,
  title,
  content,
}: {
  number: string;
  title: string;
  content: string;
}) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-burgundy font-medium">
        {number}. {title}
      </h2>
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

  if (!analisis || !analisis.isActive || analisis.isHidden) {
    notFound();
  }

  // Check interaction flags for auth user
  const [apoyo, guardado, comunicado] = await Promise.all([
    prisma.analisisApoyo.findUnique({
      where: {
        analisisId_userId: { analisisId: id, userId: authUser.id },
      },
      select: { id: true },
    }),
    prisma.analisisGuardado.findUnique({
      where: {
        analisisId_userId: { analisisId: id, userId: authUser.id },
      },
      select: { id: true },
    }),
    prisma.analisisComuniquese.findUnique({
      where: {
        analisisId_userId: { analisisId: id, userId: authUser.id },
      },
      select: { id: true },
    }),
  ]);

  // Increment view count
  await prisma.analisisSentencia.update({
    where: { id },
    data: { viewsCount: { increment: 1 } },
  });

  // Fetch ODs that cite this analysis
  const citingObiters = await prisma.obiterDictum.findMany({
    where: { citedAnalisisId: id },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Format date
  const fechaFallo = analisis.fechaFallo.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const createdDate = analisis.createdAt.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const initials =
    `${analisis.user.firstName[0]}${analisis.user.lastName[0]}`.toUpperCase();

  const tags = analisis.tags
    ? analisis.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-0">
        {/* Back link */}
        <Link
          href="/dashboard/diario"
          className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
        >
          &larr; Volver al Diario
        </Link>

        {/* ─── Header ─────────────────────────────────────── */}
        <header className="mb-8">
          <p className="mb-3 font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-burgundy font-medium">
            Analisis de Sentencia
          </p>

          <h1 className="mb-5 font-cormorant text-[32px] !font-bold leading-tight text-gz-ink">
            {analisis.titulo}
          </h1>

          {/* Author row */}
          <div className="flex items-center gap-3">
            <Link href={`/dashboard/perfil/${analisis.user.id}`}>
              {analisis.user.avatarUrl ? (
                <img
                  src={analisis.user.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[11px] font-bold text-gz-gold">
                  {initials}
                </div>
              )}
            </Link>
            <div className="min-w-0">
              <Link
                href={`/dashboard/perfil/${analisis.user.id}`}
                className="font-archivo text-[14px] font-semibold text-gz-ink hover:underline"
              >
                {analisis.user.firstName} {analisis.user.lastName}
              </Link>
              <div className="flex items-center gap-2 font-ibm-mono text-[11px] text-gz-ink-light">
                {analisis.user.universidad && (
                  <>
                    <span>{analisis.user.universidad}</span>
                    <span className="text-gz-rule-dark">|</span>
                  </>
                )}
                <span>{createdDate}</span>
                <span className="text-gz-rule-dark">|</span>
                <span>{analisis.tiempoLectura} min de lectura</span>
              </div>
            </div>
          </div>
        </header>

        <div className="h-[2px] bg-gz-rule-dark mb-8" />

        {/* ─── Ficha Tecnica ──────────────────────────────── */}
        <div className="mb-10 rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-5 sm:p-6">
          <h3 className="mb-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid font-medium">
            Ficha Tecnica
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Tribunal
              </p>
              <p className="mt-0.5 font-archivo text-[14px] text-gz-ink">
                {analisis.tribunal}
              </p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Rol
              </p>
              <p className="mt-0.5 font-archivo text-[14px] text-gz-ink">
                {analisis.numeroRol}
              </p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Fecha del Fallo
              </p>
              <p className="mt-0.5 font-archivo text-[14px] text-gz-ink">
                {fechaFallo}
              </p>
            </div>
            <div>
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Partes
              </p>
              <p className="mt-0.5 font-archivo text-[14px] text-gz-ink">
                {analisis.partes}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Materia
              </p>
              <p className="mt-0.5 font-archivo text-[14px] text-gz-ink">
                {analisis.materia}
              </p>
            </div>
          </div>

          {/* External links */}
          {(analisis.falloUrl || analisis.falloPdfUrl) && (
            <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-gz-rule pt-4">
              {analisis.falloUrl && (
                <a
                  href={analisis.falloUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-archivo text-[13px] font-medium text-gz-gold hover:underline transition-colors"
                >
                  Ver fallo original &rarr;
                </a>
              )}
              {analisis.falloPdfUrl && (
                <a
                  href={analisis.falloPdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-archivo text-[13px] font-medium text-gz-gold hover:underline transition-colors"
                >
                  Descargar PDF del fallo &rarr;
                </a>
              )}
            </div>
          )}
        </div>

        {/* ─── Resumen (lead) ─────────────────────────────── */}
        <div className="mb-10 border-l-[3px] border-gz-gold pl-5">
          <p className="font-cormorant text-[18px] italic leading-[1.8] text-gz-ink-mid">
            {analisis.resumen}
          </p>
        </div>

        {/* ─── Content Sections ───────────────────────────── */}
        <ContentSection
          number="I"
          title="Hechos Relevantes"
          content={analisis.hechos}
        />

        <ContentSection
          number="II"
          title="Ratio Decidendi"
          content={analisis.ratioDecidendi}
        />

        <ContentSection
          number="III"
          title="Opinion del Autor"
          content={analisis.opinion}
        />

        <ContentSection
          number="IV"
          title="Resumen"
          content={analisis.resumen}
        />

        {/* ─── Tags ───────────────────────────────────────── */}
        {tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-sm bg-gz-gold/[0.08] px-3 py-1 font-ibm-mono text-[10px] font-medium text-gz-gold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ─── Stats bar ──────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-4 rounded-[3px] bg-gz-cream-dark/50 px-5 py-3 font-ibm-mono text-[11px] text-gz-ink-light">
          <span>{analisis.viewsCount + 1} vistas</span>
          <span className="text-gz-rule-dark">|</span>
          <span>{analisis.apoyosCount} apoyos</span>
          <span className="text-gz-rule-dark">|</span>
          <span>{analisis.citasCount} citas</span>
          <span className="text-gz-rule-dark">|</span>
          <span>{analisis.guardadosCount} guardados</span>
        </div>

        {/* ─── Actions (client component) ─────────────────── */}
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

        {/* ─── Debate Section ─────────────────────────────── */}
        <div className="mt-10">
          <h2 className="mb-1 font-cormorant text-[22px] !font-bold text-gz-ink">
            Debate
          </h2>
          <p className="mb-5 font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            Obiters que citan este analisis
          </p>
          <div className="h-[1px] bg-gz-rule mb-5" />

          {citingObiters.length > 0 ? (
            <div className="space-y-4">
              {citingObiters.map((od) => {
                const odInitials =
                  `${od.user.firstName[0]}${od.user.lastName[0]}`.toUpperCase();
                const preview =
                  od.content.length > 280
                    ? od.content.slice(0, 280) + "..."
                    : od.content;

                return (
                  <Link
                    key={od.id}
                    href={`/dashboard/diario/obiter/${od.id}`}
                    className="block rounded-[4px] border border-gz-rule bg-white p-4 hover:border-gz-gold transition-colors"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      {od.user.avatarUrl ? (
                        <img
                          src={od.user.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
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
                      className="font-cormorant text-[15px] leading-[1.6] text-gz-ink-mid line-clamp-3"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {preview}
                    </p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center font-cormorant text-[16px] italic text-gz-ink-light">
              Aun no hay debate. Publica un Obiter citando este analisis.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
