import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { firstName, lastName, bio, universidad, sede, universityYear, cvAvailable } = body;

  // Build update data (only provided fields)
  const data: Record<string, unknown> = {};
  if (typeof firstName === "string" && firstName.trim()) data.firstName = firstName.trim();
  if (typeof lastName === "string" && lastName.trim()) data.lastName = lastName.trim();
  if (typeof bio === "string") data.bio = bio.slice(0, 280);
  if (bio === null) data.bio = null;
  if (typeof universidad === "string" || universidad === null) data.universidad = universidad;
  if (typeof sede === "string" || sede === null) data.sede = sede;
  if (typeof universityYear === "number" && universityYear >= 1 && universityYear <= 7) {
    data.universityYear = universityYear;
  }
  if (typeof cvAvailable === "boolean") data.cvAvailable = cvAvailable;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: authUser.id },
    data,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      bio: true,
      universidad: true,
      sede: true,
      universityYear: true,
      cvAvailable: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ user });
}
