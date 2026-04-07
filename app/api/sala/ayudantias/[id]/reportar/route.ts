import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { EMAIL_FROM } from "@/lib/resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "contacto@iurisstudio.cl";

const MOTIVOS_VALIDOS = [
  "spam",
  "informacion_falsa",
  "contenido_inapropiado",
  "oferta_sospechosa",
  "otro",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { motivo, descripcion } = body;

  if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo no válido" }, { status: 400 });
  }

  // Find the ayudantia
  const ayudantia = await prisma.ayudantia.findUnique({
    where: { id },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  if (!ayudantia) {
    return NextResponse.json({ error: "Ayudantía no encontrada" }, { status: 404 });
  }

  if (ayudantia.userId === authUser.id) {
    return NextResponse.json({ error: "No puedes reportar tu propia publicación" }, { status: 400 });
  }

  // Check if already reported by this user
  const existingReport = await prisma.salaReporte.findFirst({
    where: { userId: authUser.id, ayudantiaId: id },
  });
  if (existingReport) {
    return NextResponse.json({ error: "Ya reportaste esta publicación" }, { status: 400 });
  }

  // Create report
  const reporte = await prisma.salaReporte.create({
    data: {
      userId: authUser.id,
      ayudantiaId: id,
      motivo,
      descripcion: descripcion?.trim() || null,
    },
  });

  // Check if should auto-hide (3+ reports from distinct users)
  const reportCount = await prisma.salaReporte.count({
    where: { ayudantiaId: id },
  });

  let hidden = false;
  if (reportCount >= 3) {
    await prisma.ayudantia.update({
      where: { id },
      data: { isHidden: true },
    });
    hidden = true;

    // Get all report motives for the admin email
    const allReports = await prisma.salaReporte.findMany({
      where: { ayudantiaId: id },
      select: { motivo: true },
    });
    const motivos = allReports.map((r) => r.motivo).join(", ");

    // Send email to admin
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: EMAIL_FROM,
        to: ADMIN_EMAIL,
        subject: `[Studio Iuris] Publicación auto-ocultada — Ayudantía`,
        html: `
          <h2>Publicación auto-ocultada</h2>
          <p>La ayudantía de <strong>${ayudantia.user.firstName} ${ayudantia.user.lastName}</strong> ha sido ocultada automáticamente tras recibir ${reportCount} reportes.</p>
          <p><strong>Descripción:</strong> ${ayudantia.description?.substring(0, 200) ?? "Sin descripción"}</p>
          <p><strong>Motivos reportados:</strong> ${motivos}</p>
          <p><strong>ID:</strong> ${id}</p>
        `,
      });
    } catch {
      // Silent fail — admin will see it in dashboard
    }
  }

  return NextResponse.json({ reporte, hidden });
}
