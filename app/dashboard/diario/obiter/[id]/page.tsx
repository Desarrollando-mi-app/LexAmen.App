import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegaIdsForUser } from "@/lib/obiter-utils";
import { ObiterDetailClient } from "./obiter-detail-client";

// ─── Dynamic metadata ────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const obiter = await prisma.obiterDictum.findUnique({
    where: { id },
    select: {
      content: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  if (!obiter) {
    return { title: "Obiter no encontrado — Studio Iuris" };
  }

  const preview =
    obiter.content.length > 60
      ? obiter.content.slice(0, 60) + "…"
      : obiter.content;

  return {
    title: `${obiter.user.firstName} ${obiter.user.lastName} en Studio Iuris: "${preview}"`,
  };
}

// ─── Page ────────────────────────────────────────────────────

export default async function ObiterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  // Fetch the obiter with relations
  const obiter = await prisma.obiterDictum.findUnique({
    where: { id },
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
      citedObiter: {
        select: {
          id: true,
          content: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
      citedAnalisis: {
        select: {
          id: true,
          titulo: true,
          tribunal: true,
          materia: true,
        },
      },
      citedEnsayo: {
        select: {
          id: true,
          titulo: true,
          tipo: true,
          materia: true,
        },
      },
      citadoPor: {
        orderBy: { apoyosCount: "desc" },
        take: 20,
        select: {
          id: true,
          content: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!obiter) {
    notFound();
  }

  // Thread parts
  let threadParts = null;
  if (obiter.threadId) {
    const parts = await prisma.obiterDictum.findMany({
      where: { threadId: obiter.threadId },
      orderBy: { threadOrder: "asc" },
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

    // Get interaction flags for each part if authenticated
    if (authUser && parts.length > 0) {
      const partIds = parts.map((p) => p.id);

      const [apoyos, guardados, comunicados] = await Promise.all([
        prisma.obiterApoyo.findMany({
          where: { obiterId: { in: partIds }, userId: authUser.id },
          select: { obiterId: true },
        }),
        prisma.obiterGuardado.findMany({
          where: { obiterId: { in: partIds }, userId: authUser.id },
          select: { obiterId: true },
        }),
        prisma.obiterComuniquese.findMany({
          where: { obiterId: { in: partIds }, userId: authUser.id },
          select: { obiterId: true },
        }),
      ]);

      const apoyoSet = new Set(apoyos.map((a) => a.obiterId));
      const guardadoSet = new Set(guardados.map((g) => g.obiterId));
      const comunicadoSet = new Set(comunicados.map((c) => c.obiterId));

      threadParts = parts.map((p) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        content: p.content,
        materia: p.materia,
        tipo: p.tipo,
        threadId: p.threadId,
        threadOrder: p.threadOrder,
        threadPartsCount: parts.length,
        citedObiterId: p.citedObiterId,
        citedObiter: null,
        citedAnalisisId: p.citedAnalisisId ?? null,
        citedAnalisis: null,
        citedEnsayoId: p.citedEnsayoId ?? null,
        citedEnsayo: null,
        apoyosCount: p.apoyosCount,
        citasCount: p.citasCount,
        guardadosCount: p.guardadosCount,
        comuniqueseCount: p.comuniqueseCount,
        hasApoyado: apoyoSet.has(p.id),
        hasGuardado: guardadoSet.has(p.id),
        hasComunicado: comunicadoSet.has(p.id),
        createdAt: p.createdAt.toISOString(),
      }));
    } else {
      threadParts = parts.map((p) => ({
        id: p.id,
        userId: p.userId,
        user: p.user,
        content: p.content,
        materia: p.materia,
        tipo: p.tipo,
        threadId: p.threadId,
        threadOrder: p.threadOrder,
        threadPartsCount: parts.length,
        citedObiterId: p.citedObiterId,
        citedObiter: null,
        citedAnalisisId: p.citedAnalisisId ?? null,
        citedAnalisis: null,
        citedEnsayoId: p.citedEnsayoId ?? null,
        citedEnsayo: null,
        apoyosCount: p.apoyosCount,
        citasCount: p.citasCount,
        guardadosCount: p.guardadosCount,
        comuniqueseCount: p.comuniqueseCount,
        createdAt: p.createdAt.toISOString(),
      }));
    }
  }

  // Interaction flags for the main obiter
  let hasApoyado = false;
  let hasGuardado = false;
  let hasComunicado = false;
  let colegasQueApoyaron: { firstName: string; lastName: string }[] = [];

  // Datos del usuario autenticado para el editor inline de continuar hilo
  let currentUserFirstName: string | undefined;
  let currentUserAvatarUrl: string | null | undefined;

  if (authUser) {
    const me = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true, avatarUrl: true },
    });
    currentUserFirstName = me?.firstName ?? undefined;
    currentUserAvatarUrl = me?.avatarUrl ?? null;
    const [apoyo, guardado, comuniquese] = await Promise.all([
      prisma.obiterApoyo.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.obiterGuardado.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
      prisma.obiterComuniquese.findUnique({
        where: { obiterId_userId: { obiterId: id, userId: authUser.id } },
        select: { id: true },
      }),
    ]);

    hasApoyado = !!apoyo;
    hasGuardado = !!guardado;
    hasComunicado = !!comuniquese;

    // Apoyos de colegas
    const colegaIds = await getColegaIdsForUser(authUser.id);
    if (colegaIds.length > 0) {
      const apoyosColegas = await prisma.obiterApoyo.findMany({
        where: { obiterId: id, userId: { in: colegaIds } },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });
      colegasQueApoyaron = apoyosColegas.map((a) => ({
        firstName: a.user.firstName,
        lastName: a.user.lastName,
      }));
    }
  }

  // Serialize obiter for client
  const serializedObiter = {
    id: obiter.id,
    userId: obiter.userId,
    user: obiter.user,
    content: obiter.content,
    materia: obiter.materia,
    tipo: obiter.tipo,
    threadId: obiter.threadId,
    threadOrder: obiter.threadOrder,
    threadPartsCount: threadParts?.length ?? null,
    citedObiterId: obiter.citedObiterId,
    citedObiter: obiter.citedObiter
      ? {
          id: obiter.citedObiter.id,
          content: obiter.citedObiter.content,
          user: obiter.citedObiter.user,
        }
      : null,
    citedAnalisisId: obiter.citedAnalisisId ?? null,
    citedAnalisis: obiter.citedAnalisis ?? null,
    citedEnsayoId: obiter.citedEnsayoId ?? null,
    citedEnsayo: obiter.citedEnsayo ?? null,
    apoyosCount: obiter.apoyosCount,
    citasCount: obiter.citasCount,
    guardadosCount: obiter.guardadosCount,
    comuniqueseCount: obiter.comuniqueseCount,
    // replyCount viene de la columna desnormalizada (default 0 si la
    // migración no se aplicó).
    replyCount: (obiter as { replyCount?: number }).replyCount ?? 0,
    hasApoyado,
    hasGuardado,
    hasComunicado,
    colegasQueApoyaron,
    createdAt: obiter.createdAt.toISOString(),
  };

  // Serialize citations
  const serializedCitations = obiter.citadoPor.map((c) => ({
    id: c.id,
    content:
      c.content.length > 200 ? c.content.slice(0, 200) + "…" : c.content,
    createdAt: c.createdAt.toISOString(),
    apoyosCount: c.apoyosCount,
    citasCount: c.citasCount,
    user: c.user,
  }));

  // ─── Respuestas (modelo unificado) ─────────────────────────
  // Carga las respuestas directas del OD ordenadas cronológicamente.
  // Las respuestas no aparecen en el feed principal; viven solo aquí.
  // Defensive: la columna parentObiterId puede no existir si la
  // migración no se aplicó. Si falla, devolvemos lista vacía.
  type ReplyWithRelations = Awaited<
    ReturnType<typeof prisma.obiterDictum.findMany>
  >[number] & {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      universidad: string | null;
    };
  };
  let rawReplies: ReplyWithRelations[] = [];
  try {
    rawReplies = (await prisma.obiterDictum.findMany({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where: { parentObiterId: id } as any,
      orderBy: { createdAt: "asc" },
      take: 100,
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
      },
    })) as ReplyWithRelations[];
  } catch (err) {
    console.warn("[obiter detail] replies query failed:", err);
  }

  // Flags de interacción para cada respuesta (si está autenticado)
  let replyInteractions: {
    apoyo: Set<string>;
    guardado: Set<string>;
    comunicado: Set<string>;
  } = {
    apoyo: new Set(),
    guardado: new Set(),
    comunicado: new Set(),
  };
  if (authUser && rawReplies.length > 0) {
    const replyIds = rawReplies.map((r) => r.id);
    const [a, g, c] = await Promise.all([
      prisma.obiterApoyo.findMany({
        where: { obiterId: { in: replyIds }, userId: authUser.id },
        select: { obiterId: true },
      }),
      prisma.obiterGuardado.findMany({
        where: { obiterId: { in: replyIds }, userId: authUser.id },
        select: { obiterId: true },
      }),
      prisma.obiterComuniquese.findMany({
        where: { obiterId: { in: replyIds }, userId: authUser.id },
        select: { obiterId: true },
      }),
    ]);
    replyInteractions = {
      apoyo: new Set(a.map((x) => x.obiterId)),
      guardado: new Set(g.map((x) => x.obiterId)),
      comunicado: new Set(c.map((x) => x.obiterId)),
    };
  }

  const serializedReplies = rawReplies.map((r) => ({
    id: r.id,
    userId: r.userId,
    user: r.user,
    content: r.content,
    materia: r.materia,
    tipo: r.tipo,
    threadId: r.threadId,
    threadOrder: r.threadOrder,
    threadPartsCount: null,
    parentObiterId: id,
    replyCount: (r as { replyCount?: number }).replyCount ?? 0,
    citedObiterId: r.citedObiterId,
    citedObiter: null,
    citedAnalisisId: r.citedAnalisisId ?? null,
    citedAnalisis: null,
    citedEnsayoId: r.citedEnsayoId ?? null,
    citedEnsayo: null,
    apoyosCount: r.apoyosCount,
    citasCount: r.citasCount,
    guardadosCount: r.guardadosCount,
    comuniqueseCount: r.comuniqueseCount,
    hasApoyado: replyInteractions.apoyo.has(r.id),
    hasGuardado: replyInteractions.guardado.has(r.id),
    hasComunicado: replyInteractions.comunicado.has(r.id),
    createdAt: r.createdAt.toISOString(),
  }));

  const obiterCommentsDisabled =
    (obiter as { commentsDisabled?: boolean }).commentsDisabled ?? false;

  const isThread = threadParts && threadParts.length > 1;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* ─── Page masthead editorial ─── */}
        <div className="mb-6 relative">
          <div className="flex items-end justify-between gap-3 mb-3">
            <div>
              <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-burgundy mb-1 flex items-center gap-1.5">
                <span className="font-cormorant text-[14px] leading-none text-gz-gold">§</span>
                {isThread ? `Hilo de ${threadParts!.length} partes` : "Obiter Dictum"}
              </p>
              <h1 className="font-cormorant text-[36px] sm:text-[44px] font-bold text-gz-ink leading-[0.95] tracking-tight">
                {isThread ? (
                  <>
                    Hilo de <span className="text-gz-burgundy italic">{obiter.user.firstName}</span>
                  </>
                ) : (
                  <>
                    Obiter de <span className="text-gz-burgundy italic">{obiter.user.firstName}</span>
                  </>
                )}
              </h1>
            </div>
          </div>
          {/* Triple regla editorial */}
          <div className="h-[3px] bg-gz-ink/85" />
          <div className="h-px bg-gz-ink/85 mt-[2px]" />
          <div className="h-[2px] bg-gz-ink/85 mt-[2px]" />
        </div>

        <ObiterDetailClient
          obiter={serializedObiter}
          threadParts={threadParts}
          citations={serializedCitations}
          replies={serializedReplies}
          commentsDisabled={obiterCommentsDisabled}
          currentUserId={authUser?.id ?? null}
          currentUserFirstName={currentUserFirstName}
          currentUserAvatarUrl={currentUserAvatarUrl ?? null}
        />
      </div>
    </div>
  );
}
