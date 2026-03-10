import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const {
    interrogadorId,
    fuente,
    rama,
    libro,
    titulo,
    apuntesTexto,
    apuntesNombre,
    totalPreguntas = 10,
  } = body;

  // Validar interrogador
  if (!interrogadorId || !INTERROGADORES[interrogadorId]) {
    return NextResponse.json(
      { error: "Interrogador no válido" },
      { status: 400 }
    );
  }

  // Validar fuente
  if (!fuente || !["APUNTES_PROPIOS", "INDICE_MAESTRO"].includes(fuente)) {
    return NextResponse.json({ error: "Fuente no válida" }, { status: 400 });
  }

  if (fuente === "APUNTES_PROPIOS" && !apuntesTexto) {
    return NextResponse.json(
      { error: "Debe proporcionar el texto de sus apuntes" },
      { status: 400 }
    );
  }

  if (fuente === "INDICE_MAESTRO" && !rama) {
    return NextResponse.json(
      { error: "Debe seleccionar al menos una rama" },
      { status: 400 }
    );
  }

  // Validar totalPreguntas
  const total = Math.min(Math.max(Number(totalPreguntas) || 10, 5), 15);

  const sesion = await prisma.simulacroSesion.create({
    data: {
      userId: authUser.id,
      interrogadorId,
      fuente,
      rama: rama || null,
      libro: libro || null,
      titulo: titulo || null,
      apuntesTexto: apuntesTexto || null,
      apuntesNombre: apuntesNombre || null,
      totalPreguntas: total,
    },
  });

  const interrogador = INTERROGADORES[interrogadorId];

  return NextResponse.json({
    sesionId: sesion.id,
    interrogador: {
      id: interrogador.id,
      nombre: interrogador.nombre,
      descripcion: interrogador.descripcion,
      voz: interrogador.voz,
      color: interrogador.color,
      iniciales: interrogador.iniciales,
      placeholder: interrogador.placeholder,
    },
    totalPreguntas: total,
  });
}
