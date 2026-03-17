import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  VALID_ENSAYO_TIPOS,
  ENSAYO_MAX_FILE_SIZE,
  ENSAYO_RESUMEN_MAX_CHARS,
  canPublishLongContent,
} from "@/lib/diario-utils";

// ─── GET: Listar Ensayos ────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const { searchParams } = request.nextUrl;
  const materia = searchParams.get("materia");
  const tipo = searchParams.get("tipo");
  const tags = searchParams.get("tags");
  const userId = searchParams.get("userId");
  const q = searchParams.get("q");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit")) || 15, 50);

  // ─── Construir where ──────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
    isHidden: false,
  };

  if (materia) {
    where.materia = materia;
  }

  if (tipo) {
    where.tipo = tipo;
  }

  if (tags) {
    where.tags = { contains: tags, mode: "insensitive" };
  }

  if (userId) {
    where.userId = userId;
  }

  if (q) {
    where.titulo = { contains: q, mode: "insensitive" };
  }

  // ─── Query ────────────────────────────────────────────────

  const ensayos = await prisma.ensayo.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
      ...(authUser
        ? {
            apoyos: {
              where: { userId: authUser.id },
              select: { id: true },
            },
            guardados: {
              where: { userId: authUser.id },
              select: { id: true },
            },
            comuniquese: {
              where: { userId: authUser.id },
              select: { id: true },
            },
          }
        : {}),
    },
  });

  const hasMore = ensayos.length > limit;
  const items = hasMore ? ensayos.slice(0, limit) : ensayos;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  // ─── Response ─────────────────────────────────────────────

  return NextResponse.json({
    items: items.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      materia: e.materia,
      tipo: e.tipo,
      tags: e.tags,
      resumen: e.resumen,
      archivoFormato: e.archivoFormato,
      archivoTamano: e.archivoTamano,
      showInFeed: e.showInFeed,
      apoyosCount: e.apoyosCount,
      citasCount: e.citasCount,
      guardadosCount: e.guardadosCount,
      comuniqueseCount: e.comuniqueseCount,
      viewsCount: e.viewsCount,
      downloadsCount: e.downloadsCount,
      createdAt: e.createdAt.toISOString(),
      user: e.user,
      ...(authUser
        ? {
            hasApoyado:
              (e as typeof e & { apoyos: { id: string }[] }).apoyos?.length > 0,
            hasGuardado:
              (e as typeof e & { guardados: { id: string }[] }).guardados
                ?.length > 0,
            hasComunicado:
              (e as typeof e & { comuniquese: { id: string }[] }).comuniquese
                ?.length > 0,
          }
        : {}),
    })),
    nextCursor,
    hasMore,
  });
}

// ─── POST: Crear Ensayo (multipart/form-data) ──────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();

  const titulo = formData.get("titulo") as string;
  const materia = formData.get("materia") as string;
  const tipo = formData.get("tipo") as string;
  const tags = formData.get("tags") as string | null;
  const resumen = formData.get("resumen") as string | null;
  const showInFeedRaw = formData.get("showInFeed") as string | null;
  const file = formData.get("file");

  // ─── Validaciones ─────────────────────────────────────────

  if (!titulo || !titulo.trim()) {
    return NextResponse.json(
      { error: "El título es requerido" },
      { status: 400 }
    );
  }

  if (!materia || !materia.trim()) {
    return NextResponse.json(
      { error: "La materia es requerida" },
      { status: 400 }
    );
  }

  if (!tipo || !tipo.trim()) {
    return NextResponse.json(
      { error: "El tipo es requerido" },
      { status: 400 }
    );
  }

  if (!VALID_ENSAYO_TIPOS.includes(tipo)) {
    return NextResponse.json(
      { error: `Tipo no válido. Tipos permitidos: ${VALID_ENSAYO_TIPOS.join(", ")}` },
      { status: 400 }
    );
  }

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "El archivo es requerido" },
      { status: 400 }
    );
  }

  const validMimeTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (!validMimeTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Solo se permiten archivos PDF o DOCX" },
      { status: 400 }
    );
  }

  if (file.size > ENSAYO_MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "El archivo no puede exceder 10 MB" },
      { status: 400 }
    );
  }

  if (resumen && resumen.length > ENSAYO_RESUMEN_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `El resumen no puede exceder ${ENSAYO_RESUMEN_MAX_CHARS} caracteres`,
      },
      { status: 400 }
    );
  }

  // ─── Límite diario ────────────────────────────────────────

  const publishCheck = await canPublishLongContent(authUser.id);
  if (!publishCheck.allowed) {
    return NextResponse.json(
      {
        error:
          "Has alcanzado tu límite diario de publicaciones largas. Actualiza a Premium para publicar sin límites.",
        remaining: 0,
        isPremium: false,
      },
      { status: 429 }
    );
  }

  // ─── Upload a Supabase Storage ────────────────────────────

  const ensayoId = crypto.randomUUID();
  const archivoFormato =
    file.type === "application/pdf" ? "pdf" : "docx";
  const storagePath = `ensayos/${authUser.id}/${ensayoId}.${archivoFormato}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("ensayos")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: "Error al subir el archivo" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl: archivoUrl },
  } = supabase.storage.from("ensayos").getPublicUrl(storagePath);

  // ─── Crear Ensayo ─────────────────────────────────────────

  const showInFeed = showInFeedRaw !== "false";

  const ensayo = await prisma.ensayo.create({
    data: {
      id: ensayoId,
      userId: authUser.id,
      titulo: titulo.trim(),
      materia: materia.trim(),
      tipo,
      tags: tags?.trim() || null,
      resumen: resumen?.trim() || null,
      archivoUrl,
      archivoNombre: file.name,
      archivoFormato,
      archivoTamano: file.size,
      showInFeed,
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
    },
  });

  // ─── XP al autor (via awardXp centralizado) ─────────────
  const { awardXp, XP_PUBLICAR_ENSAYO } = await import("@/lib/xp-config");
  await awardXp({
    userId: authUser.id,
    amount: XP_PUBLICAR_ENSAYO,
    category: "publicaciones",
    detalle: "Ensayo",
    prisma,
  });

  // Badge evaluation
  const { evaluateBadges } = await import("@/lib/badges");
  evaluateBadges(authUser.id, "diario").catch(() => {});

  return NextResponse.json({ ensayo }, { status: 201 });
}
