import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { sendNotification } from "@/lib/notifications";
import { XP_PROPUESTA_APROBADA } from "@/lib/expediente-config";

// GET /api/expediente/admin — List unapproved expedientes
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const pendientes = await prisma.expediente.findMany({
      where: { aprobado: false },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ pendientes });
  } catch (error) {
    console.error("[GET /api/expediente/admin]", error);
    return NextResponse.json(
      { error: "Error al obtener pendientes" },
      { status: 500 }
    );
  }
}

// PATCH /api/expediente/admin — Approve or reject
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id || !["aprobar", "rechazar"].includes(action)) {
      return NextResponse.json(
        { error: "id y action (aprobar|rechazar) son obligatorios" },
        { status: 400 }
      );
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id },
      select: { id: true, aprobado: true, propuestaPor: true, titulo: true },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    if (action === "aprobar") {
      await prisma.expediente.update({
        where: { id },
        data: { aprobado: true },
      });

      // Award XP to proposer
      if (expediente.propuestaPor) {
        await awardXp({
          userId: expediente.propuestaPor,
          amount: XP_PROPUESTA_APROBADA,
          category: "publicaciones",
          prisma,
          detalle: "Propuesta de Expediente aprobada",
        });

        await sendNotification({
          type: "NEW_CONTENT",
          title: "Propuesta aprobada",
          body: `Tu propuesta "${expediente.titulo}" fue aprobada y ya está abierta.`,
          targetUserId: expediente.propuestaPor,
        });
      }

      return NextResponse.json({ success: true, action: "aprobado" });
    } else {
      // Rechazar: delete the expediente
      await prisma.expediente.delete({ where: { id } });

      if (expediente.propuestaPor) {
        await sendNotification({
          type: "NEW_CONTENT",
          title: "Propuesta no aprobada",
          body: `Tu propuesta "${expediente.titulo}" no fue aprobada en esta ocasión.`,
          targetUserId: expediente.propuestaPor,
        });
      }

      return NextResponse.json({ success: true, action: "rechazado" });
    }
  } catch (error) {
    console.error("[PATCH /api/expediente/admin]", error);
    return NextResponse.json(
      { error: "Error al procesar solicitud" },
      { status: 500 }
    );
  }
}
