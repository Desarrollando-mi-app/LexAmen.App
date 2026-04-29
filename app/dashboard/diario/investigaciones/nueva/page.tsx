// ─── Nueva Investigación — Server Component ────────────────────
//
// Carga las instituciones jurídicas (M:N selector) y renderiza el
// editor TipTap. Si no hay sesión, redirige a /login.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { InvEditor } from "../components/inv-editor";

export const dynamic = "force-dynamic";

export default async function NuevaInvestigacionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const instituciones = await prisma.institucionJuridica.findMany({
    select: {
      id: true,
      nombre: true,
      area: true,
      grupo: true,
    },
    orderBy: [{ area: "asc" }, { grupo: "asc" }, { orden: "asc" }],
  });

  return (
    <div className="min-h-screen bg-inv-paper text-inv-ink">
      {/* Rail tricolor superior */}
      <div className="h-[3px] bg-gradient-to-r from-inv-ocre via-inv-tinta-roja to-inv-ocre" />

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cabecera tipo masthead */}
        <header className="mb-8 pb-5 border-b border-inv-rule">
          <p className="font-cormorant italic text-[11px] uppercase tracking-[3px] text-inv-ocre mb-1">
            — Imprenta · III —
          </p>
          <h1 className="font-cormorant text-[36px] sm:text-[44px] font-medium leading-tight text-inv-ink">
            <em>Nueva investigación</em>
          </h1>
          <p className="font-cormorant italic text-[14px] text-inv-ink-3 mt-1.5">
            Tu trabajo se enviará a la imprenta y se publicará bajo tu autoría.
          </p>
        </header>

        <InvEditor userId={user.id} instituciones={instituciones} />
      </div>
    </div>
  );
}
