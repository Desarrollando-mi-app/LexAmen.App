import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const TIPO_LABELS: Record<string, string> = {
  FACULTAD_DERECHO: "Facultad de Derecho",
  ESTUDIO_JURIDICO: "Estudio Jurídico",
  CENTRO_INVESTIGACION: "Centro de Investigación",
  OTRO: "Otro",
};

const VALID_TIPOS = ["FACULTAD_DERECHO", "ESTUDIO_JURIDICO", "CENTRO_INVESTIGACION", "OTRO"];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "contacto@iurisstudio.cl";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombreInstitucion, tipoInstitucion, nombreContacto, emailContacto, telefono, mensaje } =
      body;

    // Validar campos obligatorios
    if (!nombreInstitucion?.trim()) {
      return NextResponse.json(
        { error: "El nombre de la institución es requerido" },
        { status: 400 }
      );
    }
    if (!tipoInstitucion || !VALID_TIPOS.includes(tipoInstitucion)) {
      return NextResponse.json(
        { error: "Tipo de institución inválido" },
        { status: 400 }
      );
    }
    if (!nombreContacto?.trim()) {
      return NextResponse.json(
        { error: "El nombre del contacto es requerido" },
        { status: 400 }
      );
    }
    if (!emailContacto?.trim()) {
      return NextResponse.json(
        { error: "El email de contacto es requerido" },
        { status: 400 }
      );
    }

    // Validar formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailContacto.trim())) {
      return NextResponse.json(
        { error: "El formato del email no es válido" },
        { status: 400 }
      );
    }

    // Crear registro
    const registro = await prisma.registroInteres.create({
      data: {
        nombreInstitucion: nombreInstitucion.trim(),
        tipoInstitucion,
        nombreContacto: nombreContacto.trim(),
        emailContacto: emailContacto.trim(),
        telefono: telefono?.trim() || null,
        mensaje: mensaje?.trim() || null,
      },
    });

    // Enviar emails en background (no bloquear response)
    sendConfirmationEmail(
      emailContacto.trim(),
      nombreContacto.trim(),
      nombreInstitucion.trim()
    ).catch(() => {});

    sendAdminNotificationEmail(
      nombreInstitucion.trim(),
      TIPO_LABELS[tipoInstitucion] ?? tipoInstitucion,
      nombreContacto.trim(),
      emailContacto.trim(),
      telefono?.trim() || null,
      mensaje?.trim() || null
    ).catch(() => {});

    return NextResponse.json({ ok: true, id: registro.id });
  } catch {
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}

// ─── Email de confirmación al contacto ─────────────────

async function sendConfirmationEmail(
  email: string,
  nombre: string,
  institucion: string
) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#F6F1E9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background-color:#12203A;padding:24px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Iuris Studio</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="color:#12203A;font-size:16px;margin:0 0 16px;">Hola ${nombre},</p>
        <h2 style="color:#12203A;font-size:20px;margin:0 0 12px;">Recibimos tu solicitud</h2>
        <p style="color:#12203A;font-size:15px;line-height:1.6;margin:0 0 16px;">
          Gracias por registrar el inter\u00e9s de <strong>${institucion}</strong> en el Plan Institucional de Iuris Studio.
        </p>
        <p style="color:#12203A;font-size:15px;line-height:1.6;margin:0 0 24px;">
          Nuestro equipo se pondr\u00e1 en contacto contigo pronto para conversar sobre las posibilidades de colaboraci\u00f3n.
        </p>
        <div style="background-color:#F6F1E9;border-radius:12px;padding:20px;margin:0 0 24px;">
          <p style="color:#9A7230;font-size:13px;font-weight:600;margin:0 0 4px;">PLAN INSTITUCIONAL</p>
          <p style="color:#12203A;font-size:14px;margin:0;line-height:1.5;">
            Perfil institucional verificado \u00b7 Acceso premium para miembros \u00b7 Panel de m\u00e9tricas \u00b7 Soporte prioritario
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #D4C9B4;text-align:center;">
        <p style="color:#12203A;opacity:0.5;font-size:12px;margin:0;">
          Iuris Studio \u00b7 Plataforma de estudio jur\u00eddico
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from: "Iuris Studio <noreply@lexamen.cl>",
    to: email,
    subject: "Recibimos tu solicitud \u2014 Iuris Studio",
    html,
  });
}

// ─── Email de notificación al admin ────────────────────

async function sendAdminNotificationEmail(
  institucion: string,
  tipo: string,
  nombre: string,
  email: string,
  telefono: string | null,
  mensaje: string | null
) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#F6F1E9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;">
    <tr>
      <td style="background-color:#12203A;padding:24px 32px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Iuris Studio \u2014 Admin</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <h2 style="color:#12203A;font-size:20px;margin:0 0 16px;">Nuevo inter\u00e9s institucional</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;width:130px;">Instituci\u00f3n</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;">${institucion}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;">Tipo</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;">${tipo}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;">Contacto</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;">${nombre}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;">Email</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;"><a href="mailto:${email}" style="color:#9A7230;">${email}</a></td>
          </tr>
          ${telefono ? `<tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;">Tel\u00e9fono</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;">${telefono}</td>
          </tr>` : ""}
          ${mensaje ? `<tr>
            <td style="padding:8px 0;color:#9A7230;font-size:13px;font-weight:600;">Mensaje</td>
            <td style="padding:8px 0;color:#12203A;font-size:14px;">${mensaje}</td>
          </tr>` : ""}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 32px;border-top:1px solid #D4C9B4;text-align:center;">
        <p style="color:#12203A;opacity:0.5;font-size:12px;margin:0;">
          Notificaci\u00f3n autom\u00e1tica \u2014 Iuris Studio
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await getResend().emails.send({
    from: "Iuris Studio <noreply@lexamen.cl>",
    to: ADMIN_EMAIL,
    subject: `Nuevo inter\u00e9s institucional: ${institucion}`,
    html,
  });
}
