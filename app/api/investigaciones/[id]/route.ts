import { NextRequest, NextResponse } from "next/server";
import { getInvestigacionDetalle } from "@/lib/investigaciones";

// ─── GET — Detalle de investigación ───────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const inv = await getInvestigacionDetalle(id);
  if (!inv) {
    return NextResponse.json(
      { error: "Investigación no encontrada" },
      { status: 404 },
    );
  }
  return NextResponse.json({ investigacion: inv });
}

// PATCH y DELETE quedan para Sprint 2 (editor + manage).
