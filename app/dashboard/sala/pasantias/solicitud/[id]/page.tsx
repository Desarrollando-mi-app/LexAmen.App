import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { areaLabel, formatoLabel, jornadaLabel } from "@/lib/pasantias-helpers";
import { initials, formatRelative } from "@/lib/ayudantias-v4-helpers";

/**
 * Detalle de una solicitud (type = "busco") — estudiante busca pasantía.
 * CTA principal: "Ofrecer pasantía" (quien lee puede responder con una oferta).
 */
export default async function SolicitudPasantiaPage({
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

  const solicitud = await prisma.pasantia.findFirst({
    where: { id, type: "busco", isActive: true, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          etapaActual: true,
          region: true,
          anioIngreso: true,
          bio: true,
        },
      },
    },
  });
  if (!solicitud) notFound();

  const isOwnPost = solicitud.userId === authUser.id;
  const burgundy = "linear-gradient(135deg, #c2485a, #9a3040 55%, #6b1d2a)";

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link href="/dashboard/sala/pasantias" className="hover:text-gz-gold transition-colors">
          ← Pasantías
        </Link>
      </div>

      <header className="max-w-[960px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Pasantías</span>
        <span>Solicitud de pasantía</span>
      </header>

      <main className="max-w-[960px] mx-auto px-7">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10 py-11 border-b border-gz-rule">
          <div
            className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: burgundy }}
          >
            <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-burgundy/95 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
              Busca pasantía
            </span>
            <div className="relative z-[1] font-cormorant font-bold text-[140px] leading-none tracking-[-4px] text-gz-cream/92">
              {initials(solicitud.user.firstName, solicitud.user.lastName)}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-burgundy mb-2">
              {areaLabel(solicitud.areaPractica)} · {solicitud.ciudad}
            </div>
            <h1 className="font-cormorant font-semibold text-[46px] leading-[1.02] tracking-[-1px] text-gz-ink m-0">
              {solicitud.titulo || `Busca pasantía en ${areaLabel(solicitud.areaPractica)}`}
            </h1>
            <div className="mt-3 w-14 h-px bg-gz-burgundy" />
            <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-mid">
              Publicado por{" "}
              <strong className="not-italic font-semibold text-gz-ink">
                {solicitud.user.firstName} {solicitud.user.lastName}
              </strong>
              {solicitud.user.universidad ? ` · ${solicitud.user.universidad}` : ""}
              {solicitud.user.region ? ` · ${solicitud.user.region}` : ""}
            </p>

            <div className="mt-6 flex gap-2.5 flex-wrap">
              {!isOwnPost ? (
                <>
                  {solicitud.contactoWhatsapp && (
                    <a
                      href={`https://wa.me/${solicitud.contactoWhatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-gz-burgundy text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-ink transition"
                    >
                      Ofrecer por WhatsApp →
                    </a>
                  )}
                  {solicitud.contactoEmail && (
                    <a
                      href={`mailto:${solicitud.contactoEmail}`}
                      className="px-5 py-3 border border-gz-burgundy text-gz-burgundy font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-burgundy hover:text-gz-cream transition"
                    >
                      Ofrecer por email
                    </a>
                  )}
                  {!solicitud.contactoWhatsapp && !solicitud.contactoEmail && (
                    <span className="px-5 py-3 bg-gz-ink-light/20 text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
                      Sin canal de contacto público
                    </span>
                  )}
                </>
              ) : (
                <Link
                  href={`/dashboard/sala/pasantias/gestion?edit=${solicitud.id}`}
                  className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                >
                  Editar publicación
                </Link>
              )}
              <button
                type="button"
                className="px-5 py-3 border border-gz-ink text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-gold hover:text-gz-gold transition"
              >
                Enviar mensaje
              </button>
            </div>
          </div>
        </section>

        {/* Detalle */}
        <section className="py-10 border-b border-gz-rule">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0">
              <span className="text-gz-burgundy italic font-medium mr-1.5">§</span>Detalle de la solicitud
            </h2>
            <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
              {formatRelative(solicitud.createdAt.toISOString())}
            </span>
          </div>

          <div className="border border-gz-rule bg-white p-7">
            <p className="text-[14.5px] leading-[1.65] text-gz-ink-mid [&::first-line]:font-medium [&::first-line]:text-gz-ink m-0 whitespace-pre-wrap">
              {solicitud.descripcion}
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-0 border border-gz-rule">
              <Cell label="Formato" value={formatoLabel(solicitud.formato)} />
              <Cell label="Jornada" value={jornadaLabel(solicitud.jornada)} />
              <Cell
                label="Disponibilidad"
                value={solicitud.duracion || "A convenir"}
              />
            </div>

            {solicitud.requisitos && (
              <div className="mt-5 border-l-[3px] border-gz-burgundy pl-4 py-3 bg-gz-cream/40">
                <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-mid mb-1">
                  Notas adicionales
                </div>
                <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-[1.55] m-0 whitespace-pre-wrap">
                  {solicitud.requisitos}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Autor */}
        <section className="py-10 pb-16">
          <h2 className="font-cormorant font-semibold text-[24px] tracking-[-0.3px] text-gz-ink m-0 mb-4">
            <span className="text-gz-burgundy italic font-medium mr-1.5">§</span>Sobre quien busca
          </h2>
          <div className="border border-gz-rule bg-white p-5 flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-gz-cream font-ibm-mono text-[14px] tracking-[1px] font-semibold shrink-0"
              style={{ background: "var(--gz-burgundy)" }}
            >
              {initials(solicitud.user.firstName, solicitud.user.lastName)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-cormorant font-semibold text-[22px] text-gz-ink leading-tight">
                {solicitud.user.firstName} {solicitud.user.lastName}
              </div>
              <div className="mt-0.5 font-archivo text-[13px] text-gz-ink-mid">
                {solicitud.user.etapaActual
                  ? `${solicitud.user.etapaActual.charAt(0).toUpperCase()}${solicitud.user.etapaActual.slice(1)} de Derecho`
                  : "Estudiante"}
                {solicitud.user.universidad ? ` — ${solicitud.user.universidad}` : ""}
              </div>
              {solicitud.user.bio && (
                <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.5]">
                  {solicitud.user.bio}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3.5 border-r last:border-r-0 border-gz-rule">
      <div className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div className="mt-1 text-[13.5px] text-gz-ink">{value}</div>
    </div>
  );
}
