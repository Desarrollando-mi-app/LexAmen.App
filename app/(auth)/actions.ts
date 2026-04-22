"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { validatePassword, PASSWORD_ERROR_MESSAGE } from "@/lib/password-validation";
import { validateRut, normalizeRut } from "@/lib/rut";

export type ActionState = {
  error?: string;
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

  // Crear registro en tabla User de Prisma con el ID de Supabase Auth
  if (data.user) {
    try {
      await prisma.user.create({
        data: {
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
        },
      });
    } catch (prismaError) {
      // Si falla Prisma, el usuario auth ya existe.
      // El dashboard hará upsert como fallback.
      console.error("Error creando usuario en Prisma:", prismaError);
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
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/dashboard");
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
