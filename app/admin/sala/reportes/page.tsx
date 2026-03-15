import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReportesClient } from "./reportes-client";

export default async function AdminReportesPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({ where: { id: authUser.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) redirect("/dashboard");

  // Get all pending reports with related publications
  const reports = await prisma.salaReporte.findMany({
    where: { reviewStatus: "pendiente" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true } },
      ayudantia: {
        select: {
          id: true, titulo: true, materia: true, isHidden: true, userId: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      pasantia: {
        select: {
          id: true, titulo: true, empresa: true, isHidden: true, userId: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      evento: {
        select: {
          id: true, titulo: true, organizador: true, isHidden: true, userId: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      oferta: {
        select: {
          id: true, cargo: true, empresa: true, isHidden: true, userId: true, createdAt: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  // Group reports by publication
  interface ReportGroup {
    tipo: "ayudantia" | "pasantia" | "evento" | "oferta";
    publicacionId: string;
    titulo: string;
    autorNombre: string;
    isHidden: boolean;
    publicadoEl: string;
    reportes: Array<{
      id: string;
      motivo: string;
      descripcion: string | null;
      reporterName: string;
      createdAt: string;
    }>;
  }

  const groupMap = new Map<string, ReportGroup>();

  for (const r of reports) {
    let tipo: ReportGroup["tipo"];
    let publicacionId: string;
    let titulo: string;
    let autorNombre: string;
    let isHidden: boolean;
    let publicadoEl: string;

    if (r.ayudantia) {
      tipo = "ayudantia";
      publicacionId = r.ayudantia.id;
      titulo = r.ayudantia.titulo || r.ayudantia.materia;
      autorNombre = `${r.ayudantia.user.firstName} ${r.ayudantia.user.lastName}`;
      isHidden = r.ayudantia.isHidden;
      publicadoEl = r.ayudantia.createdAt.toISOString();
    } else if (r.pasantia) {
      tipo = "pasantia";
      publicacionId = r.pasantia.id;
      titulo = r.pasantia.titulo;
      autorNombre = `${r.pasantia.user.firstName} ${r.pasantia.user.lastName}`;
      isHidden = r.pasantia.isHidden;
      publicadoEl = r.pasantia.createdAt.toISOString();
    } else if (r.evento) {
      tipo = "evento";
      publicacionId = r.evento.id;
      titulo = r.evento.titulo;
      autorNombre = `${r.evento.user.firstName} ${r.evento.user.lastName}`;
      isHidden = r.evento.isHidden;
      publicadoEl = r.evento.createdAt.toISOString();
    } else if (r.oferta) {
      tipo = "oferta";
      publicacionId = r.oferta.id;
      titulo = r.oferta.cargo;
      autorNombre = `${r.oferta.user.firstName} ${r.oferta.user.lastName}`;
      isHidden = r.oferta.isHidden;
      publicadoEl = r.oferta.createdAt.toISOString();
    } else {
      continue;
    }

    const key = `${tipo}-${publicacionId}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        tipo,
        publicacionId,
        titulo,
        autorNombre,
        isHidden,
        publicadoEl,
        reportes: [],
      });
    }

    groupMap.get(key)!.reportes.push({
      id: r.id,
      motivo: r.motivo,
      descripcion: r.descripcion,
      reporterName: `${r.user.firstName} ${r.user.lastName}`,
      createdAt: r.createdAt.toISOString(),
    });
  }

  // Sort: hidden first, then by report count desc
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (a.isHidden !== b.isHidden) return a.isHidden ? -1 : 1;
    return b.reportes.length - a.reportes.length;
  });

  return <ReportesClient groups={groups} />;
}
