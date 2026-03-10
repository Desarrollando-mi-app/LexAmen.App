import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = request.nextUrl;
  const tab = url.searchParams.get("tab") ?? "flashcards";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;
  const search = url.searchParams.get("search") ?? "";

  if (tab === "flashcards") {
    const where = search
      ? {
          OR: [
            { front: { contains: search, mode: "insensitive" as const } },
            { back: { contains: search, mode: "insensitive" as const } },
            { materia: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.flashcard.findMany({
        where,
        orderBy: { materia: "asc" },
        skip,
        take: limit,
      }),
      prisma.flashcard.count({ where }),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (tab === "mcq") {
    const where = search
      ? {
          OR: [
            { question: { contains: search, mode: "insensitive" as const } },
            { materia: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      prisma.mCQ.findMany({
        where,
        orderBy: { materia: "asc" },
        skip,
        take: limit,
      }),
      prisma.mCQ.count({ where }),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  if (tab === "reports") {
    const [items, total] = await Promise.all([
      prisma.contentReport.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.contentReport.count(),
    ]);
    return NextResponse.json({
      items: items.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        userName: `${r.user.firstName} ${r.user.lastName}`,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  return NextResponse.json({ error: "Tab no válido" }, { status: 400 });
}

// POST: create content
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { type, data } = body as { type: string; data: Record<string, unknown> };

  if (type === "flashcard") {
    const card = await prisma.flashcard.create({
      data: {
        front: data.front as string,
        back: data.back as string,
        unidad: data.unidad as string,
        materia: data.materia as string,
        submateria: data.submateria as string,
        tipo: data.tipo as "CIVIL" | "PROCESAL",
        nivel: (data.nivel as string) ?? "BASICO",
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action: "CREATE_FLASHCARD",
        target: card.id,
      },
    });
    return NextResponse.json({ id: card.id });
  }

  if (type === "mcq") {
    const q = await prisma.mCQ.create({
      data: {
        question: data.question as string,
        optionA: data.optionA as string,
        optionB: data.optionB as string,
        optionC: data.optionC as string,
        optionD: data.optionD as string,
        correctOption: data.correctOption as string,
        explanation: (data.explanation as string) ?? null,
        unidad: data.unidad as string,
        materia: data.materia as string,
        submateria: data.submateria as string,
        tipo: data.tipo as "CIVIL" | "PROCESAL",
        nivel: (data.nivel as string) ?? "BASICO",
      },
    });
    await prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action: "CREATE_MCQ",
        target: q.id,
      },
    });
    return NextResponse.json({ id: q.id });
  }

  return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
}

// DELETE: delete content or resolve report
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { type, id } = body as { type: string; id: string };

  if (type === "flashcard") {
    await prisma.flashcard.delete({ where: { id } });
    await prisma.adminLog.create({
      data: { adminId: authUser.id, action: "DELETE_FLASHCARD", target: id },
    });
  } else if (type === "mcq") {
    await prisma.mCQ.delete({ where: { id } });
    await prisma.adminLog.create({
      data: { adminId: authUser.id, action: "DELETE_MCQ", target: id },
    });
  } else if (type === "report") {
    await prisma.contentReport.update({
      where: { id },
      data: { status: "RESOLVED" },
    });
    await prisma.adminLog.create({
      data: { adminId: authUser.id, action: "RESOLVE_REPORT", target: id },
    });
  } else {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
