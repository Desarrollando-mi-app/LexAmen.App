// ─── Auto-hide + admin notification for La Sala reports ──

import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "contacto@iurisstudio.cl";

type ReportTarget =
  | { ayudantiaId: string }
  | { pasantiaId: string }
  | { eventoId: string }
  | { ofertaId: string }
  | { analisisId: string }
  | { ensayoId: string };

export async function checkAndAutoHide(
  target: ReportTarget
): Promise<{ hidden: boolean; reportCount: number }> {
  // Build the where clause
  const where: Record<string, string> = {};
  let tipoLabel = "";
  let targetId = "";

  if ("ayudantiaId" in target) {
    where.ayudantiaId = target.ayudantiaId;
    tipoLabel = "Ayudantía";
    targetId = target.ayudantiaId;
  } else if ("pasantiaId" in target) {
    where.pasantiaId = target.pasantiaId;
    tipoLabel = "Pasantía";
    targetId = target.pasantiaId;
  } else if ("eventoId" in target) {
    where.eventoId = target.eventoId;
    tipoLabel = "Evento";
    targetId = target.eventoId;
  } else if ("ofertaId" in target) {
    where.ofertaId = target.ofertaId;
    tipoLabel = "Oferta de Trabajo";
    targetId = target.ofertaId;
  } else if ("analisisId" in target) {
    where.analisisId = target.analisisId;
    tipoLabel = "Análisis de Sentencia";
    targetId = target.analisisId;
  } else if ("ensayoId" in target) {
    where.ensayoId = target.ensayoId;
    tipoLabel = "Ensayo";
    targetId = target.ensayoId;
  }

  // Count distinct reporters
  const reportCount = await prisma.salaReporte.count({ where });

  if (reportCount < 3) {
    return { hidden: false, reportCount };
  }

  // Auto-hide the publication
  let titulo = "";
  let autorNombre = "";

  if ("ayudantiaId" in target) {
    const item = await prisma.ayudantia.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.titulo || item.materia;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  } else if ("pasantiaId" in target) {
    const item = await prisma.pasantia.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.titulo;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  } else if ("eventoId" in target) {
    const item = await prisma.eventoAcademico.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.titulo;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  } else if ("ofertaId" in target) {
    const item = await prisma.ofertaTrabajo.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.cargo;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  } else if ("analisisId" in target) {
    const item = await prisma.analisisSentencia.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.titulo;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  } else if ("ensayoId" in target) {
    const item = await prisma.ensayo.update({
      where: { id: targetId },
      data: { isHidden: true },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    titulo = item.titulo;
    autorNombre = `${item.user.firstName} ${item.user.lastName}`;
  }

  // Get report motives summary
  const allReports = await prisma.salaReporte.findMany({
    where,
    select: { motivo: true },
  });
  const motivoCounts: Record<string, number> = {};
  for (const r of allReports) {
    motivoCounts[r.motivo] = (motivoCounts[r.motivo] || 0) + 1;
  }
  const motivosList = Object.entries(motivoCounts)
    .map(([m, c]) => `• ${m} (${c})`)
    .join("<br/>");

  // Send admin email
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Studio Iuris <noreply@lexamen.cl>",
      to: ADMIN_EMAIL,
      subject: `[Studio Iuris] Publicación auto-ocultada — ${tipoLabel}: ${titulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #12203A;">Publicación auto-ocultada</h2>
          <p>La publicación de tipo <strong>${tipoLabel}</strong> ha sido ocultada automáticamente
             tras recibir <strong>${reportCount} reportes</strong> de usuarios distintos.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Título</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${titulo}</strong></td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Autor</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">${autorNombre}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">ID</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">${targetId}</td></tr>
          </table>
          <p><strong>Motivos reportados:</strong></p>
          <p>${motivosList}</p>
          <p style="margin-top: 24px; color: #666;">Acción requerida: revisar en el panel de administración.</p>
        </div>
      `,
    });
  } catch {
    // Silent fail — admin will see it in dashboard
  }

  return { hidden: true, reportCount };
}
