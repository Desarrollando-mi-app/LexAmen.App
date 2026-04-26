import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EstadisticasClient } from "./estadisticas-client";

export const metadata = {
  title: "Mis Estadísticas — Studio Iuris",
};

export default async function EstadisticasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  return <EstadisticasClient />;
}
