import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { noticiasVigentesWhere } from "@/lib/noticias-ttl";
import { NoticiasClient } from "./noticias-client";

export const metadata = {
  title: "Noticias Jurídicas — Studio Iuris",
};

export default async function NoticiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Vigencia: TTL 48h estándar + items pinneados (editoriales y cartas/columnas).
  const noticias = await prisma.noticiaJuridica.findMany({
    where: noticiasVigentesWhere(),
    orderBy: [
      { pinnedTop: "desc" },
      { pinnedUntil: { sort: "desc", nulls: "last" } },
      { destacada: "desc" },
      { fechaAprobacion: "desc" },
    ],
    take: 30,
  });

  const serialized = noticias.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    resumen: n.resumen,
    urlFuente: n.urlFuente,
    fuente: n.fuente,
    fuenteNombre: n.fuenteNombre,
    categoria: n.categoria,
    rama: n.rama,
    imagenUrl: n.imagenUrl,
    destacada: n.destacada,
    fechaAprobacion: n.fechaAprobacion?.toISOString() ?? null,
    fechaPublicacionFuente: n.fechaPublicacionFuente?.toISOString() ?? null,
    pinnedUntil: n.pinnedUntil?.toISOString() ?? null,
    pinnedTop: n.pinnedTop,
  }));

  return (
    <main>
      <NoticiasClient initialNoticias={serialized} />
    </main>
  );
}
