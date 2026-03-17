import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const sponsors = await prisma.sponsorBanner.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(sponsors);
  } catch (error) {
    console.error("Error listando sponsors:", error);
    return NextResponse.json(
      { error: "Error al listar sponsors" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const body = await request.json();

    if (!body.nombre) {
      return NextResponse.json(
        { error: "nombre es requerido" },
        { status: 400 }
      );
    }

    const sponsor = await prisma.sponsorBanner.create({
      data: {
        nombre: body.nombre,
        titulo: body.titulo,
        descripcion: body.descripcion,
        imagenUrl: body.imagenUrl,
        linkUrl: body.linkUrl,
        posicion: body.posicion,
        activo: body.activo,
        fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : undefined,
        fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
      },
    });

    return NextResponse.json(sponsor, { status: 201 });
  } catch (error) {
    console.error("Error creando sponsor:", error);
    return NextResponse.json(
      { error: "Error al crear sponsor" },
      { status: 500 }
    );
  }
}
