import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { RankingClient } from "./ranking-client";

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const me = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { visibleEnRanking: true },
  });

  return <RankingClient visibleEnRanking={me?.visibleEnRanking ?? true} />;
}
