import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-border bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-2">
          <h1 className="text-xl font-bold text-navy">Panel de Administración</h1>
          <a
            href="/dashboard"
            className="text-sm text-gold hover:underline"
          >
            ← Volver al Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <AdminPanel />
      </div>
    </main>
  );
}
