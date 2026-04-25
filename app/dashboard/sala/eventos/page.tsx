import { redirect } from "next/navigation";

export const metadata = {
  title: "Eventos Académicos — Studio Iuris",
};

/**
 * Eventos migró a Academia (es contenido académico, no profesional). El
 * route antiguo /sala/eventos redirige permanentemente al nuevo hogar.
 */
export default function EventosLegacyRedirectPage() {
  redirect("/dashboard/academia/eventos");
}
