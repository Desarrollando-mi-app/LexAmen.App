import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function ColumnasIndexPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const columnas = await prisma.columnaJuridica.findMany({
    where: { isActive: true, isHidden: false, showInFeed: true },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      titulo: true,
      resumen: true,
      materia: true,
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
        },
      },
    },
  });

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 pt-6 pb-16">
        {/* Masthead */}
        <header className="border-t-[3px] border-b border-gz-ink pt-3 pb-2 mb-8">
          <div className="flex items-baseline justify-between gap-4">
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid">
              <Link href="/dashboard/diario" className="hover:text-gz-gold">El Diario</Link>
              {" · "}
              Columnas de Opinión
            </div>
            <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-light hidden sm:block">
              {columnas.length} publicadas
            </div>
          </div>
        </header>

        <h1 className="font-cormorant text-4xl sm:text-5xl font-semibold text-gz-ink mb-2">Columnas</h1>
        <p className="font-cormorant italic text-lg text-gz-ink-mid mb-10 max-w-2xl">
          Opinión y análisis editorial desde el claustro. Textos libres de columnistas del Studio IURIS.
        </p>

        {columnas.length === 0 ? (
          <div className="border border-gz-rule bg-gz-cream-dark/20 p-10 text-center">
            <p className="font-cormorant italic text-2xl text-gz-ink-mid mb-2">
              Aún no hay columnas publicadas.
            </p>
            <p className="font-archivo text-sm text-gz-ink-light">
              El editor de columnas llegará pronto.
            </p>
          </div>
        ) : (
          <ul className="divide-y-[2px] divide-gz-ink">
            {columnas.map((c) => {
              const published = new Date(c.createdAt).toLocaleDateString("es-CL", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <li key={c.id} className="py-6">
                  <div className="font-ibm-mono text-[9px] uppercase tracking-[3px] text-gz-ink-mid mb-2">
                    — Columna —
                    {c.materia && <span className="text-gz-ink-light"> · {c.materia}</span>}
                  </div>
                  <Link href={`/dashboard/diario/columnas/${c.id}`} className="block hover:opacity-80">
                    <h2 className="font-cormorant text-3xl font-semibold leading-tight text-gz-ink mb-2">
                      {c.titulo}
                    </h2>
                    {c.resumen && (
                      <p className="font-archivo text-[15px] leading-relaxed text-gz-ink-mid max-w-2xl mb-2">
                        {c.resumen}
                      </p>
                    )}
                  </Link>
                  <div className="flex items-center gap-4 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
                    <Link
                      href={`/dashboard/perfil/${c.user.id}`}
                      className="text-gz-ink hover:text-gz-gold"
                    >
                      {c.user.firstName} {c.user.lastName}
                    </Link>
                    <span>· {published}</span>
                    <span className="ml-auto">
                      <span className="text-gz-burgundy">♥</span> {c.apoyosCount}
                      {" · "}
                      <span className="text-gz-gold">❝</span> {c.citasCount}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
