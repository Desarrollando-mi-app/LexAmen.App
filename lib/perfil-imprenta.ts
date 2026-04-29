// ─── Perfil · Imprenta del autor (helpers de query) ─────────────
//
// Datos que alimentan el bloque "Imprenta del autor" en el perfil
// público. Coexiste con la Trayectoria (declarativa) — la Imprenta
// es calculada a partir de las investigaciones publicadas y sus
// citas recibidas.

import { prisma } from "@/lib/prisma";
import { getInstitutionAuthority } from "@/lib/citations";

export type ImprentaMetrics = {
  totalInvestigaciones: number;
  totalCitationsReceived: number;
  citationsInternal: number;
  citationsExternal: number;
  hIndex: number;
  obraMasCitada: { id: string; titulo: string; citas: number } | null;
};

export type ImprentaInvestigacionItem = {
  id: string;
  titulo: string;
  tipo: string;
  area: string;
  publishedAt: string; // ISO — no Date raw, server→client safe
  citationsTotal: number;
};

export type PerfilImprentaData = {
  metrics: ImprentaMetrics;
  authority: Array<{
    institucionId: number;
    institucionNombre: string;
    citas: number;
    trabajos: number;
  }>;
  recientes: ImprentaInvestigacionItem[];
  totalInvestigaciones: number;
};

export async function getPerfilImprentaData(
  userId: string,
): Promise<PerfilImprentaData> {
  const [user, investigaciones, authority] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalCitationsReceived: true,
        hIndex: true,
      },
    }),
    prisma.investigacion.findMany({
      where: { userId, status: "published" },
      select: {
        id: true,
        titulo: true,
        tipo: true,
        area: true,
        publishedAt: true,
        citationsInternal: true,
        citationsExternal: true,
      },
      orderBy: [{ publishedAt: "desc" }],
    }),
    getInstitutionAuthority(userId, 3),
  ]);

  const totalInvestigaciones = investigaciones.length;
  const citationsInternal = investigaciones.reduce(
    (s, i) => s + i.citationsInternal,
    0,
  );
  const citationsExternal = investigaciones.reduce(
    (s, i) => s + i.citationsExternal,
    0,
  );

  // Obra más citada (suma internas + externas)
  const sorted = [...investigaciones].sort(
    (a, b) =>
      b.citationsInternal +
      b.citationsExternal -
      (a.citationsInternal + a.citationsExternal),
  );
  const top = sorted[0];
  const obraMasCitada =
    top && top.citationsInternal + top.citationsExternal > 0
      ? {
          id: top.id,
          titulo: top.titulo,
          citas: top.citationsInternal + top.citationsExternal,
        }
      : null;

  // 3 más recientes (ya viene ordenado desc)
  const recientes: ImprentaInvestigacionItem[] = investigaciones
    .slice(0, 3)
    .map((i) => ({
      id: i.id,
      titulo: i.titulo,
      tipo: i.tipo,
      area: i.area,
      publishedAt: i.publishedAt.toISOString(),
      citationsTotal: i.citationsInternal + i.citationsExternal,
    }));

  return {
    metrics: {
      totalInvestigaciones,
      totalCitationsReceived: user?.totalCitationsReceived ?? 0,
      citationsInternal,
      citationsExternal,
      hIndex: user?.hIndex ?? 0,
      obraMasCitada,
    },
    authority,
    recientes,
    totalInvestigaciones,
  };
}
