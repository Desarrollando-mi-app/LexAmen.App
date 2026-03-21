import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CONFIG_DEFAULTS, invalidateConfigCache } from "@/lib/app-config";

async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, isAdmin: true, firstName: true, lastName: true },
  });

  if (!user?.isAdmin) return null;
  return user;
}

// ─── GET: Return all configs grouped by categoria ────────────────
export async function GET() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Seed defaults if DB is empty
  const count = await prisma.appConfig.count();
  if (count === 0) {
    await prisma.appConfig.createMany({
      data: CONFIG_DEFAULTS.map((d) => ({
        clave: d.clave,
        valor: d.valor,
        tipo: d.tipo,
        categoria: d.categoria,
        label: d.label,
        descripcion: (d as Record<string, string>).descripcion ?? null,
      })),
      skipDuplicates: true,
    });
  }

  const configs = await prisma.appConfig.findMany({
    orderBy: [{ categoria: "asc" }, { label: "asc" }],
  });

  const categorias = Array.from(new Set(configs.map((c) => c.categoria)));

  return NextResponse.json({ configs, categorias });
}

// ─── PATCH: Update a single config value ─────────────────────────
export async function PATCH(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { clave, valor } = body as { clave: string; valor: string };

  if (!clave || valor === undefined) {
    return NextResponse.json(
      { error: "clave y valor son requeridos" },
      { status: 400 }
    );
  }

  const existing = await prisma.appConfig.findUnique({ where: { clave } });
  if (!existing) {
    return NextResponse.json(
      { error: "Config no encontrada" },
      { status: 404 }
    );
  }

  const oldValue = existing.valor;

  await prisma.appConfig.update({
    where: { clave },
    data: { valor, updatedBy: admin.id },
  });

  invalidateConfigCache();

  await prisma.adminLog.create({
    data: {
      adminId: admin.id,
      action: "UPDATE_CONFIG",
      target: clave,
      metadata: { oldValue, newValue: valor },
    },
  });

  return NextResponse.json({ ok: true });
}

// ─── POST: Seed or Reset configs ─────────────────────────────────
export async function POST(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body as { action: string };

  if (action === "seed") {
    // Insert missing defaults (skip existing)
    const existing = await prisma.appConfig.findMany({
      select: { clave: true },
    });
    const existingKeys = new Set(existing.map((e) => e.clave));
    const toInsert = CONFIG_DEFAULTS.filter(
      (d) => !existingKeys.has(d.clave)
    );

    if (toInsert.length > 0) {
      await prisma.appConfig.createMany({
        data: toInsert.map((d) => ({
          clave: d.clave,
          valor: d.valor,
          tipo: d.tipo,
          categoria: d.categoria,
          label: d.label,
          descripcion: (d as Record<string, string>).descripcion ?? null,
        })),
        skipDuplicates: true,
      });
    }

    invalidateConfigCache();

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "SEED_CONFIG",
        metadata: { inserted: toInsert.length },
      },
    });

    return NextResponse.json({ ok: true, inserted: toInsert.length });
  }

  if (action === "reset") {
    // Reset all to CONFIG_DEFAULTS values
    for (const d of CONFIG_DEFAULTS) {
      await prisma.appConfig.upsert({
        where: { clave: d.clave },
        update: {
          valor: d.valor,
          tipo: d.tipo,
          categoria: d.categoria,
          label: d.label,
          descripcion: (d as Record<string, string>).descripcion ?? null,
          updatedBy: admin.id,
        },
        create: {
          clave: d.clave,
          valor: d.valor,
          tipo: d.tipo,
          categoria: d.categoria,
          label: d.label,
          descripcion: (d as Record<string, string>).descripcion ?? null,
          updatedBy: admin.id,
        },
      });
    }

    invalidateConfigCache();

    await prisma.adminLog.create({
      data: {
        adminId: admin.id,
        action: "RESET_CONFIG",
        metadata: { count: CONFIG_DEFAULTS.length },
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
