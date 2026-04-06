import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RankingCausasClient } from "./ranking-causas-client";

export const metadata = { title: "Ranking de Causas — Studio Iuris" };

export default async function RankingCausasPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  return <RankingCausasClient />;
}
