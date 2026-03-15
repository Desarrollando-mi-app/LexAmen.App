import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ContingenciasClient } from "./contingencias-client";

export const metadata = {
  title: "Contingencias — Admin — Studio Iuris",
};

export default async function ContingenciasAdminPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) redirect("/dashboard");

  return <ContingenciasClient />;
}
