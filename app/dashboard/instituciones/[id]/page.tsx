import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inst = await prisma.institucionJuridica.findUnique({
    where: { id: parseInt(id) },
    select: { nombre: true },
  });
  return { title: inst ? `${inst.nombre} — Studio Iuris` : "Institución — Studio Iuris" };
}

const MODULE_INFO = [
  { key: "flashcards", label: "Flashcards", href: "/dashboard/flashcards" },
  { key: "mcqs", label: "MCQ", href: "/dashboard/mcq" },
  { key: "trueFalses", label: "V/F", href: "/dashboard/truefalse" },
  { key: "definiciones", label: "Definiciones", href: "/dashboard/definiciones" },
  { key: "fillBlanks", label: "Completar", href: "/dashboard/completar-espacios" },
  { key: "errorIdentifications", label: "Errores", href: "/dashboard/identificar-errores" },
  { key: "orderSequences", label: "Ordenar", href: "/dashboard/ordenar-secuencias" },
  { key: "matchColumns", label: "Relacionar", href: "/dashboard/relacionar-columnas" },
  { key: "casoPracticos", label: "Casos", href: "/dashboard/casos-practicos" },
  { key: "dictados", label: "Dictado", href: "/dashboard/dictado-juridico" },
  { key: "timelines", label: "Timeline", href: "/dashboard/linea-de-tiempo" },
] as const;

const TAG_COLORS: Record<string, string> = {
  fundamental: "bg-gz-gold/15 text-gz-gold",
  complejo: "bg-gz-burgundy/15 text-gz-burgundy",
  transversal: "bg-gz-navy/15 text-gz-navy",
  técnico: "bg-gz-sage/15 text-gz-sage",
  importante: "bg-gz-gold/10 text-gz-gold",
  específico: "bg-gz-ink-light/10 text-gz-ink-mid",
  básico: "bg-gz-sage/10 text-gz-sage",
  frecuente: "bg-gz-burgundy/10 text-gz-burgundy",
};

export default async function InstitucionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = parseInt(idStr);

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const inst = await prisma.institucionJuridica.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          flashcards: true,
          mcqs: true,
          trueFalses: true,
          definiciones: true,
          fillBlanks: true,
          errorIdentifications: true,
          orderSequences: true,
          matchColumns: true,
          casoPracticos: true,
          dictados: true,
          timelines: true,
        },
      },
    },
  });

  if (!inst) notFound();

  // User progress for this institution
  const [fcDone, mcqDone, tfDone] = await Promise.all([
    prisma.userFlashcardProgress.count({
      where: { userId: authUser.id, repetitions: { gte: 1 }, flashcard: { institucionId: id } },
    }),
    prisma.userMCQAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true, mcq: { institucionId: id } },
      distinct: ["mcqId"],
      select: { mcqId: true },
    }),
    prisma.userTrueFalseAttempt.findMany({
      where: { userId: authUser.id, isCorrect: true, trueFalse: { institucionId: id } },
      distinct: ["trueFalseId"],
      select: { trueFalseId: true },
    }),
  ]);

  const totalDone = fcDone + mcqDone.length + tfDone.length;
  const counts = inst._count;
  const totalExercicios =
    counts.flashcards + counts.mcqs + counts.trueFalses +
    counts.definiciones + counts.fillBlanks + counts.errorIdentifications +
    counts.orderSequences + counts.matchColumns + counts.casoPracticos +
    counts.dictados + counts.timelines;

  const percent = totalExercicios > 0
    ? Math.min(Math.round((totalDone / totalExercicios) * 100), 100)
    : 0;

  // Sub-contenido parsed
  const subItems = inst.subContenido.split(" · ").filter(Boolean);

  // Articles
  const articles = [inst.articulosCC, inst.articulosCPC, inst.articulosCOT].filter(Boolean);

  // Active modules (with content)
  const activeModules = MODULE_INFO.filter((m) => {
    const count = counts[m.key as keyof typeof counts];
    return count > 0;
  });

  return (
    <main className="min-h-screen pb-20 lg:pb-6" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard/instituciones"
          className="font-archivo text-[13px] text-gz-ink-mid hover:text-gz-gold transition-colors"
        >
          ← Instituciones
        </Link>

        {/* Header */}
        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-cormorant text-[32px] lg:text-[40px] font-bold text-gz-ink">
              {inst.nombre}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={`px-2 py-0.5 rounded-sm font-ibm-mono text-[9px] uppercase tracking-[1px] ${
                  TAG_COLORS[inst.tag] || "bg-gz-cream-dark text-gz-ink-light"
                }`}
              >
                {inst.tag}
              </span>
              <span className="font-ibm-mono text-[11px] text-gz-ink-light">
                {inst.area}
              </span>
            </div>
          </div>
        </div>

        {/* Articles */}
        {articles.length > 0 && (
          <p className="font-ibm-mono text-[11px] text-gz-ink-light mt-3">
            {articles.join(" · ")}
          </p>
        )}

        {/* Description */}
        <p className="font-archivo text-[15px] text-gz-ink-mid leading-relaxed mt-4">
          {inst.descripcion}
        </p>
        <div className="h-[2px] mt-4 mb-6" style={{ backgroundColor: "var(--gz-rule-dark)" }} />

        {/* Sub-contenido */}
        <div className="rounded-[4px] border border-gz-rule p-5 bg-white mb-6">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-3">
            Sub-instituciones
          </p>
          <div className="flex flex-wrap gap-2">
            {subItems.map((item, i) => (
              <span
                key={i}
                className="px-3 py-1.5 rounded-[3px] border border-gz-rule font-archivo text-[12px] text-gz-ink-mid"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-[4px] border border-gz-rule p-5 bg-white mb-6">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-2">
            Tu Progreso
          </p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div
                className="h-3 rounded-sm overflow-hidden"
                style={{ backgroundColor: "var(--gz-cream-dark)" }}
              >
                <div
                  className="h-full rounded-sm bg-gz-gold transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
            <span className="font-cormorant text-[28px] font-bold text-gz-gold">
              {percent}%
            </span>
          </div>
          <p className="font-ibm-mono text-[11px] text-gz-ink-light mt-1">
            {totalDone} / {totalExercicios} ejercicios completados
          </p>
        </div>

        {/* Study modules */}
        <div className="rounded-[4px] border border-gz-rule p-5 bg-white mb-6">
          <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-3">
            {totalExercicios} ejercicios disponibles
          </p>
          <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-3">
            Estudiar por módulo:
          </p>
          <div className="flex flex-wrap gap-2">
            {activeModules.map((m) => {
              const count = counts[m.key as keyof typeof counts];
              return (
                <Link
                  key={m.key}
                  href={`${m.href}?institucionId=${id}`}
                  className="px-4 py-2 rounded-[3px] border border-gz-rule font-archivo text-[12px] font-semibold text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition-colors"
                >
                  {m.label} ({count})
                </Link>
              );
            })}
          </div>
        </div>

        {/* Back */}
        <div className="text-center mt-6">
          <Link
            href="/dashboard/instituciones"
            className="font-archivo text-[13px] text-gz-ink-light underline hover:text-gz-ink transition-colors"
          >
            Volver a Instituciones
          </Link>
        </div>
      </div>
    </main>
  );
}
