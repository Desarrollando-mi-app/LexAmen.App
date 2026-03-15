import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: authUser.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pendiente";

  // Get all reports grouped by publication
  const reports = await prisma.salaReporte.findMany({
    where: { reviewStatus: status },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true } },
      ayudantia: { select: { id: true, titulo: true, materia: true, isHidden: true, userId: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } },
      pasantia: { select: { id: true, titulo: true, empresa: true, isHidden: true, userId: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } },
      evento: { select: { id: true, titulo: true, organizador: true, isHidden: true, userId: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } },
      oferta: { select: { id: true, cargo: true, empresa: true, isHidden: true, userId: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } },
    },
  });

  return NextResponse.json(reports);
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: authUser.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { reportIds, action, tipo, publicacionId } = body as {
    reportIds: string[];
    action: "restaurar" | "eliminar" | "descartar_reportes";
    tipo: "ayudantia" | "pasantia" | "evento" | "oferta";
    publicacionId: string;
  };

  if (!action || !tipo || !publicacionId) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  if (action === "restaurar") {
    // Restore publication (unhide)
    if (tipo === "ayudantia") {
      await prisma.ayudantia.update({ where: { id: publicacionId }, data: { isHidden: false } });
    } else if (tipo === "pasantia") {
      await prisma.pasantia.update({ where: { id: publicacionId }, data: { isHidden: false } });
    } else if (tipo === "evento") {
      await prisma.eventoAcademico.update({ where: { id: publicacionId }, data: { isHidden: false } });
    } else if (tipo === "oferta") {
      await prisma.ofertaTrabajo.update({ where: { id: publicacionId }, data: { isHidden: false } });
    }
    // Mark all reports as dismissed
    await prisma.salaReporte.updateMany({
      where: { id: { in: reportIds } },
      data: { reviewStatus: "descartado", reviewedAt: new Date(), reviewedBy: authUser.id },
    });
  } else if (action === "eliminar") {
    // Get publication info for notification before deleting
    let titulo = "";
    let authorId = "";

    if (tipo === "ayudantia") {
      const item = await prisma.ayudantia.findUnique({ where: { id: publicacionId }, select: { titulo: true, materia: true, userId: true } });
      titulo = item?.titulo || item?.materia || "Publicación";
      authorId = item?.userId || "";
      await prisma.ayudantia.update({ where: { id: publicacionId }, data: { isActive: false, isHidden: true } });
    } else if (tipo === "pasantia") {
      const item = await prisma.pasantia.findUnique({ where: { id: publicacionId }, select: { titulo: true, userId: true } });
      titulo = item?.titulo || "Publicación";
      authorId = item?.userId || "";
      await prisma.pasantia.update({ where: { id: publicacionId }, data: { isActive: false, isHidden: true } });
    } else if (tipo === "evento") {
      const item = await prisma.eventoAcademico.findUnique({ where: { id: publicacionId }, select: { titulo: true, userId: true } });
      titulo = item?.titulo || "Publicación";
      authorId = item?.userId || "";
      await prisma.eventoAcademico.update({ where: { id: publicacionId }, data: { isActive: false, isHidden: true } });
    } else if (tipo === "oferta") {
      const item = await prisma.ofertaTrabajo.findUnique({ where: { id: publicacionId }, select: { cargo: true, userId: true } });
      titulo = item?.cargo || "Publicación";
      authorId = item?.userId || "";
      await prisma.ofertaTrabajo.update({ where: { id: publicacionId }, data: { isActive: false, isHidden: true } });
    }

    // Mark reports as actioned
    await prisma.salaReporte.updateMany({
      where: { id: { in: reportIds } },
      data: { reviewStatus: "accion_tomada", reviewedAt: new Date(), reviewedBy: authUser.id },
    });

    // Notify author
    if (authorId) {
      try {
        await sendNotification({
          type: "SYSTEM_INDIVIDUAL",
          title: "Publicación eliminada",
          body: `Tu publicación "${titulo}" fue eliminada por violar las normas de la comunidad.`,
          targetUserId: authorId,
        });
      } catch { /* silent */ }
    }
  } else if (action === "descartar_reportes") {
    await prisma.salaReporte.updateMany({
      where: { id: { in: reportIds } },
      data: { reviewStatus: "descartado", reviewedAt: new Date(), reviewedBy: authUser.id },
    });
  }

  return NextResponse.json({ success: true });
}
