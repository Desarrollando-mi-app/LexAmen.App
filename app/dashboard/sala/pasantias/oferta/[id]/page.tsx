import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaGradient,
  areaLabel,
  formatoLabel,
  jornadaLabel,
  remuneracionLabel,
  tamanoLabel,
  deadlineLabel,
  isDeadlinePassed,
  formatDateShort,
  estudioInitial,
} from "@/lib/pasantias-helpers";
import { initials, formatRelative } from "@/lib/ayudantias-v4-helpers";

/**
 * Detalle de una pasantía ofrecida (type = "ofrezco").
 * Si está vinculada a un `EstudioJuridico` verificado, el encabezado destaca
 * al estudio. Si no, cae en el autor-persona.
 * CTA principal: "Postular" → interna o externa, según publicación.
 */
export default async function OfertaPasantiaPage({
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
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          etapaActual: true,
          empleoActual: true,
          cargoActual: true,
        },
      },
      estudio: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          logoUrl: true,
          sitioWeb: true,
          tamano: true,
          descripcion: true,
          verificado: true,
          ciudad: true,
          region: true,
        },
      },
    },
  });
  if (!pasantia) notFound();

  const isOwnPost = pasantia.userId === authUser.id;
  const gradient = areaGradient(pasantia.areaPractica);
  const cerrada = isDeadlinePassed(pasantia.fechaLimite);
  const deadline = deadlineLabel(pasantia.fechaLimite);

  // ¿Ya postuló el usuario actual?
  const postulacion = isOwnPost
    ? null
    : await prisma.pasantiaPostulacion.findUnique({
        where: {
          pasantiaId_postulanteId: {
            pasantiaId: pasantia.id,
            postulanteId: authUser.id,
          },
        },
        select: { id: true, estado: true, createdAt: true },
      });

  const headerNombre = pasantia.estudio?.nombre ?? pasantia.empresa;
  const headerInitial = pasantia.estudio
    ? estudioInitial(pasantia.estudio.nombre)
    : initials(pasantia.user.firstName, pasantia.user.lastName);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link href="/dashboard/sala/pasantias" className="hover:text-gz-gold transition-colors">
          ← Pasantías
        </Link>
      </div>

      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Pasantías</span>
        <span>Oferta de pasantía</span>
      </header>

      <main className="max-w-[1100px] mx-auto px-7">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10 py-11 border-b border-gz-rule">
          <div
            className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: gradient }}
          >
            <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-ink/95 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
              Ofrece pasantía
            </span>
            {pasantia.estudio?.verificado && (
              <span className="absolute top-3.5 right-3.5 z-[2] px-2.5 py-[5px] bg-gz-gold/95 text-gz-ink rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-semibold">
                ✓ Estudio verificado
              </span>
            )}
            <div className="relative z-[1] font-cormorant font-bold text-[180px] leading-none tracking-[-4px] text-gz-cream/92">
              {headerInitial}
            </div>
            {deadline && (
              <span
                className={`absolute bottom-3.5 left-3.5 z-[2] font-ibm-mono text-[10px] tracking-[1.3px] uppercase px-2.5 py-[5px] rounded-full
                           ${cerrada ? "bg-gz-ink/80 text-gz-cream/70 line-through" : "bg-gz-cream/95 text-gz-ink"}`}
              >
                {deadline}
              </span>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-ink-mid mb-2">
              {areaLabel(pasantia.areaPractica)} · {pasantia.ciudad}
            </div>
            <h1 className="font-cormorant font-semibold text-[46px] leading-[1.02] tracking-[-1px] text-gz-ink m-0">
              {pasantia.titulo}
            </h1>
            <div className="mt-3 w-14 h-px bg-gz-gold" />
            <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-mid">
              {pasantia.estudio ? (
                <>
                  Publicado por{" "}
                  <Link
                    href={`/dashboard/sala/pasantias/estudio/${pasantia.estudio.slug}`}
                    className="not-italic font-semibold text-gz-ink hover:text-gz-gold transition-colors"
                  >
                    {pasantia.estudio.nombre}
                  </Link>
                  {pasantia.estudio.tamano && (
                    <span className="text-[14px]"> · {tamanoLabel(pasantia.estudio.tamano)}</span>
                  )}
                </>
              ) : (
                <>
                  Publicado por{" "}
                  <strong className="not-italic font-semibold text-gz-ink">
                    {headerNombre}
                  </strong>
                  {pasantia.user.cargoActual && ` · ${pasantia.user.cargoActual}`}
                </>
              )}
            </p>

            <div className="mt-6 flex gap-2.5 flex-wrap">
              {!isOwnPost ? (
                postulacion ? (
                  <span className="px-5 py-3 border border-gz-gold text-gz-gold font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
                    Postulación {postulacion.estado.toLowerCase()}
                  </span>
                ) : cerrada ? (
                  <span className="px-5 py-3 bg-gz-ink-light/20 text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase cursor-not-allowed">
                    Postulación cerrada
                  </span>
                ) : (
                  <Link
                    href={`/dashboard/sala/pasantias/oferta/${pasantia.id}/postular`}
                    className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                  >
                    Postular →
                  </Link>
                )
              ) : (
                <Link
                  href={`/dashboard/sala/pasantias/gestion?edit=${pasantia.id}`}
                  className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                >
                  Editar publicación
                </Link>
              )}
              {pasantia.contactoWhatsapp && (
                <a
                  href={`https://wa.me/${pasantia.contactoWhatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 border border-gz-sage text-gz-sage font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-sage hover:text-gz-cream transition"
                >
                  WhatsApp
                </a>
              )}
              {pasantia.contactoEmail && (
                <a
                  href={`mailto:${pasantia.contactoEmail}`}
                  className="px-5 py-3 border border-gz-ink text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-gold hover:text-gz-gold transition"
                >
                  Email
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Detalle */}
        <section className="py-10 border-b border-gz-rule">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>Detalle de la pasantía
            </h2>
            <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
              {formatRelative(pasantia.createdAt.toISOString())}
            </span>
          </div>

          <div className="border border-gz-rule bg-white p-7">
            <p className="text-[14.5px] leading-[1.65] text-gz-ink-mid [&::first-line]:font-medium [&::first-line]:text-gz-ink m-0 whitespace-pre-wrap">
              {pasantia.descripcion}
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-0 border border-gz-rule">
              <Cell label="Formato" value={formatoLabel(pasantia.formato)} />
              <Cell label="Jornada" value={jornadaLabel(pasantia.jornada)} />
              <Cell
                label="Remuneración"
                value={remuneracionLabel(pasantia.remuneracion, pasantia.montoRemu)}
                accent={
                  pasantia.remuneracion === "no_pagada"
                    ? "muted"
                    : pasantia.remuneracion === "pagada"
                    ? "paid"
                    : undefined
                }
              />
              <Cell
                label="Cupos"
                value={pasantia.cupos ? String(pasantia.cupos) : "A definir"}
              />
            </div>

            {(pasantia.fechaInicio || pasantia.fechaLimite || pasantia.duracion) && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-0 border border-gz-rule">
                {pasantia.fechaInicio && (
                  <Cell
                    label="Inicio"
                    value={formatDateShort(pasantia.fechaInicio)}
                  />
                )}
                {pasantia.fechaLimite && (
                  <Cell
                    label="Postulaciones hasta"
                    value={formatDateShort(pasantia.fechaLimite)}
                  />
                )}
                {pasantia.duracion && (
                  <Cell label="Duración" value={pasantia.duracion} />
                )}
              </div>
            )}

            {pasantia.requisitos && (
              <div className="mt-5 border-l-[3px] border-gz-gold pl-4 py-3 bg-gz-cream/40">
                <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-mid mb-1">
                  Requisitos
                </div>
                <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-[1.55] m-0 whitespace-pre-wrap">
                  {pasantia.requisitos}
                </p>
              </div>
            )}

            {(pasantia.anioMinimoCarrera || pasantia.promedioMinimo || (pasantia.areasRequeridas && pasantia.areasRequeridas.length > 0)) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {pasantia.anioMinimoCarrera && (
                  <Chip label={`Año mínimo: ${pasantia.anioMinimoCarrera}°`} />
                )}
                {pasantia.promedioMinimo && (
                  <Chip label={`Promedio mín.: ${pasantia.promedioMinimo.toFixed(1)}`} />
                )}
                {pasantia.areasRequeridas?.map((a) => (
                  <Chip key={a} label={a} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Estudio (si aplica) */}
        {pasantia.estudio && (
          <section className="py-10 pb-16">
            <h2 className="font-cormorant font-semibold text-[24px] tracking-[-0.3px] text-gz-ink m-0 mb-4">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>Sobre el estudio
            </h2>
            <div className="border border-gz-rule bg-white p-5 flex items-start gap-4">
              <div
                className="w-16 h-16 rounded-[4px] flex items-center justify-center text-gz-cream font-cormorant font-bold text-[28px] shrink-0"
                style={{ background: "var(--gz-ink)" }}
              >
                {estudioInitial(pasantia.estudio.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/dashboard/sala/pasantias/estudio/${pasantia.estudio.slug}`}
                  className="font-cormorant font-semibold text-[22px] text-gz-ink leading-tight hover:text-gz-gold transition-colors"
                >
                  {pasantia.estudio.nombre}
                </Link>
                <div className="mt-0.5 font-archivo text-[13px] text-gz-ink-mid">
                  {[
                    pasantia.estudio.tamano && tamanoLabel(pasantia.estudio.tamano),
                    pasantia.estudio.ciudad,
                    pasantia.estudio.region,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {pasantia.estudio.descripcion && (
                  <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.5] line-clamp-3">
                    {pasantia.estudio.descripcion}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Cell({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "paid" | "muted";
}) {
  return (
    <div className="p-3.5 border-r last:border-r-0 border-gz-rule">
      <div className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div
        className={`mt-1 text-[13.5px]
          ${accent === "paid" ? "text-gz-burgundy font-semibold" : ""}
          ${accent === "muted" ? "text-gz-sage italic font-semibold" : ""}
          ${!accent ? "text-gz-ink" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="font-ibm-mono text-[10px] tracking-[1.2px] uppercase text-gz-ink-mid px-2.5 py-1 rounded-[3px] border border-gz-rule bg-gz-cream/40">
      {label}
    </span>
  );
}
