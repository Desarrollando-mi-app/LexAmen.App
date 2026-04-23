import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  initials,
  formatLabel,
  priceLabel,
  formatRelative,
} from "@/lib/ayudantias-v4-helpers";

/**
 * Detalle de una publicación tipo BUSCO — una persona que busca ayudantía.
 * Diferencia clave con el perfil de tutor/a:
 *  - No hay rating, ni sesiones previas, ni "otras publicaciones".
 *  - CTA principal es "Postular como tutor/a" (el lector se ofrece).
 *  - Se muestra información del autor de la solicitud (estudiante).
 */
export default async function SolicitudPage({
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

  const solicitud = await prisma.ayudantia.findFirst({
    where: { id, type: "BUSCO", isActive: true, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          etapaActual: true,
          region: true,
        },
      },
    },
  });
  if (!solicitud) notFound();

  const isOwnPost = solicitud.userId === authUser.id;
  const cream = "linear-gradient(135deg, #c2485a, #9a3040 55%, #6b1d2a)";

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link href="/dashboard/sala/ayudantias" className="hover:text-gz-gold transition-colors">
          ← Ayudantías
        </Link>
      </div>

      <header className="max-w-[960px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Ayudantías</span>
        <span>Solicitud de ayudantía</span>
      </header>

      <main className="max-w-[960px] mx-auto px-7">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-10 py-11 border-b border-gz-rule">
          <div
            className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: cream }}
          >
            <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-burgundy/95 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
              Busca ayudantía
            </span>
            <div
              className="absolute inset-0 pointer-events-none mix-blend-soft-light"
              style={{
                background: "linear-gradient(180deg, rgba(245,240,230,0.15), rgba(245,240,230,0))",
              }}
            />
            <div className="relative z-[1] font-cormorant font-bold text-[140px] leading-none tracking-[-4px] text-gz-cream/92">
              {initials(solicitud.user.firstName, solicitud.user.lastName)}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-burgundy mb-2">
              {solicitud.materia}
            </div>
            <h1 className="font-cormorant font-semibold text-[46px] leading-[1.02] tracking-[-1px] text-gz-ink m-0">
              {solicitud.titulo || `Busca ayudantía de ${solicitud.materia}`}
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

            <div className="mt-6 flex gap-2.5">
              {!isOwnPost ? (
                <button className="px-5 py-3 bg-gz-burgundy text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-ink transition">
                  Postular como tutor/a →
                </button>
              ) : (
                <Link
                  href={`/dashboard/sala/ayudantias/gestion?edit=${solicitud.id}`}
                  className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                >
                  Editar publicación
                </Link>
              )}
              <button className="px-5 py-3 border border-gz-ink text-gz-ink font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:border-gz-gold hover:text-gz-gold transition">
                Enviar mensaje
              </button>
            </div>
          </div>
        </section>

        {/* Detail */}
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
            <p className="text-[14.5px] leading-[1.65] text-gz-ink-mid [&::first-line]:font-medium [&::first-line]:text-gz-ink m-0">
              {solicitud.description}
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-0 border border-gz-rule">
              <Cell label="Formato" value={formatLabel(solicitud.format)} />
              <Cell
                label="Horario"
                value={solicitud.disponibilidad || "A convenir"}
              />
              <Cell
                label="Presupuesto"
                value={priceLabel(solicitud.priceType, solicitud.priceAmount)}
                accent={solicitud.priceType === "GRATUITO" ? "free" : "paid"}
              />
            </div>

            {solicitud.orientadaA && solicitud.orientadaA.length > 0 && (
              <div className="mt-5 border-l-[3px] border-gz-burgundy pl-4 py-3 bg-gz-cream/40 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.55]">
                <strong className="not-italic font-semibold text-gz-ink">Orientada a:</strong>{" "}
                {solicitud.orientadaA.join(" · ")}
              </div>
            )}
          </div>
        </section>

        {/* Author */}
        <section className="py-10 pb-16">
          <h2 className="font-cormorant font-semibold text-[24px] tracking-[-0.3px] text-gz-ink m-0 mb-4">
            <span className="text-gz-burgundy italic font-medium mr-1.5">§</span>Sobre quien busca
          </h2>
          <div className="border border-gz-rule bg-white p-5 flex items-center gap-4">
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
            </div>
          </div>
        </section>
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
  accent?: "free" | "paid";
}) {
  return (
    <div className="p-3.5 border-r last:border-r-0 border-gz-rule">
      <div className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div
        className={`mt-1 text-[13.5px]
          ${accent === "free" ? "text-gz-sage italic font-semibold" : ""}
          ${accent === "paid" ? "text-gz-burgundy font-semibold" : ""}
          ${!accent ? "text-gz-ink" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}
