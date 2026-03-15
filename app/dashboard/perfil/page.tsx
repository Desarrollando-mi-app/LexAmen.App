import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PerfilSettings } from "./perfil-settings";

export const metadata = {
  title: "Mi Cuenta — Studio Iuris",
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      bio: true,
      avatarUrl: true,
      universidad: true,
      sede: true,
      universityYear: true,
      cvAvailable: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div
      className="gz-page min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      <div className="mx-auto max-w-2xl px-4 lg:px-0 py-8 sm:py-12">
        {/* Header */}
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold font-medium">
          Configuraci&oacute;n &middot; Perfil
        </p>
        <h1 className="font-cormorant text-[28px] sm:text-[32px] !font-bold text-gz-ink leading-tight mt-1">
          Mi Cuenta
        </h1>
        <div className="border-b-2 border-gz-rule-dark mt-3 mb-6" />

        <PerfilSettings
          user={{
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            bio: user.bio,
            avatarUrl: user.avatarUrl,
            universidad: user.universidad,
            sede: user.sede,
            universityYear: user.universityYear,
            cvAvailable: user.cvAvailable,
          }}
        />
      </div>
    </div>
  );
}
