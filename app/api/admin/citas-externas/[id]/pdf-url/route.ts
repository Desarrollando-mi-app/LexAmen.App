import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

// ─── GET /api/admin/citas-externas/[id]/pdf-url ─────────────────
//
// Genera una Signed URL de 1h para el PDF de evidencia. Acceso:
//   - Admin (User.isAdmin = true)
//   - Declarante de la cita externa (verifica su propia evidencia)
// El PDF nunca es público — se firma al momento del click.

const BUCKET = "citaciones-externas";
const SIGNED_URL_TTL = 3600; // 1 hora

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const cita = await prisma.citacionExterna.findUnique({
    where: { id },
    select: { declaredById: true, citingPdfUrl: true },
  });

  if (!cita || !cita.citingPdfUrl) {
    return NextResponse.json({ error: "PDF no disponible." }, { status: 404 });
  }

  const isOwner = cita.declaredById === authUser.id;
  let isAdmin = false;
  if (!isOwner) {
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    isAdmin = dbUser?.isAdmin === true;
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(cita.citingPdfUrl, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: "No se pudo generar la URL firmada." },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: data.signedUrl, expiresIn: SIGNED_URL_TTL });
}
