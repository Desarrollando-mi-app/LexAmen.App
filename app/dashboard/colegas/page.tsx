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
    <div className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Red de Estudio &middot; Colegas
          </span>
          <h1 className="font-cormorant text-[28px] lg:text-[32px] !font-bold text-gz-ink mb-3">Colegas</h1>
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>
        <ColegasClient
          colegas={colegas}
          pendingReceived={pendingReceived}
          pendingSent={pendingSent}
        />
      </div>
    </div>
  );
}
