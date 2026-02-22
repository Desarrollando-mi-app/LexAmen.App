"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type ActionState = {
  error?: string;
  success?: boolean;
};

// ─── REGISTRO ────────────────────────────────────────────────

export async function register(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const acceptTerms = formData.get("acceptTerms") as string;

  // Validaciones
  if (!name || !email || !password || !confirmPassword) {
    return { error: "Todos los campos son obligatorios." };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  if (acceptTerms !== "on") {
    return { error: "Debes aceptar los Términos y la Política de Privacidad." };
  }

  const headersList = await headers();
  const origin = headersList.get("origin") || "http://localhost:3000";

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Crear registro en tabla User de Prisma con el ID de Supabase Auth
  if (data.user) {
    try {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: data.user.email!,
          name,
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
