import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { confirmation } = await request.json();

  if (confirmation !== "ELIMINAR MI CUENTA") {
    return NextResponse.json(
      { error: "Texto de confirmación incorrecto" },
      { status: 400 }
    );
  }

  // Soft delete: update user data
  await prisma.user.update({
    where: { id: authUser.id },
    data: {
      deletedAt: new Date(),
      email: `deleted_${authUser.id}@deleted.com`,
      firstName: "Cuenta",
      lastName: "Eliminada",
      bio: null,
      avatarUrl: null,
    },
  });

  // Delete from Supabase Auth using service role
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await serviceSupabase.auth.admin.deleteUser(authUser.id);

  return NextResponse.json({ success: true });
}
