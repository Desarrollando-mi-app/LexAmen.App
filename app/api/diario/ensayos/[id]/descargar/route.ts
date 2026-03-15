import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Descargar Ensayo (solo Premium) ───────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el usuario es Premium
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });

  if (!user || user.plan === "FREE") {
    return NextResponse.json(
      {
        error:
          "La descarga de ensayos es exclusiva para usuarios Premium",
      },
      { status: 403 }
    );
  }

  // Buscar el ensayo
  const ensayo = await prisma.ensayo.findUnique({
    where: { id, isActive: true },
    select: {
      id: true,
      userId: true,
      archivoFormato: true,
      archivoUrl: true,
    },
  });

  if (!ensayo) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  // Incrementar downloadsCount
  await prisma.ensayo.update({
    where: { id },
    data: { downloadsCount: { increment: 1 } },
  });

  // Generar signed URL (1 hora)
  const storagePath = `ensayos/${ensayo.userId}/${ensayo.id}.${ensayo.archivoFormato}`;

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from("ensayos")
    .createSignedUrl(storagePath, 3600);

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { error: "Error al generar el enlace de descarga" },
      { status: 500 }
    );
  }

  return NextResponse.json({ downloadUrl: signedUrlData.signedUrl });
}
