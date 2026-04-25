import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaGradient,
  areaLabel,
  estudioInitial,
  formatDateShort,
} from "@/lib/pasantias-helpers";
import { initials } from "@/lib/ayudantias-v4-helpers";
import { ResenarForm } from "./resenar-form";

/**
 * Formulario para que el ex-pasante deje su reseña de la pasantía.
 *
 * Reglas:
 *  - Sólo el postulante (postulanteId === me) puede reseñar.
 *  - La postulación debe estar en estado COMPLETADA.
 *  - Una sola reseña por postulación (verificado en DB con @unique).
 *
 * Si la postulación no existe / no es mía / no está completada / ya tiene
 * reseña, redirigimos a Gestión con el contexto adecuado en vez de mostrar
 * un form muerto.
 */
export default async function ResenarPage({
  params,
}: {
  params: Promise<{ postulacionId: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { postulacionId } = await params;

  const postulacion = await prisma.pasantiaPostulacion.findUnique({
    where: { id: postulacionId },
    include: {
      pasantia: {
        select: {
          id: true,
          titulo: true,
          areaPractica: true,
          ciudad: true,
          empresa: true,
          user: {
            select: { firstName: true, lastName: true },
          },
          estudio: {
            select: {
              id: true,
              slug: true,
              nombre: true,
              verificado: true,
            },
          },
        },
      },
      review: { select: { id: true } },
    },
  });

  if (!postulacion) notFound();

  // Si no soy el postulante, fuera.
  if (postulacion.postulanteId !== authUser.id) {
    redirect("/dashboard/sala/pasantias/gestion?tab=enviadas");
  }

  // Si ya reseñé, vuelvo a Gestión.
  if (postulacion.review) {
    redirect("/dashboard/sala/pasantias/gestion?tab=enviadas");
  }

  // Datos del postulante para sugerir authorDisplay por defecto.
  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      firstName: true,
      lastName: true,
      etapaActual: true,
      universidad: true,
      universityYear: true,
    },
  });

  const cerrada = postulacion.estado === "COMPLETADA";
  const headerInitial = postulacion.pasantia.estudio
    ? estudioInitial(postulacion.pasantia.estudio.nombre)
    : initials(
        postulacion.pasantia.user.firstName,
        postulacion.pasantia.user.lastName,
      );
  const headerNombre =
    postulacion.pasantia.estudio?.nombre ?? postulacion.pasantia.empresa;
  const gradient = areaGradient(postulacion.pasantia.areaPractica);

  // Sugerencia: "Estudiante · UDP · 2026" o "Egresado · U. de Chile · 2025"
  const sugerenciaAuthor = [
    me?.etapaActual ? capitalize(me.etapaActual) : "Pasante",
    me?.universidad,
    new Date().getFullYear(),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      {/* Breadcrumb */}
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link
          href="/dashboard/sala/pasantias/gestion?tab=enviadas"
          className="hover:text-gz-gold transition-colors"
        >
          ← Volver a mis postulaciones
        </Link>
      </div>

      {/* Folio */}
      <header className="max-w-[900px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Reseña de pasantía</span>
        <span>{formatDateShort(new Date())}</span>
      </header>

      <main className="max-w-[900px] mx-auto px-7 py-10">
        {/* Resumen */}
        <section className="border border-gz-rule bg-white p-5 flex items-stretch gap-5">
          <div
            className="w-[120px] shrink-0 aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: gradient }}
          >
            <span className="font-cormorant font-bold text-[64px] leading-none tracking-[-2px] text-gz-cream/92">
              {headerInitial}
            </span>
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <div className="font-ibm-mono text-[10px] tracking-[1.6px] uppercase text-gz-ink-mid">
              {areaLabel(postulacion.pasantia.areaPractica)} ·{" "}
              {postulacion.pasantia.ciudad}
            </div>
            <h1 className="mt-1 font-cormorant font-semibold text-[28px] leading-[1.05] tracking-[-0.5px] text-gz-ink m-0 line-clamp-2">
              {postulacion.pasantia.titulo}
            </h1>
            <div className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid">
              Pasantía completada con{" "}
              {postulacion.pasantia.estudio ? (
                <Link
                  href={`/dashboard/sala/pasantias/estudio/${postulacion.pasantia.estudio.slug}`}
                  className="not-italic font-semibold text-gz-ink hover:text-gz-gold"
                >
                  {postulacion.pasantia.estudio.nombre}
                </Link>
              ) : (
                <span className="not-italic font-semibold text-gz-ink">
                  {headerNombre}
                </span>
              )}
              {postulacion.fechaCompletada && (
                <span className="text-gz-ink-light">
                  {" "}
                  · {formatDateShort(postulacion.fechaCompletada)}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Si no está completada, bloqueo */}
        {!cerrada ? (
          <section className="mt-10 bg-white border border-gz-rule border-l-[3px] border-l-gz-burgundy p-7">
            <h2 className="font-cormorant font-semibold text-[26px] tracking-[-0.3px] text-gz-ink m-0">
              Aún no puedes reseñar
            </h2>
            <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid leading-[1.6] m-0">
              Sólo se pueden reseñar postulaciones marcadas como{" "}
              <em className="font-cormorant text-gz-ink not-italic font-semibold">
                Completadas
              </em>{" "}
              por el publicador. Si tu pasantía ya terminó y aún figura como
              «{postulacion.estado.toLowerCase()}», ponte en contacto con el
              estudio para que actualice el estado.
            </p>
            <Link
              href="/dashboard/sala/pasantias/gestion?tab=enviadas"
              className="mt-5 inline-block px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
            >
              Volver a mis postulaciones →
            </Link>
          </section>
        ) : (
          <>
            <section className="mt-10 mb-5">
              <h2 className="font-cormorant font-semibold text-[34px] leading-[1.05] tracking-[-0.5px] text-gz-ink m-0">
                <span className="text-gz-gold italic font-medium mr-1.5">§</span>
                Tu reseña
              </h2>
              <p className="mt-2 font-cormorant italic text-[15.5px] text-gz-ink-mid m-0">
                Esta reseña queda pública y vinculada a la oferta. El
                publicador podrá responder una vez. Sé honesto y específico:
                ayuda a los próximos pasantes a decidir.
              </p>
              <div className="mt-3 w-14 h-px bg-gz-gold" />
            </section>

            <ResenarForm
              postulacionId={postulacion.id}
              authorDisplaySugerido={sugerenciaAuthor}
            />

            <p className="mt-7 font-archivo text-[11.5px] text-gz-ink-light leading-[1.55] italic">
              Studio Iuris no edita ni intermedia las reseñas. La
              responsabilidad sobre lo afirmado es del autor. Las reseñas
              pueden ser reportadas; un administrador modera sólo en casos de
              violación de las normas comunitarias (insultos, datos
              personales, contenido falso evidente).
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
