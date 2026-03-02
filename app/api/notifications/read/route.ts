import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { markAsRead, markAllAsRead } from "@/lib/notifications";

// ─── POST: Marcar como leída (una o todas) ──────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { notificationId?: string; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (body.all) {
    await markAllAsRead(authUser.id);
    return NextResponse.json({ ok: true, markedAll: true });
  }

  if (body.notificationId) {
    await markAsRead(authUser.id, body.notificationId);
    return NextResponse.json({ ok: true, notificationId: body.notificationId });
  }

  return NextResponse.json(
    { error: "Falta notificationId o all:true" },
    { status: 400 }
  );
}
