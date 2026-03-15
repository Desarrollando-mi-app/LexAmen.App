import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AdminSidebar } from "./components/admin-sidebar";
import { AdminMobileNav } from "./components/admin-mobile-nav";

export const metadata = {
  title: "Admin — Studio Iuris",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true, firstName: true },
  });

  if (!dbUser?.isAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar adminName={dbUser.firstName} />
      <div className="flex-1 flex flex-col overflow-auto">
        <AdminMobileNav />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
