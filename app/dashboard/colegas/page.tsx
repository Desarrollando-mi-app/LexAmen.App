import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getColegas, getPendingRequests, getSentRequests } from "@/lib/colegas";
import { ColegasClient } from "./colegas-client";
import Image from "next/image";

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
      <div className="px-4 sm:px-6 pt-8 pb-4">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
          Red de Estudio &middot; Colegas
        </span>
        <div className="flex items-center gap-3 mb-1">
          <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
          <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">Colegas</h1>
        </div>
      </div>
      <div className="h-[2px] bg-gz-rule-dark" />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
        <ColegasClient
          colegas={colegas}
          pendingReceived={pendingReceived}
          pendingSent={pendingSent}
        />
      </div>
    </div>
  );
}
