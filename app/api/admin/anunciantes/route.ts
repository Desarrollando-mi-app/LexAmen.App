import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return authUser.id;
}

export async function GET() {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const anunciantes = await prisma.anunciante.findMany({
    where: { activo: true },
    include: {
      _count: { select: { slides: true } },
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(anunciantes);
}

export async function POST(request: Request) {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { nombre, tipo, contactoNombre, contactoEmail, contactoTelefono, rut } = body;

  if (!nombre || !contactoEmail) {
    return NextResponse.json(
      { error: "Nombre y email de contacto requeridos" },
      { status: 400 }
    );
  }

  // Validar email único
  const existente = await prisma.anunciante.findFirst({
    where: { contactoEmail },
  });
  if (existente) {
    return NextResponse.json(
      { error: "Ya existe un anunciante con ese email" },
      { status: 400 }
    );
  }

  const anunciante = await prisma.anunciante.create({
    data: {
      nombre,
      tipo: tipo || "empresa",
      contactoNombre: contactoNombre || null,
      contactoEmail,
      contactoTelefono: contactoTelefono || null,
      rut: rut || null,
    },
  });

  return NextResponse.json(anunciante, { status: 201 });
}
