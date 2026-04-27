import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EnsayoActions } from "./ensayo-actions";
import { getRamaLabel } from "@/lib/ramas-derecho";

export const metadata = {
  title: "Ensayo — Studio Iuris",
};

// ─── Label maps ──────────────────────────────────────────

const TIPO_LABELS: Record<string, string> = {
  opinion: "Opinión",
  nota_doctrinaria: "Nota doctrinaria",
  comentario_reforma: "Comentario de reforma",
  analisis_comparado: "Análisis comparado",
  tesis: "Tesis / Memoria",
  otro: "Otro",
};

// ─── Helpers ─────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return formatDate(date);
}

// ─── Page ────────────────────────────────────────────────

export default async function EnsayoPage({
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

  // Fetch ensayo with user info and interaction state
  const ensayo = await prisma.ensayo.findUnique({
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
      apoyos: { where: { userId: authUser.id }, select: { id: true } },
      guardados: { where: { userId: authUser.id }, select: { id: true } },
      comuniquese: { where: { userId: authUser.id }, select: { id: true } },
    },
  });

  if (!ensayo || !ensayo.isActive) notFound();

  // Increment view count (fire-and-forget)
  prisma.ensayo
    .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    .catch(() => {});

  // Check viewer premium
  const viewer = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });
  const isPremium = viewer?.plan !== "FREE";
  const isOwner = ensayo.userId === authUser.id;

  // Citing OD
  const citingObiters = await prisma.obiterDictum.findMany({
    where: { citedEnsayoId: id },
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  });

  // Más del autor
  const masDelAutor = await prisma.ensayo.findMany({
    where: {
      userId: ensayo.userId,
      id: { not: id },
      isActive: true,
      isHidden: false,
    },
    take: 4,
    orderBy: { createdAt: "desc" },
    select: { id: true, titulo: true, materia: true, tipo: true, createdAt: true, apoyosCount: true },
  });

  const initials = `${ensayo.user.firstName[0]}${ensayo.user.lastName[0]}`.toUpperCase();
  const tags = ensayo.tags
    ? ensayo.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-16">
        {/* ─── Top bar ─── */}
        <div className="flex items-center justify-between mb-5">
          <Link
            href="/dashboard/diario?tab=ensayos"
            className="group inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light hover:text-gz-sage transition-colors cursor-pointer"
          >
            <span className="font-cormorant text-[16px] leading-none -mt-px transition-transform group-hover:-translate-x-1">←</span>
            Volver a los ensayos
          </Link>
          <span className="hidden sm:inline font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light">
            {formatDate(ensayo.createdAt)}
          </span>
        </div>

        {/* ═══ Layout 2-col ═══════════════════════════════════════ */}
        <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* ─── HERO EDITORIAL ─── */}
            <header className="gz-section-header relative mb-8">
              <div className="h-px bg-gz-ink/35 mb-3" />

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Image
                  src="/brand/logo-sello.svg"
                  alt="Studio Iuris"
                  width={48}
                  height={48}
                  className="h-10 w-10 shrink-0"
                />
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-sage font-semibold flex items-center gap-1.5">
                  <span aria-hidden>📜</span>
                  Ensayo
                </p>
                <span className="rounded-full px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] bg-gz-sage/15 text-gz-sage">
                  {TIPO_LABELS[ensayo.tipo] ?? ensayo.tipo}
                </span>
                {ensayo.archivoFormato && (
                  <span
                    className={`rounded-full px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] ${
                      ensayo.archivoFormato.toUpperCase() === "PDF"
                        ? "bg-gz-burgundy/15 text-gz-burgundy"
                        : "bg-gz-navy/15 text-gz-navy"
                    }`}
                  >
                    {ensayo.archivoFormato.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Título */}
              <h1 className="font-cormorant text-[34px] sm:text-[44px] lg:text-[52px] !font-bold leading-[1.05] tracking-tight text-gz-ink mb-3">
                {ensayo.titulo}
              </h1>

              {/* Lead */}
              {ensayo.resumen && (
                <p className="font-cormorant italic text-[18px] sm:text-[20px] leading-[1.5] text-gz-ink-mid mb-5 max-w-[60ch] whitespace-pre-line">
                  {ensayo.resumen}
                </p>
              )}

              {/* Author byline */}
              <div className="flex items-center gap-3 pt-4 border-t border-gz-rule">
                <Link href={`/dashboard/perfil/${ensayo.user.id}`} className="shrink-0 cursor-pointer">
                  {ensayo.user.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={ensayo.user.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-gz-rule/60" />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gz-navy font-archivo text-[12px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/60">
                      {initials}
                    </div>
                  )}
                </Link>
                <div className="min-w-0">
                  <Link
                    href={`/dashboard/perfil/${ensayo.user.id}`}
                    className="font-archivo text-[14px] font-semibold text-gz-ink hover:text-gz-sage transition-colors cursor-pointer leading-tight block"
                  >
                    {ensayo.user.firstName} {ensayo.user.lastName}
                  </Link>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mt-0.5">
                    {ensayo.user.universidad && (
                      <>
                        <span>{ensayo.user.universidad}</span>
                        <span className="mx-1.5 text-gz-rule-dark">·</span>
                      </>
                    )}
                    <span>{formatDate(ensayo.createdAt)}</span>
                  </p>
                </div>
              </div>

              {/* Triple regla */}
              <div className="mt-5 h-[3px] bg-gz-ink/85" />
              <div className="h-px bg-gz-ink/85 mt-[2px]" />
              <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
            </header>

            {/* ─── Acción primaria: Descarga ─── */}
            <div className="mb-7 rounded-[3px] border border-gz-sage/30 bg-white overflow-hidden">
              <div className="h-[3px] bg-gradient-to-r from-gz-sage to-gz-gold" />
              <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div className="flex items-center gap-4">
                  {/* Icono de archivo */}
                  <div className="flex h-14 w-12 shrink-0 items-center justify-center rounded-[3px] border-2 border-gz-sage/40 bg-gz-sage/5 text-gz-sage relative">
                    <span className="font-ibm-mono text-[10px] font-bold tracking-[1px]">
                      {ensayo.archivoFormato.toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-archivo text-[14px] font-bold text-gz-ink truncate max-w-[280px]">
                      {ensayo.archivoNombre}
                    </p>
                    <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light mt-0.5">
                      {formatBytes(ensayo.archivoTamano)}
                      <span className="mx-1.5 text-gz-rule-dark">·</span>
                      {ensayo.viewsCount} vistas
                      <span className="mx-1.5 text-gz-rule-dark">·</span>
                      {ensayo.downloadsCount} descargas
                    </p>
                  </div>
                </div>

                {/* CTA descarga */}
                {isPremium || isOwner ? (
                  <a
                    href={`/api/diario/ensayos/${ensayo.id}/descargar`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gz-sage px-6 py-2.5 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-white hover:bg-gz-ink transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Descargar
                  </a>
                ) : (
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-full bg-gz-cream-dark px-5 py-2.5 font-archivo text-[12px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light cursor-not-allowed"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                      Solo Premium
                    </button>
                    <Link
                      href="/plan-institucional"
                      className="font-archivo text-[11px] font-semibold text-gz-gold border-b border-gz-gold/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
                    >
                      Mejorar plan →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Vista previa ─── */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light font-semibold flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gz-sage" />
                  Vista previa
                </p>
                {ensayo.archivoFormato === "pdf" && (
                  <a
                    href={ensayo.archivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-archivo text-[11px] font-semibold text-gz-sage border-b border-gz-sage/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
                  >
                    Abrir en pestaña nueva ↗
                  </a>
                )}
              </div>

              {ensayo.archivoFormato === "pdf" ? (
                <iframe
                  src={ensayo.archivoUrl}
                  className="w-full rounded-[3px] border border-gz-rule shadow-[0_1px_0_rgba(15,15,15,0.04)]"
                  style={{ height: "640px" }}
                  title={ensayo.archivoNombre}
                />
              ) : (
                <div className="flex flex-col items-center justify-center rounded-[3px] border border-gz-rule bg-white py-16 px-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gz-navy/8">
                    <svg className="h-8 w-8 text-gz-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <p className="font-cormorant italic text-[16px] text-gz-ink-mid mb-1">
                    Vista previa no disponible para DOCX.
                  </p>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
                    Descarga el archivo para leerlo.
                  </p>
                </div>
              )}
            </section>

            {/* ─── Tags ─── */}
            {tags.length > 0 && (
              <div className="mb-7 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-gz-sage/[0.08] border border-gz-sage/20 px-3 py-1 font-ibm-mono text-[10px] uppercase tracking-[1px] font-semibold text-gz-sage"
                  >
                    #{tag.replace(/^#/, "")}
                  </span>
                ))}
              </div>
            )}

            {/* ─── Stats footer editorial ─── */}
            <div className="mb-6 rounded-[3px] border border-gz-rule bg-white overflow-hidden">
              <div className="h-[3px] bg-gz-sage" />
              <div className="px-5 py-3 flex flex-wrap items-center justify-between gap-3">
                <span className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                  El registro
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-ibm-mono text-[11px] tabular-nums text-gz-ink-mid">
                  <span><span className="font-bold text-gz-ink">{ensayo.viewsCount}</span> vistas</span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-burgundy">♥ {ensayo.apoyosCount}</span></span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-sage">↓ {ensayo.downloadsCount}</span></span>
                  <span className="text-gz-rule-dark">·</span>
                  <span><span className="font-bold text-gz-ink">🔖 {ensayo.guardadosCount}</span></span>
                </div>
              </div>
            </div>

            {/* ─── Actions client component ─── */}
            <EnsayoActions
              ensayoId={ensayo.id}
              isOwner={isOwner}
              isPremium={isPremium}
              initialHasApoyado={ensayo.apoyos.length > 0}
              initialHasGuardado={ensayo.guardados.length > 0}
              initialHasComunicado={ensayo.comuniquese.length > 0}
              initialApoyosCount={ensayo.apoyosCount}
              initialGuardadosCount={ensayo.guardadosCount}
            />

            {/* ─── Conversación pública (citing ODs) ─── */}
            <section className="mt-10">
              <div className="border-b border-gz-ink/85 pb-2 mb-5">
                <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-sage font-semibold mb-0.5 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-gz-sage" />
                  Conversación pública
                </p>
                <h2 className="font-cormorant text-[26px] !font-bold text-gz-ink leading-none">
                  Obiter que citan este ensayo
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
                        className="block rounded-[3px] border border-gz-rule bg-white p-4 hover:border-gz-sage/50 transition-colors cursor-pointer"
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
                  Aún no hay debate. Cita este ensayo desde un Obiter para abrir la conversación.
                </p>
              )}
            </section>
          </article>

          {/* ═══ SIDEBAR ═══════════════════════════════════════════ */}
          <aside className="hidden lg:block">
            <div className="sticky top-[72px] space-y-5">
              {/* Sobre el autor */}
              <SidebarAutor
                userId={ensayo.user.id}
                firstName={ensayo.user.firstName}
                lastName={ensayo.user.lastName}
                avatarUrl={ensayo.user.avatarUrl}
                universidad={ensayo.user.universidad}
              />

              {/* Ficha rápida */}
              <SidebarFicha
                materia={getRamaLabel(ensayo.materia)}
                tipo={TIPO_LABELS[ensayo.tipo] ?? ensayo.tipo}
                formato={ensayo.archivoFormato.toUpperCase()}
                tamano={formatBytes(ensayo.archivoTamano)}
                fecha={formatDate(ensayo.createdAt)}
              />

              {/* Más del autor */}
              {masDelAutor.length > 0 && (
                <SidebarMasDelAutor
                  items={masDelAutor.map((m) => ({
                    id: m.id,
                    titulo: m.titulo,
                    materia: getRamaLabel(m.materia),
                    tipo: TIPO_LABELS[m.tipo] ?? m.tipo,
                    apoyos: m.apoyosCount,
                  }))}
                  authorFirstName={ensayo.user.firstName}
                />
              )}
            </div>
          </aside>
        </div>
      </div>
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
      <div className="h-[3px] bg-gz-sage" />
      <div className="p-4 text-center">
        <div className="flex items-center gap-2 justify-center mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-sage" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-sage">
            Sobre el autor
          </span>
        </div>
        <Link href={`/dashboard/perfil/${userId}`} className="inline-block group cursor-pointer">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="h-16 w-16 mx-auto rounded-full object-cover ring-2 ring-gz-rule/50 group-hover:ring-gz-sage/40 transition-all" />
          ) : (
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-gz-navy font-archivo text-[18px] font-bold text-gz-gold-bright ring-2 ring-gz-rule/50 group-hover:ring-gz-sage/40 transition-all">
              {initials}
            </div>
          )}
          <p className="mt-2 font-archivo text-[14px] font-bold text-gz-ink group-hover:text-gz-sage transition-colors">
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
          className="mt-3 inline-block font-archivo text-[11px] font-semibold text-gz-sage border-b border-gz-sage/40 pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors cursor-pointer"
        >
          Ver perfil →
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar ficha rápida ───────────────────────────────

function SidebarFicha({
  materia,
  tipo,
  formato,
  tamano,
  fecha,
}: {
  materia: string;
  tipo: string;
  formato: string;
  tamano: string;
  fecha: string;
}) {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-burgundy" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-burgundy" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-burgundy">
            Datos
          </span>
        </div>
        <dl className="space-y-2.5">
          <FichaRow label="Materia" value={materia} accent />
          <FichaRow label="Tipo" value={tipo} />
          <FichaRow label="Formato" value={formato} mono />
          <FichaRow label="Tamaño" value={tamano} mono />
          <FichaRow label="Publicado" value={fecha} />
        </dl>
      </div>
    </div>
  );
}

function FichaRow({
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
    <div className="flex items-baseline justify-between gap-2 border-b border-gz-rule/40 pb-2 last:border-b-0 last:pb-0">
      <dt className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light shrink-0">
        {label}
      </dt>
      <dd
        className={`font-archivo text-[12px] text-right ${
          accent ? "text-gz-gold font-semibold" : "text-gz-ink"
        } ${mono ? "font-ibm-mono tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Sidebar más del autor ──────────────────────────────

function SidebarMasDelAutor({
  items,
  authorFirstName,
}: {
  items: { id: string; titulo: string; materia: string; tipo: string; apoyos: number }[];
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
                href={`/dashboard/diario/ensayos/${item.id}`}
                className="block group cursor-pointer rounded-[2px] -mx-1 px-1 py-1 transition-colors hover:bg-gz-cream-dark/30"
              >
                <p className="font-cormorant text-[14px] font-bold text-gz-ink leading-snug line-clamp-2 group-hover:text-gz-sage transition-colors">
                  {item.titulo}
                </p>
                <p className="mt-0.5 font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light">
                  {item.tipo}
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
