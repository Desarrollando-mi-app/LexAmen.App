import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  areaLabel,
  formatoLabel,
  jornadaLabel,
  formatDateShort,
} from "@/lib/pasantias-helpers";
import { initials, formatRelative } from "@/lib/ayudantias-v4-helpers";
import {
  etapaGradient,
  etapaLabel,
  parseEspecialidades,
} from "@/lib/networking-helpers";
import { getColegaStatus } from "@/lib/colegas";
import {
  ColegaCtaButton,
  VerPerfilLink,
} from "@/components/sala/colega-cta-button";

/**
 * Detalle de una solicitud (type = "busco") — estudiante busca pasantía.
 *
 * Diseño V4: hero con gradiente por etapa del autor (estudiante=sage,
 * egresado=bronze, abogado=ink), badge burgundy "Busca pasantía" como
 * acento de tipo. CTAs reales: WhatsApp/Email cuando los hay, conectar
 * como colega (con estados), ver perfil. Reseñas no aplican (no hay
 * "postulación a una solicitud" todavía).
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
          avatarUrl: true,
          universidad: true,
          universityYear: true,
          etapaActual: true,
          region: true,
          anioIngreso: true,
          empleoActual: true,
          cargoActual: true,
          bio: true,
          grado: true,
          xp: true,
          especialidades: true,
        },
      },
    },
  });
  if (!solicitud) notFound();

  const isOwnPost = solicitud.userId === authUser.id;
  const gradient = etapaGradient(solicitud.user.etapaActual);
  const especialidades = parseEspecialidades(solicitud.user.especialidades);
  const gradoRoman = solicitud.user.grado ? toRoman(solicitud.user.grado) : null;

  // Estado del colega request, sólo si NO es el propio post.
  const colegaInfo = isOwnPost
    ? { status: "none" as const, requestId: null as string | null }
    : await getColegaStatus(authUser.id, solicitud.userId);

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
            style={{ background: gradient }}
          >
            {/* badge tipo */}
            <span className="absolute top-3.5 left-3.5 z-[2] px-2.5 py-[5px] bg-gz-burgundy/95 text-gz-cream rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-medium backdrop-blur-sm">
              Busca pasantía
            </span>

            {/* grado roman, top-right */}
            {gradoRoman && (
              <span className="absolute top-3.5 right-3.5 z-[2] px-2.5 py-[5px] bg-gz-cream/90 text-gz-ink rounded-full font-ibm-mono text-[9px] tracking-[1.3px] uppercase font-semibold">
                Grado {gradoRoman}
              </span>
            )}

            {/* avatar real o iniciales */}
            {solicitud.user.avatarUrl ? (
              <Image
                src={solicitud.user.avatarUrl}
                alt={`${solicitud.user.firstName} ${solicitud.user.lastName}`}
                fill
                sizes="260px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="relative z-[1] font-cormorant font-bold text-[140px] leading-none tracking-[-4px] text-gz-cream/92">
                {initials(solicitud.user.firstName, solicitud.user.lastName)}
              </div>
            )}

            {/* etapa pill, bottom */}
            {solicitud.user.etapaActual && (
              <span className="absolute bottom-3.5 left-3.5 z-[2] font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase px-2.5 py-[5px] rounded-full bg-gz-ink/85 text-gz-cream backdrop-blur-sm">
                {etapaLabel(solicitud.user.etapaActual)}
              </span>
            )}
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
              <Link
                href={`/dashboard/perfil/${solicitud.user.id}`}
                className="not-italic font-semibold text-gz-ink hover:text-gz-gold transition-colors"
              >
                {solicitud.user.firstName} {solicitud.user.lastName}
              </Link>
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
                    <span className="px-5 py-3 bg-gz-ink-light/15 text-gz-ink-mid font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
                      Sin canal de contacto público
                    </span>
                  )}
                  <ColegaCtaButton
                    targetUserId={solicitud.user.id}
                    initialStatus={colegaInfo.status}
                    initialRequestId={colegaInfo.requestId ?? null}
                    variant="burgundy"
                  />
                  <VerPerfilLink userId={solicitud.user.id} />
                </>
              ) : (
                <>
                  <Link
                    href={`/dashboard/sala/pasantias/gestion?edit=${solicitud.id}`}
                    className="px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
                  >
                    Editar publicación
                  </Link>
                  <span className="px-5 py-3 border border-gz-rule text-gz-ink-light font-ibm-mono text-[11px] tracking-[1.8px] uppercase">
                    Tu publicación
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Detalle */}
        <section className="py-10 border-b border-gz-rule">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0">
              <span className="text-gz-burgundy italic font-medium mr-1.5">§</span>Lo que busca
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

            {(solicitud.fechaInicio || solicitud.fechaLimite) && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-0 border border-gz-rule">
                {solicitud.fechaInicio && (
                  <Cell
                    label="Quiere empezar"
                    value={formatDateShort(solicitud.fechaInicio)}
                  />
                )}
                {solicitud.fechaLimite && (
                  <Cell
                    label="Disponible hasta"
                    value={formatDateShort(solicitud.fechaLimite)}
                  />
                )}
              </div>
            )}

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
              className="relative w-16 h-16 rounded-[4px] flex items-center justify-center text-gz-cream font-cormorant font-bold text-[26px] shrink-0 overflow-hidden"
              style={{ background: gradient }}
            >
              {solicitud.user.avatarUrl ? (
                <Image
                  src={solicitud.user.avatarUrl}
                  alt={`${solicitud.user.firstName} ${solicitud.user.lastName}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                initials(solicitud.user.firstName, solicitud.user.lastName)
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <Link
                  href={`/dashboard/perfil/${solicitud.user.id}`}
                  className="font-cormorant font-semibold text-[22px] text-gz-ink leading-tight hover:text-gz-gold transition-colors"
                >
                  {solicitud.user.firstName} {solicitud.user.lastName}
                </Link>
                {gradoRoman && (
                  <span className="font-ibm-mono text-[10px] tracking-[1.4px] uppercase text-gz-gold">
                    · Grado {gradoRoman}
                  </span>
                )}
              </div>
              <div className="mt-0.5 font-archivo text-[13px] text-gz-ink-mid">
                {summaryFor(solicitud.user)}
              </div>
              {solicitud.user.bio && (
                <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.5]">
                  {solicitud.user.bio}
                </p>
              )}
              {especialidades.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {especialidades.slice(0, 6).map((esp) => (
                    <span
                      key={esp}
                      className="font-ibm-mono text-[10px] tracking-[1.2px] uppercase text-gz-ink-mid px-2.5 py-1 rounded-[3px] border border-gz-rule bg-gz-cream/40"
                    >
                      {esp}
                    </span>
                  ))}
                </div>
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

/** Línea editorial sobre el autor de la solicitud, según etapa. */
function summaryFor(u: {
  etapaActual: string | null;
  universidad: string | null;
  universityYear: number | null;
  cargoActual: string | null;
  empleoActual: string | null;
  region: string | null;
}): string {
  const parts: string[] = [];
  if (u.etapaActual === "abogado") {
    if (u.cargoActual) parts.push(u.cargoActual);
    if (u.empleoActual) parts.push(u.empleoActual);
    if (parts.length === 0 && u.universidad) parts.push(`Egresado de ${u.universidad}`);
  } else if (u.etapaActual === "egresado") {
    parts.push("Egresado");
    if (u.universidad) parts.push(u.universidad);
    if (u.empleoActual) parts.push(u.empleoActual);
  } else {
    if (u.universidad && u.universityYear) {
      parts.push(`${u.universidad} · ${u.universityYear}° año`);
    } else if (u.universidad) {
      parts.push(u.universidad);
    } else {
      parts.push("Estudiante de Derecho");
    }
  }
  if (u.region && !parts.some((p) => p.includes(u.region!))) parts.push(u.region);
  return parts.join(" · ");
}

/** Ints a roman numerals — duplicado mínimo para evitar acoplar componentes. */
function toRoman(num: number): string {
  if (num <= 0) return "";
  const map: Array<[number, string]> = [
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
