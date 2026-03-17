import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { sponsorId } = await request.json();

    if (!sponsorId) {
      return NextResponse.json(
        { error: "sponsorId es requerido" },
        { status: 400 }
      );
    }

    const sponsor = await prisma.sponsorBanner.update({
      where: { id: sponsorId },
      data: { clicks: { increment: 1 } },
    });

    return NextResponse.json({ success: true, clicks: sponsor.clicks });
  } catch (error) {
    console.error("Error registrando click de sponsor:", error);
    return NextResponse.json(
      { error: "Error al registrar click" },
      { status: 500 }
    );
  }
}
