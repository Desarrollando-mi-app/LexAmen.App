import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaGradient,
  areaLabel,
  formatoLabel,
  contratoLabel,
  remuneracionLabel,
  experienciaLabel,
  empresaInitial,
  postedAgo,
} from "@/lib/ofertas-helpers";

export const metadata = {
  title: "Oferta laboral — Studio Iuris",
};

/**
 * Detalle V4 editorial de una oferta laboral.
 * - Hero con gradiente del área + monogram de la empresa
 * - Cuerpo con descripción y celdas de datos clave
 * - Bloque de requisitos y CTAs según `metodoPostulacion`
 *   (interno vs link externo vs email)
 */
export default async function OfertaDetalle({
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

  const oferta = await prisma.ofertaTrabajo.findFirst({
    where: { id, isActive: true, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          etapaActual: true,
          cargoActual: true,
        },
      },
    },
  });
  if (!oferta) notFound();

  const isOwnPost = oferta.userId === authUser.id;
  const gradient = areaGradient(oferta.areaPractica);
  const initial = empresaInitial(oferta.empresa);

  const metodo = oferta.metodoPostulacion;
  const contacto = oferta.contactoPostulacion ?? null;
  const isExternalLink =
    contacto && /^https?:\/\//i.test(contacto) && metodo !== "email";
  const isEmail = contacto && metodo === "email";

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light">
        <Link
          href="/dashboard/sala/ofertas"
          className="hover:text-gz-gold transition-colors"
        >
          ← Ofertas laborales
        </Link>
      </div>

      <header className="max-w-[1100px] mx-auto mt-3.5 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Ofertas</span>
        <span>Oferta laboral</span>
      </header>

      <main className="max-w-[1100px] mx-auto px-7">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-10 py-11 border-b border-gz-rule">
          <div
            className="relative aspect-square border border-gz-rule flex items-center justify-center overflow-hidden"
            style={{ background: gradient }}
          >
            <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-ink/95 text-gz-cream rounded-[3px] font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium">
              Oferta laboral
            </span>
            {oferta.experienciaReq && (
              <span className="absolute top-3.5 right-3.5 z-[2] px-2.5 py-[5px] bg-gz-cream/95 text-gz-ink rounded-[3px] font-ibm-mono text-[9px] tracking-[1.3px] uppercase">
                {experienciaLabel(oferta.experienciaReq)}
              </span>
            )}
            <div className="relative z-[1] font-cormorant font-bold text-[180px] leading-none tracking-[-4px] text-gz-cream/92">
              {initial}
            </div>
            <span className="absolute bottom-3.5 left-3.5 z-[2] font-ibm-mono text-[10px] tracking-[1.3px] uppercase px-2.5 py-[5px] rounded-[3px] bg-gz-cream/95 text-gz-ink">
              {postedAgo(oferta.createdAt)}
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <div className="font-ibm-mono text-[11px] tracking-[2px] uppercase text-gz-ink-mid mb-2">
              {areaLabel(oferta.areaPractica)} · {oferta.ciudad}
            </div>
            <h1 className="font-cormorant font-semibold text-[46px] leading-[1.02] tracking-[-1px] text-gz-ink m-0">
              {oferta.cargo}
            </h1>
            <div className="mt-3 w-14 h-px bg-gz-gold" />
            <p className="mt-3 font-cormorant italic text-[17px] text-gz-ink-mid">
              Publicado por{" "}
              <strong className="not-italic font-semibold text-gz-ink">
                {oferta.empresa}
              </strong>
              {oferta.user?.cargoActual && ` · ${oferta.user.cargoActual}`}
            </p>

            <div className="mt-6 flex gap-2.5 flex-wrap">
              {!isOwnPost ? (
                <>
                  {isExternalLink && contacto && (
                    <a
                      href={contacto}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                    >
                      Postular →
                    </a>
                  )}
                  {isEmail && contacto && (
                    <a
                      href={`mailto:${contacto}`}
                      className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                    >
                      Postular por email →
                    </a>
                  )}
                  {!isExternalLink && !isEmail && (
                    <span className="px-5 py-3 border border-gz-ink/40 text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
                      Ver método de postulación abajo
                    </span>
                  )}
                </>
              ) : (
                <Link
                  href={`/dashboard/sala/mis-publicaciones?kind=oferta`}
                  className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                >
                  Editar publicación
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Detalle */}
        <section className="py-10 border-b border-gz-rule">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0">
              <span className="text-gz-gold italic font-medium mr-1.5">§</span>
              Detalle del cargo
            </h2>
            <span className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-light">
              {postedAgo(oferta.createdAt)}
            </span>
          </div>

          <div className="border border-gz-rule bg-white p-7">
            <p className="text-[14.5px] leading-[1.65] text-gz-ink-mid [&::first-line]:font-medium [&::first-line]:text-gz-ink m-0 whitespace-pre-wrap">
              {oferta.descripcion}
            </p>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-0 border border-gz-rule">
              <Cell label="Formato" value={formatoLabel(oferta.formato)} />
              <Cell
                label="Contrato"
                value={contratoLabel(oferta.tipoContrato)}
              />
              <Cell
                label="Experiencia"
                value={experienciaLabel(oferta.experienciaReq)}
              />
              <Cell
                label="Remuneración"
                value={remuneracionLabel(oferta.remuneracion)}
                accent={oferta.remuneracion ? "paid" : "muted"}
              />
            </div>

            {oferta.requisitos && (
              <div className="mt-5 border-l-[3px] border-gz-gold pl-4 py-3 bg-gz-cream/40">
                <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-mid mb-1">
                  Requisitos
                </div>
                <p className="font-cormorant italic text-[15px] text-gz-ink-mid leading-[1.55] m-0 whitespace-pre-wrap">
                  {oferta.requisitos}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Cómo postular */}
        <section className="py-10 pb-16">
          <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0 mb-5">
            <span className="text-gz-gold italic font-medium mr-1.5">¶</span>
            Cómo postular
          </h2>

          <div className="border border-gz-rule bg-white p-7 flex flex-col gap-3">
            <div className="font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-mid">
              Método
            </div>
            <p className="font-cormorant italic text-[18px] text-gz-ink m-0">
              {metodoLabel(metodo)}
            </p>

            {contacto && (
              <>
                <div className="mt-3 font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase text-gz-ink-mid">
                  Contacto
                </div>
                {isEmail ? (
                  <a
                    href={`mailto:${contacto}`}
                    className="font-archivo text-[14px] text-gz-burgundy hover:text-gz-gold transition-colors break-all"
                  >
                    {contacto}
                  </a>
                ) : isExternalLink ? (
                  <a
                    href={contacto}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-archivo text-[14px] text-gz-burgundy hover:text-gz-gold transition-colors break-all"
                  >
                    {contacto}
                  </a>
                ) : (
                  <p className="font-archivo text-[14px] text-gz-ink m-0 whitespace-pre-wrap">
                    {contacto}
                  </p>
                )}
              </>
            )}

            <p className="mt-4 font-archivo text-[11.5px] text-gz-ink-light italic leading-[1.55]">
              Studio Iuris no interviene en estos procesos de selección. Si
              detectas algo irregular, repórtalo desde el listado de ofertas.
            </p>
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
  accent?: "paid" | "muted";
}) {
  return (
    <div className="px-4 py-3 border-r border-b border-gz-rule last:border-r-0 [&:nth-last-child(-n+1)]:border-b-0 md:[&:nth-child(4n)]:border-r-0">
      <div className="font-ibm-mono text-[9.5px] tracking-[1.5px] uppercase text-gz-ink-light">
        {label}
      </div>
      <div
        className={`mt-1 font-cormorant text-[18px] leading-tight ${
          accent === "paid"
            ? "text-gz-burgundy font-semibold"
            : accent === "muted"
              ? "text-gz-ink-mid italic"
              : "text-gz-ink"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function metodoLabel(value: string): string {
  switch (value) {
    case "email":
      return "Postulación por email";
    case "link":
    case "external":
    case "url":
      return "Formulario externo";
    case "linkedin":
      return "Vía LinkedIn";
    case "interno":
    case "internal":
      return "Postulación dentro de la plataforma";
    case "whatsapp":
      return "Vía WhatsApp";
    default:
      return value || "—";
  }
}
