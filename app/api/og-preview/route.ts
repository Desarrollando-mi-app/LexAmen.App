import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  buildPreviewsForContent,
  serializeLinkPreviews,
} from "@/lib/og-preview";

// POST /api/og-preview
// Body: { obiterId: string }
// Detecta URLs en el content del obiter, construye previews y los
// persiste en obiter.linkPreviews. Devuelve el array de previews.
//
// Idempotente: si ya tiene previews guardadas, las devuelve sin
// rehacer el fetch (a menos que body.force === true).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { obiterId?: string; force?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const obiterId = body.obiterId;
  if (!obiterId) {
    return NextResponse.json({ error: "obiterId requerido" }, { status: 400 });
  }

  const obiter = await prisma.obiterDictum.findUnique({
    where: { id: obiterId },
    select: { id: true, content: true, linkPreviews: true },
  });
  if (!obiter) {
    return NextResponse.json({ error: "Obiter no encontrado" }, { status: 404 });
  }

  // Si ya tiene previews y no se pide forzar, devolverlas tal cual.
  if (!body.force && obiter.linkPreviews) {
    try {
      return NextResponse.json({
        previews: JSON.parse(obiter.linkPreviews),
        cached: true,
      });
    } catch {
      // JSON corrupto, regenerar
    }
  }

  const previews = await buildPreviewsForContent(obiter.content);
  const serialized = serializeLinkPreviews(previews);

  // Persistir solo si hay algo que guardar (evita updates innecesarios).
  if (serialized) {
    try {
      await prisma.obiterDictum.update({
        where: { id: obiterId },
        data: { linkPreviews: serialized },
      });
    } catch (err) {
      // Si la columna no existe (DB sin migración) no rompemos.
      console.warn("[og-preview] persist failed:", err);
    }
  }

  return NextResponse.json({ previews, cached: false });
}
