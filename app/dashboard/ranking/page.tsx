import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RankingClient } from "./ranking-client";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  return <RankingClient />;
}
