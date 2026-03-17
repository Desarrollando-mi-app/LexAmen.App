import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InsigniasClient } from "./insignias-client";

export const metadata = {
  title: "Mis Insignias — Studio Iuris",
};

export default async function InsigniasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  return <InsigniasClient />;
}
