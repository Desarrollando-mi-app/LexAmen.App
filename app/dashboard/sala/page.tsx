import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function SalaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Fetch 3 most recent active ayudantias for preview
  const recentAyudantias = await prisma.ayudantia.findMany({
    where: { isActive: true, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      user: {
        select: { firstName: true, lastName: true, universidad: true },
      },
    },
  });

  const secciones = [
    {
      emoji: "\uD83C\uDF93",
      nombre: "Ayudant\u00EDas",
      desc: "Ofrece o busca clases particulares",
      href: "/dashboard/sala/ayudantias",
    },
    {
      emoji: "\uD83D\uDCBC",
      nombre: "Pasant\u00EDas",
      desc: "Oportunidades en estudios jur\u00EDdicos",
      href: "/dashboard/sala/pasantias",
    },
    {
      emoji: "\uD83D\uDCC5",
      nombre: "Eventos",
      desc: "Seminarios y actividades acad\u00E9micas",
      href: "/dashboard/sala/eventos",
    },
    {
      emoji: "\uD83C\uDFE2",
      nombre: "Ofertas",
      desc: "Bolsa de trabajo jur\u00EDdica",
      href: "/dashboard/sala/ofertas",
    },
  ];

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light mb-1">
          COMUNIDAD &middot; LA SALA
        </p>
        <h1 className="font-cormorant text-[28px] !font-bold text-gz-ink">
          La Sala
        </h1>
        <div className="w-12 h-[2px] bg-gz-gold mt-2 mb-6" />

        {/* Navigation grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {secciones.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="bg-white border border-gz-rule rounded-[4px] p-5 hover:border-gz-gold hover:shadow-sm transition-all cursor-pointer group"
            >
              <span className="text-[28px] block mb-3">{s.emoji}</span>
              <p className="font-cormorant text-[18px] !font-bold text-gz-ink group-hover:text-gz-gold transition-colors">
                {s.nombre}
              </p>
              <p className="font-archivo text-[12px] text-gz-ink-mid mt-1">
                {s.desc}
              </p>
            </Link>
          ))}
        </div>

        {/* Recent ayudantias preview */}
        {recentAyudantias.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-cormorant text-[20px] !font-bold text-gz-ink">
                Ayudant&iacute;as recientes
              </h2>
              <Link
                href="/dashboard/sala/ayudantias"
                className="font-archivo text-[12px] font-semibold text-gz-gold hover:text-gz-ink transition-colors"
              >
                Ver todas &rarr;
              </Link>
            </div>
            <div className="space-y-3">
              {recentAyudantias.map((a) => (
                <Link
                  key={a.id}
                  href="/dashboard/sala/ayudantias"
                  className="block bg-white border border-gz-rule rounded-[4px] p-4 hover:border-gz-gold transition-colors"
                >
                  <p
                    className={`font-ibm-mono text-[9px] uppercase tracking-[1.5px] mb-1 ${
                      a.type === "OFREZCO" ? "text-gz-sage" : "text-gz-burgundy"
                    }`}
                  >
                    {a.type === "OFREZCO" ? "OFREZCO AYUDANT\u00CDA" : "BUSCO AYUDANT\u00CDA"}
                  </p>
                  <p className="font-cormorant text-[16px] !font-bold text-gz-ink">
                    {a.titulo || a.materia}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 font-archivo text-[11px] text-gz-ink-light">
                    <span>{a.user.firstName} {a.user.lastName}</span>
                    {a.user.universidad && <span>&middot; {a.user.universidad}</span>}
                    <span>&middot; {a.materia}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
