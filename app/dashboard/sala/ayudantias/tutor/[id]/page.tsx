import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TutorHero } from "@/components/ayudantias/tutor-hero";
import { OfferCard } from "@/components/ayudantias/offer-card";
import { ReviewList, type Review } from "@/components/ayudantias/review-list";
import { formatLabel, priceLabel } from "@/lib/ayudantias-v4-helpers";

const AVATAR_PALETTE = [
  "var(--gz-burgundy)",
  "var(--gz-navy)",
  "var(--gz-sage)",
  "var(--gz-gold)",
  "var(--gz-ink)",
];

export default async function TutorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { id } = await params;

  const tutor = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      universidad: true,
      etapaActual: true,
      region: true,
      createdAt: true,
    },
  });
  if (!tutor) notFound();

  const [offers, ratingStats, evaluaciones] = await Promise.all([
    prisma.ayudantia.findMany({
      where: { userId: id, isActive: true, isHidden: false, type: "OFREZCO" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ayudantiaEvaluacion.aggregate({
      where: { evaluadoId: id },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.ayudantiaEvaluacion.findMany({
      where: { evaluadoId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        evaluador: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const sesionesCount = await prisma.ayudantiaSesion.count({
    where: { tutorId: id, status: "completada" },
  });

  const [primaryOffer, ...otherOffers] = offers;

  const reviews: Review[] = evaluaciones.map((e, i) => ({
    id: e.id,
    author: {
      firstName: e.evaluador.firstName,
      lastName: e.evaluador.lastName,
      avatarColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
    },
    rating: e.rating,
    comment: e.comentario,
    createdAt: e.createdAt.toISOString(),
  }));

  const etapa = (tutor.etapaActual ?? "estudiante").toLowerCase() as
    | "estudiante"
    | "egresado"
    | "abogado";

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link href="/dashboard/sala/ayudantias" className="hover:text-gz-gold transition-colors">
          ← Ayudantías
        </Link>
      </div>

      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Ayudantías</span>
        <span>Perfil de tutor/a</span>
      </header>

      <main className="max-w-[1100px] mx-auto px-7">
        <TutorHero
          user={{
            firstName: tutor.firstName,
            lastName: tutor.lastName,
            universidad: tutor.universidad,
          }}
          materiaPrincipal={primaryOffer?.materia ?? "Derecho"}
          etapa={["estudiante", "egresado", "abogado"].includes(etapa) ? etapa : "estudiante"}
          region={tutor.region}
          rating={ratingStats._avg.rating}
          sesionesCompletadas={sesionesCount}
          desdeISO={tutor.createdAt.toISOString()}
          verificado
        />

        {primaryOffer && (
          <section className="py-10 border-b border-gz-rule">
            <div className="flex justify-between items-baseline mb-5">
              <h2 className="font-cormorant font-semibold text-[30px] tracking-[-0.3px] text-gz-ink m-0">
                <span className="text-gz-gold italic font-medium mr-1.5">§</span>Esta ayudantía
              </h2>
              <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
                Publicada — {new Date(primaryOffer.createdAt).toLocaleDateString("es-CL")}
              </span>
            </div>
            <OfferCard
              materia={primaryOffer.materia}
              titulo={primaryOffer.titulo}
              description={primaryOffer.description}
              format={primaryOffer.format}
              priceType={primaryOffer.priceType}
              priceAmount={primaryOffer.priceAmount}
              disponibilidad={primaryOffer.disponibilidad}
              cupo={null}
              createdAt={primaryOffer.createdAt.toISOString()}
              temario={null}
            />
          </section>
        )}

        {otherOffers.length > 0 && (
          <section className="py-10 border-b border-gz-rule">
            <div className="flex justify-between items-baseline mb-5">
              <h2 className="font-cormorant font-semibold text-[30px] tracking-[-0.3px] text-gz-ink m-0">
                <span className="text-gz-gold italic font-medium mr-1.5">§</span>Otras ayudantías de {tutor.firstName}
              </h2>
              <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
                {otherOffers.length} publicaciones activas
              </span>
            </div>
            <div
              className="grid gap-0 border border-gz-rule bg-white"
              style={{ gridTemplateColumns: `repeat(${Math.min(otherOffers.length, 3)}, minmax(0, 1fr))` }}
            >
              {otherOffers.slice(0, 6).map((o) => (
                <article
                  key={o.id}
                  className="relative p-5 border-r last:border-r-0 border-gz-rule transition hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]"
                >
                  <Link
                    href={`/dashboard/sala/ayudantias/${o.id}`}
                    className="absolute inset-0 z-[1] text-[0]"
                  >
                    Ver ayudantía
                  </Link>
                  <div className="flex justify-between items-baseline mb-2 font-ibm-mono text-[9.5px] tracking-[1.4px] uppercase text-gz-ink-mid">
                    <span>{o.materia}</span>
                    <span className={o.priceType === "GRATUITO" ? "text-gz-sage italic" : "text-gz-gold"}>
                      {priceLabel(o.priceType, o.priceAmount)}
                    </span>
                  </div>
                  <h3 className="font-cormorant font-semibold text-[20px] leading-[1.18] text-gz-ink m-0">
                    {o.titulo || o.materia}
                  </h3>
                  <div className="mt-2.5 text-[12px] text-gz-ink-light">
                    {formatLabel(o.format)} · {o.disponibilidad || "A convenir"}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="py-10 pb-16">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-cormorant font-semibold text-[30px] tracking-[-0.3px] text-gz-ink m-0">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>Reseñas
            </h2>
            <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
              {ratingStats._count.id} valoraciones
            </span>
          </div>
          <ReviewList reviews={reviews} tutorFirstName={tutor.firstName} />
        </section>
      </main>
    </div>
  );
}
