import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getColegas, getPendingRequests, getSentRequests } from "@/lib/colegas";
import { ColegasClient } from "./colegas-client";

export default async function ColegasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const [colegas, pendingReceived, pendingSent] = await Promise.all([
    getColegas(authUser.id),
    getPendingRequests(authUser.id),
    getSentRequests(authUser.id),
  ]);

  return (
    <ColegasClient
      colegas={colegas}
      pendingReceived={pendingReceived}
      pendingSent={pendingSent}
    />
  );
}
