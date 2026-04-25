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

  // Vigencia: TTL 48h estándar (la lógica de pinning se reactivará una
  // vez que la migración 20260425_noticia_contenido_pinned esté aplicada
  // en producción — ver lib/noticias-ttl.ts).
  const noticias = await prisma.noticiaJuridica.findMany({
    where: noticiasVigentesWhere(),
    orderBy: [{ destacada: "desc" }, { fechaAprobacion: "desc" }],
    take: 30,
    select: {
      id: true,
      titulo: true,
      resumen: true,
      urlFuente: true,
      fuente: true,
      fuenteNombre: true,
      categoria: true,
      rama: true,
      imagenUrl: true,
      destacada: true,
      fechaAprobacion: true,
      fechaPublicacionFuente: true,
    },
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
    pinnedUntil: null,
    pinnedTop: false,
  }));

  return (
    <main>
      <NoticiasClient initialNoticias={serialized} />
    </main>
  );
}
