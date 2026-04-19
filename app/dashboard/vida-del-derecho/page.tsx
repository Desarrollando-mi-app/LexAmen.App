import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  GRADOS,
  NIVELES,
  getGradoInfo,
  getSiguienteGrado,
  getProgresoGrado,
  getCurrentWeekBounds,
} from "@/lib/league";
import { VidaDelDerechoViewer } from "./vida-viewer";

export default async function VidaDelDerechoPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const { weekStart } = getCurrentWeekBounds();

  const [userData, historicalMemberships, myWeeklyMember] = await Promise.all([
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { xp: true, grado: true },
    }),

    prisma.leagueMember.findMany({
      where: {
        userId: authUser.id,
        league: { weekStart: { lt: weekStart } },
      },
      orderBy: { league: { weekStart: "desc" } },
      take: 8,
      include: {
        league: {
          select: { gradoRef: true, weekStart: true, weekEnd: true },
        },
      },
    }),

    prisma.leagueMember.findFirst({
      where: { userId: authUser.id, league: { weekStart } },
      select: { weeklyXp: true },
    }),
  ]);

  const userGrado = userData?.grado ?? 1;
  const userXp = userData?.xp ?? 0;
  const gradoInfo = getGradoInfo(userGrado);
  const siguienteGrado = getSiguienteGrado(userGrado);
  const progresoGrado = getProgresoGrado(userXp, userGrado);

  const historial = historicalMemberships.map((hm) => {
    const g = getGradoInfo(hm.league.gradoRef);
    return {
      gradoRef: hm.league.gradoRef,
      gradoNombre: g.nombre,
      gradoEmoji: g.emoji,
      nivelLabel: NIVELES[g.nivel]?.label ?? g.nivel,
      weekStart: hm.league.weekStart.toISOString(),
      weeklyXp: hm.weeklyXp,
      rank: hm.rank,
    };
  });

  return (
    <VidaDelDerechoViewer
      userGrado={userGrado}
      gradoNombre={gradoInfo.nombre}
      gradoEmoji={gradoInfo.emoji}
      gradoColor={gradoInfo.color}
      nivelLabel={NIVELES[gradoInfo.nivel]?.label ?? gradoInfo.nivel}
      userXp={userXp}
      xpSiguienteGrado={siguienteGrado?.xpMinimo ?? null}
      xpGradoActual={gradoInfo.xpMinimo}
      siguienteGradoNombre={siguienteGrado?.nombre ?? null}
      siguienteGradoNum={siguienteGrado?.grado ?? null}
      progresoGrado={progresoGrado}
      grados={GRADOS.map((g) => ({
        grado: g.grado,
        nombre: g.nombre,
        nivel: g.nivel,
        emoji: g.emoji,
        color: g.color,
        xpMinimo: g.xpMinimo,
      }))}
      niveles={Object.entries(NIVELES).map(([key, val]) => ({
        key,
        label: val.label,
        grados: val.grados,
        color: val.color,
        description: val.description,
      }))}
      historial={historial}
      myWeeklyXp={myWeeklyMember?.weeklyXp ?? 0}
    />
  );
}
