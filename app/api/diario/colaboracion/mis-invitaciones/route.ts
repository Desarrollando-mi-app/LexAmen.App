import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const invitaciones = await prisma.colaboracionInvitacion.findMany({
    where: {
      invitadoId: authUser.id,
      estado: "pendiente",
    },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with publication titles and inviter info
  const enriched = await Promise.all(
    invitaciones.map(async (inv) => {
      const inviter = await prisma.user.findUnique({
        where: { id: inv.invitadoPor },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      });

      let titulo = "";
      if (inv.publicacionTipo === "analisis") {
        const pub = await prisma.analisisSentencia.findUnique({
          where: { id: inv.publicacionId },
          select: { titulo: true },
        });
        titulo = pub?.titulo ?? "";
      } else {
        const pub = await prisma.ensayo.findUnique({
          where: { id: inv.publicacionId },
          select: { titulo: true },
        });
        titulo = pub?.titulo ?? "";
      }

      return {
        id: inv.id,
        publicacionId: inv.publicacionId,
        publicacionTipo: inv.publicacionTipo,
        estado: inv.estado,
        createdAt: inv.createdAt,
        titulo,
        inviter,
      };
    })
  );

  return NextResponse.json({ invitaciones: enriched });
}
