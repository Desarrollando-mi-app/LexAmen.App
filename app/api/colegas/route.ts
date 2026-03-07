import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getColegas, getPendingRequests, getSentRequests } from "@/lib/colegas";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [colegas, pendingReceived, pendingSent] = await Promise.all([
    getColegas(authUser.id),
    getPendingRequests(authUser.id),
    getSentRequests(authUser.id),
  ]);

  return NextResponse.json({ colegas, pendingReceived, pendingSent });
}
