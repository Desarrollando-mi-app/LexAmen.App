import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: "Se requieren ambas contraseñas" },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "La nueva contraseña debe tener al menos 8 caracteres" },
      { status: 400 }
    );
  }

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: authUser.email!,
    password: currentPassword,
  });

  if (signInError) {
    return NextResponse.json(
      { error: "Contraseña actual incorrecta" },
      { status: 400 }
    );
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    return NextResponse.json(
      { error: `Error al actualizar: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
