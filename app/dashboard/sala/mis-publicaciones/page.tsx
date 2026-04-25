import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { MisPublicacionesClient } from "./mis-publicaciones-client";
import type {
  Publication,
  PublicationKind,
} from "@/lib/mis-publicaciones-helpers";
import { areaLabel as pasantiaArea } from "@/lib/pasantias-helpers";
import { getAreaLabel } from "@/lib/sala-constants";

export const dynamic = "force-dynamic";

/**
 * Vista unificada V4 "Mis publicaciones" — combina ayudantías,
 * pasantías y ofertas del usuario en un solo flujo editorial.
 * Cada item lleva acciones inline (ver / ocultar / editar / eliminar)
 * que postean a los endpoints REST existentes.
 */
export default async function MisPublicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const params = await searchParams;
  const initialKind: PublicationKind | "TODAS" =
    params.kind === "ayudantia" ||
    params.kind === "pasantia" ||
    params.kind === "oferta"
      ? params.kind
      : "TODAS";

  const [ayudantias, pasantias, ofertas] = await Promise.all([
    prisma.ayudantia.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        materia: true,
        titulo: true,
        universidad: true,
        format: true,
        priceType: true,
        isActive: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.pasantia.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        type: true,
        titulo: true,
        empresa: true,
        areaPractica: true,
        ciudad: true,
        formato: true,
        isActive: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.ofertaTrabajo.findMany({
      where: { userId: authUser.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        cargo: true,
        empresa: true,
        areaPractica: true,
        ciudad: true,
        formato: true,
        tipoContrato: true,
        isActive: true,
        isHidden: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const publications: Publication[] = [
    ...ayudantias.map<Publication>((a) => {
      const subkind = a.type === "BUSCO" ? "busco" : "ofrezco";
      return {
        id: a.id,
        kind: "ayudantia",
        subkind,
        title:
          a.titulo ||
          (subkind === "busco"
            ? `Busca tutor de ${a.materia}`
            : `Ayudantía de ${a.materia}`),
        eyebrow: a.materia,
        meta: [a.universidad, formatLabelAyudantia(a.format), priceLabel(a.priceType)]
          .filter(Boolean)
          .join(" · "),
        isActive: a.isActive,
        isHidden: a.isHidden,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        detailHref:
          subkind === "busco"
            ? `/dashboard/sala/ayudantias/solicitud/${a.id}`
            : `/dashboard/sala/ayudantias/tutor/${a.id}`,
        editHref: `/dashboard/sala/ayudantias/gestion?edit=${a.id}`,
        apiHref: `/api/sala/ayudantias/${a.id}`,
      };
    }),
    ...pasantias.map<Publication>((p) => {
      const subkind = p.type === "busco" ? "busco" : "ofrezco";
      return {
        id: p.id,
        kind: "pasantia",
        subkind,
        title:
          p.titulo ||
          (subkind === "busco"
            ? `Busca pasantía en ${pasantiaArea(p.areaPractica)}`
            : p.empresa),
        eyebrow: pasantiaArea(p.areaPractica),
        meta: [p.empresa, p.ciudad, formatLabelPasantia(p.formato)]
          .filter(Boolean)
          .join(" · "),
        isActive: p.isActive,
        isHidden: p.isHidden,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        detailHref:
          subkind === "busco"
            ? `/dashboard/sala/pasantias/solicitud/${p.id}`
            : `/dashboard/sala/pasantias/oferta/${p.id}`,
        editHref: `/dashboard/sala/pasantias/gestion?edit=${p.id}`,
        apiHref: `/api/sala/pasantias/${p.id}`,
      };
    }),
    ...ofertas.map<Publication>((o) => ({
      id: o.id,
      kind: "oferta",
      subkind: null,
      title: o.cargo,
      eyebrow: getAreaLabel(o.areaPractica),
      meta: [o.empresa, o.ciudad, formatLabelOferta(o.formato), contratoLabel(o.tipoContrato)]
        .filter(Boolean)
        .join(" · "),
      isActive: o.isActive,
      isHidden: o.isHidden,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      detailHref: `/dashboard/sala/ofertas/${o.id}`,
      editHref: `/dashboard/sala/ofertas/gestion?edit=${o.id}`,
      apiHref: `/api/sala/ofertas/${o.id}`,
    })),
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <MisPublicacionesClient
      publications={publications}
      initialKind={initialKind}
    />
  );
}

function formatLabelAyudantia(f: string): string {
  if (f === "ONLINE") return "Online";
  if (f === "PRESENCIAL") return "Presencial";
  if (f === "AMBOS") return "Online o presencial";
  return f;
}

function priceLabel(p: string): string {
  if (p === "GRATUITO") return "Gratuito";
  if (p === "PAGADO") return "Con honorarios";
  return p;
}

function formatLabelPasantia(f: string): string {
  if (f === "presencial") return "Presencial";
  if (f === "remoto") return "Remoto";
  if (f === "hibrido") return "Híbrido";
  return f;
}

function formatLabelOferta(f: string): string {
  return formatLabelPasantia(f);
}

function contratoLabel(c: string): string {
  if (c === "indefinido") return "Indefinido";
  if (c === "plazo_fijo") return "Plazo fijo";
  if (c === "honorarios") return "Honorarios";
  if (c === "part_time") return "Part-time";
  return c;
}
