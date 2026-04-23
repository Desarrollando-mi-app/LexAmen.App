import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaLabel,
  tamanoLabel,
  rolLabel,
  estudioInitial,
  formatoLabel,
  jornadaLabel,
  remuneracionLabel,
  deadlineLabel,
  isDeadlinePassed,
} from "@/lib/pasantias-helpers";

/**
 * Perfil público de un estudio jurídico verificado.
 * Muestra: encabezado (logo/inicial + nombre + áreas + tamaño), descripción,
 * miembros destacados (socios/asociados), y pasantías activas del estudio.
 * Si el estudio no está verificado, la página responde 404 al público.
 */
export default async function EstudioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { slug } = await params;

  const estudio = await prisma.estudioJuridico.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              etapaActual: true,
              cargoActual: true,
              universidad: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      pasantias: {
        where: { isActive: true, isHidden: false, type: "ofrezco" },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!estudio) notFound();

  // Sólo miembros (o admins, futuro) pueden ver estudios no verificados.
  const isMember = estudio.members.some((m) => m.userId === authUser.id);
  if (!estudio.verificado && !isMember) notFound();

  const socios = estudio.members.filter(
    (m) => m.rol === "socio" || m.rol === "asociado",
  );

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link href="/dashboard/sala/pasantias" className="hover:text-gz-gold transition-colors">
          ← Pasantías
        </Link>
      </div>

      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Pasantías</span>
        <span>Estudio jurídico</span>
      </header>

      <main className="max-w-[1100px] mx-auto px-7">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-10 py-11 border-b border-gz-rule">
          <div
            className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: "linear-gradient(135deg, #1c1814, #2a241e 55%, #453a2c)" }}
          >
            {!estudio.verificado && (
              <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-burgundy/95 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
                Pendiente de verificación
              </span>
            )}
            {estudio.verificado && (
              <span className="absolute top-3.5 right-3.5 z-[2] px-2.5 py-[5px] bg-gz-gold/95 text-gz-ink rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-semibold">
                ✓ Verificado
              </span>
            )}
            <div className="relative z-[1] font-cormorant font-bold text-[200px] leading-none tracking-[-4px] text-gz-cream/92">
              {estudioInitial(estudio.nombre)}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-ink-mid mb-2">
              Estudio jurídico · {estudio.ciudad ?? estudio.region ?? "Chile"}
            </div>
            <h1 className="font-cormorant font-semibold text-[52px] leading-[1.02] tracking-[-1px] text-gz-ink m-0">
              {estudio.nombre}
            </h1>
            <div className="mt-3 w-14 h-px bg-gz-gold" />
            <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-mid">
              {[
                estudio.tamano && tamanoLabel(estudio.tamano),
                estudio.fundacion && `Fundado en ${estudio.fundacion}`,
                estudio.sitioWeb && (
                  <a
                    key="web"
                    href={estudio.sitioWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gz-gold transition-colors"
                  >
                    Sitio web
                  </a>
                ),
              ]
                .filter(Boolean)
                .map((item, i, arr) => (
                  <span key={i}>
                    {item}
                    {i < arr.length - 1 && " · "}
                  </span>
                ))}
            </p>

            {estudio.areas && estudio.areas.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {estudio.areas.map((a) => (
                  <span
                    key={a}
                    className="font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-ink-mid px-2 py-1 rounded-[3px] border border-gz-rule bg-white"
                  >
                    {areaLabel(a)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Descripción */}
        {estudio.descripcion && (
          <section className="py-10 border-b border-gz-rule">
            <h2 className="font-cormorant font-semibold text-[26px] tracking-[-0.3px] text-gz-ink m-0 mb-4">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>Sobre el estudio
            </h2>
            <div className="border border-gz-rule bg-white p-7">
              <p className="text-[15px] leading-[1.7] text-gz-ink-mid [&::first-letter]:font-cormorant [&::first-letter]:text-[48px] [&::first-letter]:font-bold [&::first-letter]:float-left [&::first-letter]:leading-[0.9] [&::first-letter]:mr-2 [&::first-letter]:mt-1 [&::first-letter]:text-gz-gold m-0 whitespace-pre-wrap">
                {estudio.descripcion}
              </p>
            </div>
          </section>
        )}

        {/* Pasantías activas */}
        {estudio.pasantias.length > 0 ? (
          <section className="py-10 border-b border-gz-rule">
            <div className="flex justify-between items-baseline mb-5">
              <h2 className="font-cormorant font-semibold text-[26px] tracking-[-0.3px] text-gz-ink m-0">
                <span className="text-gz-gold italic font-medium mr-1.5">§</span>Pasantías activas
              </h2>
              <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
                {estudio.pasantias.length} publicaciones
              </span>
            </div>
            <div
              className="grid gap-0 border border-gz-rule bg-white"
              style={{
                gridTemplateColumns: `repeat(${Math.min(estudio.pasantias.length, 3)}, minmax(0, 1fr))`,
              }}
            >
              {estudio.pasantias.map((p) => {
                const cerrada = isDeadlinePassed(p.fechaLimite);
                const deadline = deadlineLabel(p.fechaLimite);
                return (
                  <article
                    key={p.id}
                    className="relative p-5 border-r last:border-r-0 border-gz-rule transition hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]"
                  >
                    <Link
                      href={`/dashboard/sala/pasantias/oferta/${p.id}`}
                      className="absolute inset-0 z-[1] text-[0]"
                    >
                      Ver oferta
                    </Link>
                    <div className="flex justify-between items-baseline mb-2 font-ibm-mono text-[9.5px] tracking-[1.4px] uppercase text-gz-ink-mid">
                      <span>{areaLabel(p.areaPractica)}</span>
                      <span
                        className={
                          p.remuneracion === "no_pagada"
                            ? "text-gz-sage italic"
                            : "text-gz-gold"
                        }
                      >
                        {remuneracionLabel(p.remuneracion, p.montoRemu)}
                      </span>
                    </div>
                    <h3 className="font-cormorant font-semibold text-[20px] leading-[1.18] text-gz-ink m-0">
                      {p.titulo}
                    </h3>
                    <div className="mt-2.5 text-[12px] text-gz-ink-light">
                      {formatoLabel(p.formato)} · {jornadaLabel(p.jornada)}
                      {deadline && (
                        <span
                          className={`block mt-1 font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase ${
                            cerrada ? "text-gz-ink-light line-through" : "text-gz-ink-mid"
                          }`}
                        >
                          {deadline}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="py-10 border-b border-gz-rule text-center">
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid">
              Este estudio no tiene pasantías activas en este momento.
            </p>
          </section>
        )}

        {/* Equipo */}
        {socios.length > 0 && (
          <section className="py-10 pb-16">
            <h2 className="font-cormorant font-semibold text-[26px] tracking-[-0.3px] text-gz-ink m-0 mb-5">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>Equipo destacado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gz-rule bg-white">
              {socios.slice(0, 6).map((m, i) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-4 p-5 border-gz-rule ${
                    i % 2 === 0 ? "md:border-r" : ""
                  } ${i < socios.length - 1 && i < 5 ? "border-b" : ""}`}
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-gz-cream font-ibm-mono text-[14px] font-semibold shrink-0"
                    style={{ background: "var(--gz-ink)" }}
                  >
                    {m.user.firstName[0]}
                    {m.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-cormorant font-semibold text-[18px] text-gz-ink leading-tight">
                      {m.user.firstName} {m.user.lastName}
                    </div>
                    <div className="mt-0.5 font-ibm-mono text-[10px] tracking-[1.2px] uppercase text-gz-gold">
                      {rolLabel(m.rol)}
                    </div>
                    {m.user.cargoActual && (
                      <div className="mt-0.5 font-archivo text-[12px] text-gz-ink-mid">
                        {m.user.cargoActual}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
