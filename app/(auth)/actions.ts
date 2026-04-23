"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validatePassword, PASSWORD_ERROR_MESSAGE } from "@/lib/password-validation";
import { validateRut, normalizeRut } from "@/lib/rut";

export type ActionState = {
  error?: string;
  errorCode?: string;
  success?: boolean;
};

// ─── REGISTRO ────────────────────────────────────────────────

const ETAPAS_VALIDAS = new Set(["estudiante", "egresado", "abogado", "profesor"]);
const PHONE_REGEX = /^[+0-9\s\-()]{8,20}$/;

/** Calcula edad a partir de fecha de nacimiento. */
function calcularEdad(fechaNac: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

export async function register(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const firstName = (formData.get("firstName") as string || "").trim();
  const lastName = (formData.get("lastName") as string || "").trim();
  const rutRaw = (formData.get("rut") as string || "").trim();
  const dateOfBirthRaw = (formData.get("dateOfBirth") as string || "").trim();
  const phone = (formData.get("phone") as string || "").trim();
  const etapaActual = (formData.get("etapaActual") as string || "").trim();
  const universidad = (formData.get("universidad") as string || "").trim();
  const anioReferencia = (formData.get("anioReferencia") as string || "").trim();
  const region = (formData.get("region") as string || "").trim();
  const email = (formData.get("email") as string || "").trim().toLowerCase();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const acceptTerms = formData.get("acceptTerms") as string;
  const acceptResponsibility = formData.get("acceptResponsibility") as string;

  // ── Validaciones de identidad ──────────────────────────
  if (!firstName || !lastName) {
    return { error: "Nombre y apellido son obligatorios." };
  }

  if (!validateRut(rutRaw)) {
    return { error: "El RUT ingresado no es válido." };
  }
  const rut = normalizeRut(rutRaw);

  if (!dateOfBirthRaw) {
    return { error: "La fecha de nacimiento es obligatoria." };
  }
  const dateOfBirth = new Date(dateOfBirthRaw);
  if (Number.isNaN(dateOfBirth.getTime())) {
    return { error: "Fecha de nacimiento inválida." };
  }
  const age = calcularEdad(dateOfBirth);
  if (age < 15) {
    return { error: "Debes tener al menos 15 años para registrarte." };
  }
  if (age > 100) {
    return { error: "Fecha de nacimiento fuera de rango." };
  }

  if (!phone || !PHONE_REGEX.test(phone)) {
    return { error: "Ingresa un teléfono válido (8–20 dígitos)." };
  }

  // ── Validaciones de situación académica ───────────────
  if (!ETAPAS_VALIDAS.has(etapaActual)) {
    return { error: "Selecciona tu etapa actual." };
  }

  if (!universidad) {
    return { error: "Selecciona tu universidad." };
  }

  const anioRefNum = Number(anioReferencia);
  if (!anioRefNum || anioRefNum < 1950 || anioRefNum > new Date().getFullYear()) {
    return { error: "Selecciona un año válido." };
  }

  // ── Validaciones de acceso ────────────────────────────
  if (!email || !password || !confirmPassword) {
    return { error: "Completa correo y contraseña." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return { error: PASSWORD_ERROR_MESSAGE };
  }

  if (acceptTerms !== "on") {
    return { error: "Debes aceptar los Términos y la Política de Privacidad." };
  }
  if (acceptResponsibility !== "on") {
    return {
      error:
        "Debes declarar veracidad y asumir responsabilidad sobre tus publicaciones.",
    };
  }

  // ── Chequeo de RUT duplicado (identidad única) ────────
  try {
    const existingRut = await prisma.user.findUnique({ where: { rut } });
    if (existingRut) {
      return {
        error: "Este RUT ya está registrado en Studio IURIS.",
      };
    }
  } catch (err) {
    // No bloquear registro si la consulta falla
    console.error("Error chequeando RUT existente:", err);
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: `${firstName} ${lastName}` },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Mapear año de referencia al campo correcto según la etapa
  const anioIngreso =
    etapaActual === "estudiante" || etapaActual === "egresado"
      ? anioRefNum
      : null;
  const anioJura =
    etapaActual === "abogado" || etapaActual === "profesor" ? anioRefNum : null;

  // Crear registro en tabla User de Prisma con el ID de Supabase Auth.
  // Si falla, NO devolvemos success — el usuario quedaría en un estado
  // inconsistente (auth user sí, Prisma user no) y luego no podría usar
  // la app. Mejor bloquear el registro con un mensaje claro.
  if (!data.user) {
    return {
      error:
        "No pudimos completar tu registro. Si ya tienes cuenta, inicia sesión o recupera tu contraseña.",
    };
  }

  const prismaUserData = {
    id: data.user.id,
    email: data.user.email!,
    firstName,
    lastName,
    rut,
    phone,
    dateOfBirth,
    age,
    etapaActual,
    universidad,
    anioIngreso: anioIngreso ?? undefined,
    anioJura: anioJura ?? undefined,
    region: region || null,
    termsAcceptedAt: new Date(),
    termsVersion: "1.0",
  };

  try {
    await prisma.user.create({ data: prismaUserData });
  } catch (prismaError) {
    const code = (prismaError as { code?: string })?.code;
    console.error("[register] Error creando usuario en Prisma:", {
      code,
      userId: data.user.id,
      email: data.user.email,
      err: prismaError,
    });

    // P2002: violación de unicidad (email o RUT ya existen con otro id,
    // típicamente por un registro previo huérfano). Adoptamos el registro
    // existente y lo actualizamos con el id actual de auth + los datos nuevos.
    if (code === "P2002") {
      try {
        await prisma.user.update({
          where: { email: data.user.email! },
          data: prismaUserData,
        });
      } catch (updateError) {
        console.error(
          "[register] Error recuperando usuario huérfano:",
          updateError
        );
        return {
          error:
            "Este correo o RUT ya están registrados. Intenta iniciar sesión o recuperar tu contraseña.",
        };
      }
    } else {
      return {
        error:
          "No pudimos completar tu registro en este momento. Intenta de nuevo en unos minutos; si persiste, escríbenos a soporte.",
      };
    }
  }

  return { success: true };
}

// ─── LOGIN ───────────────────────────────────────────────────

export async function login(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Ingresa tu correo y contraseña." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const code = (error as { code?: string }).code ?? "";
    const msg = error.message?.toLowerCase() ?? "";

    // Email no confirmado — dar indicación específica + código para
    // que la UI pueda mostrar el botón "reenviar correo".
    if (code === "email_not_confirmed" || msg.includes("confirm")) {
      return {
        error:
          "Tu correo aún no está confirmado. Revisa tu bandeja de entrada y la carpeta de spam.",
        errorCode: "email_not_confirmed",
      };
    }

    // Rate limit de Supabase
    if (msg.includes("rate") || msg.includes("too many")) {
      return {
        error:
          "Demasiados intentos en poco tiempo. Espera unos minutos antes de volver a intentar.",
        errorCode: "rate_limited",
      };
    }

    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/dashboard");
}

// ─── REENVIAR CORREO DE CONFIRMACIÓN ─────────────────────────

export async function resendConfirmation(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();

  if (!email) {
    return { error: "Ingresa tu correo electrónico." };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("rate") || msg.includes("too many")) {
      return {
        error:
          "Demasiados correos solicitados para esta cuenta. Espera unos minutos antes de pedir otro.",
      };
    }
    // No revelar si el email existe o no
    return {
      error:
        "No pudimos reenviar el correo en este momento. Intenta de nuevo en unos minutos.",
    };
  }

  return { success: true };
}

// ─── RECUPERAR CONTRASEÑA ────────────────────────────────────

export async function resetPassword(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "Ingresa tu correo electrónico." };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";

  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/dashboard`,
  });

  // Siempre retornamos éxito (no revelar si el email existe)
  return { success: true };
}

// ─── CERRAR SESIÓN ───────────────────────────────────────────

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
