import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DebatesV4Client } from "./debates-v4-client";

export const metadata = {
  title: "Debates Jurídicos — Studio Iuris",
  description:
    "Argumentos, réplicas y votación de la comunidad sobre cuestiones jurídicas abiertas.",
};

export default async function DebatesPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const debates = await prisma.debateJuridico.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      autor1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
      autor2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
    },
  });

  // Estados activos primero, cerrado al final. Dentro de cada bloque se
  // ordena por fecha desc — el cliente vuelve a ordenar según el sort
  // seleccionado, esto es solo el orden por defecto.
  const ORDER: Record<string, number> = {
    votacion: 0,
    argumentos: 1,
    replicas: 2,
    buscando_oponente: 3,
    cerrado: 4,
  };
  debates.sort((a, b) => {
    const oa = ORDER[a.estado] ?? 5;
    const ob = ORDER[b.estado] ?? 5;
    if (oa !== ob) return oa - ob;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <DebatesV4Client
      debates={JSON.parse(JSON.stringify(debates))}
      userId={authUser.id}
    />
  );
}
