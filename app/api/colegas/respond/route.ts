import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { evaluateBadges } from "@/lib/badges";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { requestId: string; action: "accept" | "reject" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { requestId, action } = body;

  if (!requestId || !["accept", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "requestId y action (accept|reject) son requeridos" },
      { status: 400 }
    );
  }

  const colegaRequest = await prisma.colegaRequest.findUnique({
    where: { id: requestId },
    include: {
      sender: { select: { firstName: true } },
    },
  });

  if (!colegaRequest) {
    return NextResponse.json(
      { error: "Solicitud no encontrada" },
      { status: 404 }
    );
  }

  if (colegaRequest.receiverId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el receptor puede responder" },
      { status: 403 }
    );
  }

  if (colegaRequest.status !== "PENDING") {
    return NextResponse.json(
      { error: "La solicitud ya fue respondida" },
      { status: 409 }
    );
  }

  const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED";

  try {
    await prisma.colegaRequest.update({
      where: { id: requestId },
      data: { status: newStatus },
    });
  } catch (err) {
    console.error("[colegas/respond] DB update failed:", err);
    return NextResponse.json(
      { error: "Error al actualizar la solicitud. Intenta de nuevo." },
      { status: 500 }
    );
  }

  // Si se aceptó, notificar al sender (fire-and-forget, errores no bloquean)
  if (action === "accept") {
    try {
      const receiver = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { firstName: true },
      });

      sendNotification({
        type: "COLEGA_ACCEPTED",
        title: "¡Nuevo Colega!",
        body: `${receiver?.firstName ?? "Alguien"} aceptó tu solicitud de colega`,
        targetUserId: colegaRequest.senderId,
        metadata: { requestId },
      }).catch((err) => {
        console.error("[colegas/respond] sendNotification failed:", err);
      });

      // Badge evaluation for both colegas
      evaluateBadges(colegaRequest.senderId, "comunidad").catch((err) => {
        console.error("[colegas/respond] evaluateBadges (sender) failed:", err);
      });
      evaluateBadges(authUser.id, "comunidad").catch((err) => {
        console.error("[colegas/respond] evaluateBadges (receiver) failed:", err);
      });
    } catch (err) {
      console.error("[colegas/respond] post-update side-effects failed:", err);
      // Do not fail the response — the main action (update) succeeded.
    }
  }

  return NextResponse.json({ success: true, status: newStatus });
}
