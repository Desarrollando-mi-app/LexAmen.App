import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaGradient,
  areaLabel,
  deadlineLabel,
  isDeadlinePassed,
  estudioInitial,
} from "@/lib/pasantias-helpers";
import { initials } from "@/lib/ayudantias-v4-helpers";
import { PostularForm } from "./postular-form";

/**
 * Formulario de postulación a una oferta de pasantía (type = "ofrezco").
 *
 * Flujo:
 *  - Sólo postulaciones INTERNAS (las EXTERNAS redirigen al postulacionUrl
 *    desde la página de detalle).
 *  - Pre-checks server-side: deadline vigente, no ser el publicador, no
 *    haber postulado antes. Si algo falla, redirigimos al detalle con un
 *    mensaje en lugar de mostrar un form muerto.
 *  - El form pide CV (URL opcional, sugerimos drive/dropbox), carta de
 *    motivación opcional y mensaje libre.
 */
export default async function PostularPage({
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

  const pasantia = await prisma.pasantia.findFirst({
    where: { id, type: "ofrezco", isActive: true, isHidden: false },
    include: {
      user: {
        select: { firstName: true, lastName: true },
      },
      estudio: {
        select: { nombre: true, slug: true, verificado: true },
      },
    },
  });
  if (!pasantia) notFound();

  // Si es propia o EXTERNA, no tiene sentido el form: volvemos al detalle
  if (pasantia.userId === authUser.id) {
    redirect(`/dashboard/sala/pasantias/oferta/${pasantia.id}`);
  }
  if (pasantia.postulacionTipo === "EXTERNA") {
    redirect(`/dashboard/sala/pasantias/oferta/${pasantia.id}`);
  }

  const cerrada = isDeadlinePassed(pasantia.fechaLimite);
  const deadline = deadlineLabel(pasantia.fechaLimite);

  // ¿Ya postuló?
  const existing = await prisma.pasantiaPostulacion.findUnique({
    where: {
      pasantiaId_postulanteId: {
        pasantiaId: pasantia.id,
        postulanteId: authUser.id,
      },
    },
    select: { id: true, estado: true },
  });

  // Datos del postulante para el resumen y para sugerir authorDisplay luego
  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      firstName: true,
      lastName: true,
      etapaActual: true,
      universidad: true,
      cvAvailable: true,
      universityYear: true,
    },
  });

  const gradient = areaGradient(pasantia.areaPractica);
  const headerInitial = pasantia.estudio
    ? estudioInitial(pasantia.estudio.nombre)
    : initials(pasantia.user.firstName, pasantia.user.lastName);
  const headerNombre = pasantia.estudio?.nombre ?? pasantia.empresa;

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      {/* Breadcrumb */}
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link
          href={`/dashboard/sala/pasantias/oferta/${pasantia.id}`}
          className="hover:text-gz-gold transition-colors"
        >
          ← Volver a la oferta
        </Link>
      </div>

      {/* Folio editorial */}
      <header className="max-w-[900px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Postulación</span>
        <span>Formulario interno</span>
      </header>

      <main className="max-w-[900px] mx-auto px-7 py-10">
        {/* Resumen de la oferta */}
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
              {areaLabel(pasantia.areaPractica)} · {pasantia.ciudad}
            </div>
            <h1 className="mt-1 font-cormorant font-semibold text-[28px] leading-[1.05] tracking-[-0.5px] text-gz-ink m-0 line-clamp-2">
              {pasantia.titulo}
            </h1>
            <div className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid">
              {pasantia.estudio ? (
                <>
                  Publicada por{" "}
                  <span className="not-italic font-semibold text-gz-ink">
                    {pasantia.estudio.nombre}
                  </span>
                  {pasantia.estudio.verificado && (
                    <span className="ml-1.5 font-ibm-mono not-italic text-[9px] tracking-[1.2px] uppercase text-gz-gold">
                      ✓ Verificado
                    </span>
                  )}
                </>
              ) : (
                <>
                  Publicada por{" "}
                  <span className="not-italic font-semibold text-gz-ink">
                    {headerNombre}
                  </span>
                </>
              )}
              {deadline && (
                <span
                  className={`ml-2 font-ibm-mono not-italic text-[10px] tracking-[1.2px] uppercase ${
                    cerrada ? "text-gz-burgundy" : "text-gz-ink-light"
                  }`}
                >
                  · {deadline}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Bloqueado: cerrada o ya postuló */}
        {cerrada ? (
          <Notice
            tono="burgundy"
            titulo="Postulaciones cerradas"
            cuerpo="Esta oferta ya no recibe postulaciones nuevas. Si tienes interés, intenta contactarte directamente con el publicador a través de los canales que dejó disponibles."
            cta={{
              href: `/dashboard/sala/pasantias/oferta/${pasantia.id}`,
              label: "Volver al detalle",
            }}
          />
        ) : existing ? (
          <Notice
            tono="gold"
            titulo="Ya postulaste a esta pasantía"
            cuerpo={`Tu postulación está en estado «${existing.estado.toLowerCase()}». No puedes enviar otra; revísala desde Gestión para ver actualizaciones.`}
            cta={{
              href: `/dashboard/sala/pasantias/gestion?tab=postulaciones`,
              label: "Ir a mis postulaciones",
            }}
          />
        ) : (
          <>
            {/* Encabezado del form */}
            <section className="mt-10 mb-5">
              <h2 className="font-cormorant font-semibold text-[34px] leading-[1.05] tracking-[-0.5px] text-gz-ink m-0">
                <span className="text-gz-gold italic font-medium mr-1.5">§</span>
                Tu postulación
              </h2>
              <p className="mt-2 font-cormorant italic text-[15.5px] text-gz-ink-mid m-0">
                {me?.firstName} {me?.lastName}
                {me?.etapaActual && ` · ${capitalize(me.etapaActual)}`}
                {me?.universidad && ` · ${me.universidad}`}
                {me?.universityYear && ` · ${me.universityYear}° año`}
              </p>
              <div className="mt-3 w-14 h-px bg-gz-gold" />
            </section>

            {/* Form cliente */}
            <PostularForm
              pasantiaId={pasantia.id}
              pasantiaTitulo={pasantia.titulo}
              cvAvailableEnPerfil={!!me?.cvAvailable}
            />

            {/* Disclaimer */}
            <p className="mt-7 font-archivo text-[11.5px] text-gz-ink-light leading-[1.55] italic">
              Studio Iuris facilita el contacto entre estudiantes, egresados y
              estudios. La selección, condiciones laborales y eventual
              relación contractual son de exclusiva responsabilidad entre el
              postulante y el publicador. Al enviar esta postulación aceptas
              que tus datos básicos de perfil sean compartidos con el
              publicador.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Notice({
  tono,
  titulo,
  cuerpo,
  cta,
}: {
  tono: "burgundy" | "gold";
  titulo: string;
  cuerpo: string;
  cta: { href: string; label: string };
}) {
  const accent =
    tono === "burgundy"
      ? "border-l-[3px] border-gz-burgundy"
      : "border-l-[3px] border-gz-gold";
  return (
    <section className={`mt-10 bg-white border border-gz-rule ${accent} p-7`}>
      <h2 className="font-cormorant font-semibold text-[26px] tracking-[-0.3px] text-gz-ink m-0">
        {titulo}
      </h2>
      <p className="mt-2 font-archivo text-[14px] text-gz-ink-mid leading-[1.6] m-0">
        {cuerpo}
      </p>
      <Link
        href={cta.href}
        className="mt-5 inline-block px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
      >
        {cta.label} →
      </Link>
    </section>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
