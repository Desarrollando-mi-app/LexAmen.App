import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RankingV4Client } from "./ranking-v4-client";

export const metadata = {
  title: "Ranking de Autores — Studio Iuris",
  description:
    "Las plumas más activas de la comunidad — debate, análisis, ensayos y alegatos.",
};

/**
 * Vista V4 editorial del ranking de autores. Server thin: verifica auth y
 * delega toda la presentación a RankingV4Client. La data se sigue
 * resolviendo en el cliente vía /api/diario/ranking-autores para soportar
 * los filtros dinámicos (período, rama, página) sin server roundtrip.
 */
export default async function RankingAutoresPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  return <RankingV4Client />;
}
