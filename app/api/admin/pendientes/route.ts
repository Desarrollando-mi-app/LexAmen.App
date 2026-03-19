import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [noticiasPendientes, propuestasExpediente, debatesPorAvanzar] =
    await Promise.all([
      prisma.noticiaJuridica.count({ where: { estado: "pendiente" } }),
      prisma.expediente.count({ where: { aprobado: false } }),
      prisma.debateJuridico.count({
        where: { estado: { in: ["buscando_oponente", "argumentando"] } },
      }),
    ]);

  return NextResponse.json({
    noticiasPendientes,
    propuestasExpediente,
    debatesPorAvanzar,
  });
}
