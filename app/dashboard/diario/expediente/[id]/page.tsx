import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ExpedienteDetail } from "./expediente-detail";

export const metadata = {
  title: "Expediente — Studio Iuris",
};

export default async function ExpedienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Fetch expediente with full data
  const expediente = await prisma.expediente.findUnique({
    where: { id },
    include: {
      argumentos: {
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              grado: true,
            },
          },
          contraArgumentos: {
            orderBy: { createdAt: "desc" },
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                  grado: true,
                },
              },
              votosRecibidos: {
                where: { userId: authUser.id },
                select: { id: true },
              },
              comentarios: {
                orderBy: { createdAt: "asc" },
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
              },
            },
          },
          votosRecibidos: {
            where: { userId: authUser.id },
            select: { id: true },
          },
          comentarios: {
            orderBy: { createdAt: "asc" },
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
          },
        },
      },
    },
  });

  if (!expediente || !expediente.aprobado) {
    notFound();
  }

  // Get current user info
  const currentUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { grado: true, firstName: true, lastName: true, avatarUrl: true },
  });

  // Check if user has already argued for each bando
  const userBandos = expediente.argumentos
    .filter((a) => a.userId === authUser.id && a.parentId === null)
    .map((a) => a.bando);

  // Count unique participants
  const participantIds = new Set(expediente.argumentos.map((a) => a.userId));

  // Count total votes
  const totalVotos = expediente.argumentos.reduce((sum, a) => {
    const contraVotos = a.contraArgumentos.reduce(
      (cs, ca) => cs + ca.votos,
      0
    );
    return sum + a.votos + contraVotos;
  }, 0);

  // Serialize dates
  const topLevelArgs = expediente.argumentos.filter((a) => a.parentId === null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function serializeArgumento(a: any) {
    return {
      id: a.id,
      bando: a.bando,
      posicion: a.posicion,
      fundamentoNormativo: a.fundamentoNormativo,
      argumento: a.argumento,
      jurisprudencia: a.jurisprudencia,
      normativa: a.normativa,
      votos: a.votos,
      parentId: a.parentId,
      createdAt: a.createdAt.toISOString(),
      userId: a.userId,
      user: a.user,
      hasVoted: a.votosRecibidos?.length > 0,
      comentarios: (a.comentarios ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any) => ({
          id: c.id,
          contenido: c.contenido,
          createdAt: c.createdAt.toISOString(),
          userId: c.userId,
          user: c.user,
        })
      ),
      contraArgumentos: (a.contraArgumentos ?? []).map(serializeArgumento),
    };
  }

  const serializedData = {
    id: expediente.id,
    numero: expediente.numero,
    titulo: expediente.titulo,
    hechos: expediente.hechos,
    pregunta: expediente.pregunta,
    rama: expediente.rama,
    materias: expediente.materias,
    dificultad: expediente.dificultad,
    bandoDemandante: expediente.bandoDemandante,
    bandoDemandado: expediente.bandoDemandado,
    fechaApertura: expediente.fechaApertura.toISOString(),
    fechaCierre: expediente.fechaCierre.toISOString(),
    estado: expediente.estado,
    cierreEditorial: expediente.cierreEditorial,
    mejorArgumentoId: expediente.mejorArgumentoId,
    argumentos: topLevelArgs.map(serializeArgumento),
    stats: {
      totalArgumentos: topLevelArgs.length,
      participantes: participantIds.size,
      totalVotos,
      demandanteCount: topLevelArgs.filter(
        (a) => a.bando === expediente.bandoDemandante
      ).length,
      demandadoCount: topLevelArgs.filter(
        (a) => a.bando === expediente.bandoDemandado
      ).length,
    },
  };

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ExpedienteDetail
          expediente={serializedData}
          currentUserId={authUser.id}
          currentUserGrado={currentUser?.grado ?? 1}
          userBandos={userBandos}
        />
      </div>
    </div>
  );
}
