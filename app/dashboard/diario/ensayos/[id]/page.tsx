import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EnsayoActions } from "./ensayo-actions";

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
      apoyos: {
        where: { userId: authUser.id },
        select: { id: true },
      },
      guardados: {
        where: { userId: authUser.id },
        select: { id: true },
      },
      comuniquese: {
        where: { userId: authUser.id },
        select: { id: true },
      },
    },
  });

  if (!ensayo || !ensayo.isActive) notFound();

  // Increment view count (fire-and-forget)
  prisma.ensayo
    .update({ where: { id }, data: { viewsCount: { increment: 1 } } })
    .catch(() => {});

  // Check viewer premium status
  const viewer = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });
  const isPremium = viewer?.plan !== "FREE";
  const isOwner = ensayo.userId === authUser.id;

  const initials =
    `${ensayo.user.firstName[0]}${ensayo.user.lastName[0]}`.toUpperCase();
  const tags = ensayo.tags
    ? ensayo.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      {/* Back link */}
      <Link
        href="/dashboard/diario"
        className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
      >
        ← Volver al Diario
      </Link>

      {/* ─── Header ──────────────────────────────────────── */}
      <div className="mb-6">
        <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-sage font-medium mb-2">
          ENSAYO · {TIPO_LABELS[ensayo.tipo] ?? ensayo.tipo}
        </p>
        <h1 className="font-cormorant text-[32px] !font-bold text-gz-ink leading-tight mb-4">
          {ensayo.titulo}
        </h1>

        {/* Author row */}
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/perfil/${ensayo.user.id}`}>
            {ensayo.user.avatarUrl ? (
              <img
                src={ensayo.user.avatarUrl}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                {initials}
              </div>
            )}
          </Link>
          <div>
            <Link
              href={`/dashboard/perfil/${ensayo.user.id}`}
              className="font-archivo text-[14px] font-semibold text-gz-ink hover:underline"
            >
              {ensayo.user.firstName} {ensayo.user.lastName}
            </Link>
            {ensayo.user.universidad && (
              <p className="font-ibm-mono text-[10px] text-gz-ink-light">
                {ensayo.user.universidad}
              </p>
            )}
            <p className="font-ibm-mono text-[11px] text-gz-ink-light">
              {formatDate(ensayo.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[2px] bg-gz-rule-dark mb-6" />

      {/* ─── Metadata card ───────────────────────────────── */}
      <div className="mb-6 rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
              Materia
            </span>
            <p className="font-archivo text-[14px] text-gz-ink mt-0.5">
              {MATERIA_LABELS[ensayo.materia] ?? ensayo.materia}
            </p>
          </div>
          <div>
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
              Tipo
            </span>
            <p className="font-archivo text-[14px] text-gz-ink mt-0.5">
              {TIPO_LABELS[ensayo.tipo] ?? ensayo.tipo}
            </p>
          </div>
          <div>
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
              Formato
            </span>
            <p className="font-archivo text-[14px] text-gz-ink mt-0.5">
              {ensayo.archivoFormato.toUpperCase()}
            </p>
          </div>
          <div>
            <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
              Tamaño
            </span>
            <p className="font-archivo text-[14px] text-gz-ink mt-0.5">
              {formatBytes(ensayo.archivoTamano)}
            </p>
          </div>
          {tags.length > 0 && (
            <div className="col-span-2 sm:col-span-3">
              <span className="font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light font-medium">
                Tags
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-sm bg-gz-sage/10 px-2 py-0.5 font-ibm-mono text-[10px] text-gz-sage font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Resumen ─────────────────────────────────────── */}
      {ensayo.resumen && (
        <div className="mb-6">
          <h2 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light font-medium mb-2">
            Resumen
          </h2>
          <p className="font-cormorant text-[17px] italic text-gz-ink leading-[1.8] whitespace-pre-line">
            {ensayo.resumen}
          </p>
        </div>
      )}

      {/* ─── File preview ────────────────────────────────── */}
      <div className="mb-6">
        <h2 className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light font-medium mb-3">
          Vista previa
        </h2>
        {ensayo.archivoFormato === "pdf" ? (
          <iframe
            src={ensayo.archivoUrl}
            className="w-full rounded-[4px] border border-gz-rule"
            style={{ height: "600px" }}
            title={ensayo.archivoNombre}
          />
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[4px] border border-gz-rule bg-gz-cream-dark/20 py-16 px-6 text-center">
            <svg
              className="mb-3 h-12 w-12 text-gz-ink-light"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <p className="font-archivo text-[14px] text-gz-ink-mid">
              Vista previa no disponible para archivos DOCX
            </p>
            <p className="mt-1 font-ibm-mono text-[11px] text-gz-ink-light">
              {ensayo.archivoNombre}
            </p>
          </div>
        )}
      </div>

      {/* ─── Download section ────────────────────────────── */}
      <div className="mb-6">
        {isPremium || isOwner ? (
          <a
            href={`/api/diario/ensayos/${ensayo.id}/descargar`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[4px] bg-gz-navy px-5 py-2.5 font-archivo text-[13px] font-medium text-white hover:bg-gz-navy/90 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Descargar {ensayo.archivoFormato.toUpperCase()}
          </a>
        ) : (
          <div className="flex items-center gap-3">
            <button
              disabled
              className="inline-flex items-center gap-2 rounded-[4px] bg-gz-ink-light/20 px-5 py-2.5 font-archivo text-[13px] font-medium text-gz-ink-light cursor-not-allowed"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
              Solo Premium puede descargar
            </button>
            <Link
              href="/plan-institucional"
              className="font-archivo text-[12px] text-gz-gold hover:underline"
            >
              Mejorar plan →
            </Link>
          </div>
        )}
      </div>

      {/* ─── Stats bar ───────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-4 border-t border-b border-gz-rule py-3">
        <span className="font-ibm-mono text-[11px] text-gz-ink-light">
          {ensayo.viewsCount} vistas
        </span>
        <span className="font-ibm-mono text-[11px] text-gz-ink-light">
          {ensayo.apoyosCount} apoyos
        </span>
        <span className="font-ibm-mono text-[11px] text-gz-ink-light">
          {ensayo.downloadsCount} descargas
        </span>
        <span className="font-ibm-mono text-[11px] text-gz-ink-light">
          {ensayo.guardadosCount} guardados
        </span>
      </div>

      {/* ─── Actions (client component) ──────────────────── */}
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
    </div>
  );
}
