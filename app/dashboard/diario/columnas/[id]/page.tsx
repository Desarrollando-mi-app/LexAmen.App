import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

interface Props {
  params: { id: string };
}

export default async function ColumnaDetailPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const columna = await prisma.columnaJuridica.findFirst({
    where: { id: params.id, isActive: true, isHidden: false },
    select: {
      id: true,
      titulo: true,
      resumen: true,
      contenido: true,
      materia: true,
      tags: true,
      createdAt: true,
      apoyosCount: true,
      citasCount: true,
      viewsCount: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          avatarUrl: true,
          etapaActual: true,
        },
      },
    },
  });

  if (!columna) notFound();

  const author = columna.user;
  const authorInitials = `${author.firstName[0] ?? ""}${author.lastName[0] ?? ""}`.toUpperCase();
  const published = new Date(columna.createdAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-[760px] px-4 sm:px-6 pt-6 pb-16">
        {/* Breadcrumb */}
        <nav className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-6">
          <Link href="/dashboard/diario" className="hover:text-gz-gold">El Diario</Link>
          {" / "}
          <Link href="/dashboard/diario/columnas" className="hover:text-gz-gold">Columnas</Link>
        </nav>

        {/* Eyebrow */}
        <div className="font-ibm-mono text-[10px] uppercase tracking-[4px] text-gz-ink-mid mb-3">
          — Columna de Opinión —
          {columna.materia && <span className="text-gz-ink-light"> · {columna.materia}</span>}
        </div>

        {/* Title */}
        <h1 className="font-cormorant text-4xl sm:text-5xl lg:text-6xl font-semibold leading-[1.05] text-gz-ink mb-4">
          {columna.titulo}
        </h1>

        {/* Lead */}
        {columna.resumen && (
          <p className="font-cormorant italic text-xl sm:text-2xl text-gz-ink-mid leading-snug mb-6 max-w-2xl">
            {columna.resumen}
          </p>
        )}

        {/* Byline */}
        <div className="flex items-center gap-3 py-4 border-y border-gz-rule mb-8">
          <Link
            href={`/dashboard/perfil/${author.id}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
          >
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatarUrl}
                alt={`${author.firstName} ${author.lastName}`}
                className="w-11 h-11 rounded-[3px] border border-gz-rule object-cover"
              />
            ) : (
              <div className="w-11 h-11 rounded-[3px] border border-gz-ink bg-gz-ink text-gz-cream flex items-center justify-center font-cormorant text-lg">
                {authorInitials}
              </div>
            )}
            <div>
              <div className="font-archivo text-sm font-semibold text-gz-ink leading-tight">
                {author.firstName} {author.lastName}
              </div>
              <div className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light leading-tight">
                {author.universidad ?? "Studio IURIS"} · {published}
              </div>
            </div>
          </Link>
        </div>

        {/* Body — plaintext / markdown; render as typographic prose */}
        <article className="font-cormorant text-[19px] leading-[1.6] text-gz-ink whitespace-pre-wrap">
          {columna.contenido}
        </article>

        {/* Footer ledger */}
        <footer className="mt-10 pt-4 border-t-[2px] border-gz-ink flex items-center gap-6 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid">
          <span>
            <span className="text-gz-burgundy">♥</span> {columna.apoyosCount} apoyos
          </span>
          <span>
            <span className="text-gz-gold">❝</span> {columna.citasCount} citas
          </span>
          <span className="text-gz-ink-light">{columna.viewsCount} lecturas</span>
          <span className="ml-auto font-cormorant italic normal-case text-sm">— fin —</span>
        </footer>
      </div>
    </main>
  );
}
