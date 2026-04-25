import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CATEGORIA_NOTICIAS, getRamaColor, getCategoriaColor } from "@/lib/derecho-colors";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Lectura — Studio Iuris",
};

const MONTHS_ES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFechaLarga(d: Date) {
  return `${d.getDate()} de ${MONTHS_ES_LARGO[d.getMonth()]} de ${d.getFullYear()}`;
}

function getCategoriaLabel(cat: string | null): string {
  const found = CATEGORIA_NOTICIAS.find((c) => c.value === cat);
  return found ? found.label : cat ?? "";
}

function categoriaKicker(cat: string | null): string {
  switch (cat) {
    case "editorial":
      return "Editorial";
    case "carta_director":
      return "Carta al Director";
    case "columna_opinion":
      return "Columna de Opinión";
    default:
      return getCategoriaLabel(cat) || "Lectura";
  }
}

function categoriaGlyph(cat: string | null): string {
  switch (cat) {
    case "editorial":
      return "✠";
    case "carta_director":
      return "✉";
    case "columna_opinion":
      return "❡";
    default:
      return "✶";
  }
}

export default async function NoticiaInternaPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const noticia = await prisma.noticiaJuridica.findUnique({
    where: { id },
  });

  if (!noticia || noticia.estado !== "aprobada") notFound();

  const ramaColor = getRamaColor(noticia.rama);
  const catColor = getCategoriaColor(noticia.categoria);
  const accent = catColor?.accent ?? ramaColor.accent ?? "var(--gz-gold)";

  // Extraer autor del fuenteNombre. Formato submit: "Nombre Apellido — Studio Iuris".
  const autor = noticia.fuente === "STUDIO_IURIS"
    ? noticia.fuenteNombre.replace(/ — Studio Iuris$/, "").trim()
    : noticia.fuenteNombre;

  const fecha = noticia.fechaAprobacion ?? noticia.createdAt;

  // Cuerpo: si hay `contenido`, úsalo; si no, fallback a `resumen` (legacy).
  const cuerpo = (noticia.contenido ?? noticia.resumen ?? "").trim();
  const parrafos = cuerpo
    .split(/\n{2,}|\r\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <article className="mx-auto max-w-[720px] px-5 sm:px-6 py-10">
        {/* Migas */}
        <div className="mb-6 flex items-center gap-2 font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
          <Link
            href="/dashboard/noticias"
            className="hover:text-gz-gold transition-colors cursor-pointer"
          >
            ← Noticias
          </Link>
          <span>/</span>
          <span style={{ color: accent }}>{categoriaKicker(noticia.categoria)}</span>
        </div>

        {/* Cabecera editorial */}
        <header className="mb-8 border-b border-gz-rule pb-6">
          <p
            className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] mb-3 flex items-center gap-2"
            style={{ color: accent }}
          >
            <span className="font-cormorant text-[14px] leading-none">
              {categoriaGlyph(noticia.categoria)}
            </span>
            {categoriaKicker(noticia.categoria)}
            {noticia.pinnedTop && (
              <span className="ml-1 inline-flex items-center rounded-full bg-gz-ink/[0.08] px-2 py-0.5 font-ibm-mono text-[8px] font-semibold tracking-[1px] text-gz-ink">
                FIJA
              </span>
            )}
            {noticia.pinnedUntil && noticia.pinnedUntil > new Date() && (
              <span className="ml-1 inline-flex items-center rounded-full bg-gz-gold/15 px-2 py-0.5 font-ibm-mono text-[8px] font-semibold tracking-[1px] text-gz-gold">
                EN PORTADA
              </span>
            )}
          </p>
          <h1 className="font-cormorant text-[34px] sm:text-[44px] !font-bold text-gz-ink leading-[1.05] tracking-tight">
            {noticia.titulo}
          </h1>
          {noticia.resumen && noticia.resumen !== noticia.titulo && (
            <p className="mt-4 font-cormorant italic text-[18px] leading-relaxed text-gz-ink-mid">
              {noticia.resumen.length > 240
                ? `${noticia.resumen.substring(0, 240)}…`
                : noticia.resumen}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            <span className="text-gz-ink">{autor}</span>
            <span>·</span>
            <span>{formatFechaLarga(fecha)}</span>
            {noticia.rama && (
              <>
                <span>·</span>
                <span style={{ color: ramaColor.accent }}>
                  {ramaColor.label}
                </span>
              </>
            )}
          </div>
        </header>

        {/* Cuerpo */}
        {parrafos.length > 0 ? (
          <div className="space-y-5 font-cormorant text-[19px] sm:text-[20px] leading-[1.65] text-gz-ink">
            {parrafos.map((p, i) => (
              <p
                key={i}
                className={i === 0 ? "first-letter:font-cormorant first-letter:text-[64px] first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:leading-[0.95] first-letter:mt-1" : ""}
                style={i === 0 ? { color: "var(--gz-ink)" } : undefined}
              >
                {p}
              </p>
            ))}
          </div>
        ) : (
          <p className="font-cormorant italic text-[16px] text-gz-ink-light text-center py-12">
            Esta lectura aún no tiene contenido publicado.
          </p>
        )}

        {/* Colofón */}
        <footer className="mt-12 pt-6 border-t border-gz-rule">
          <p className="font-cormorant italic text-[14px] text-gz-ink-light text-center mb-3">
            — Fin de la lectura —
          </p>
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard/noticias"
              className="font-archivo text-[13px] font-semibold text-gz-gold hover:text-gz-burgundy transition-colors cursor-pointer"
            >
              ← Volver a Noticias
            </Link>
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light">
              Studio Iuris · La Gaceta Jurídica
            </p>
          </div>
        </footer>
      </article>
    </main>
  );
}
