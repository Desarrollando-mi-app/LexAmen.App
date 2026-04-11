import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DebateList } from "./debate-list";
import Image from "next/image";

export const metadata = {
  title: "Debates Juridicos — Studio Iuris",
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

  // Sort: active states first, then cerrado
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
    <div className="px-4 pb-16 pt-8 sm:px-6">
      {/* Header — full bleed */}
      <div className="gz-section-header mb-6">
        <p className="mb-1 font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light">
          El Diario
        </p>
        <div className="mb-1 flex items-center gap-3">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={80}
            height={80}
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
          />
          <h1 className="font-cormorant text-[38px] font-bold leading-none text-gz-ink lg:text-[44px]">
            Debates Juridicos
          </h1>
        </div>
        <div className="mt-3 h-[2px] bg-gz-rule-dark" />
      </div>

      <div className="mt-6">
        <DebateList
          debates={JSON.parse(JSON.stringify(debates))}
          userId={authUser.id}
        />
      </div>
    </div>
  );
}
