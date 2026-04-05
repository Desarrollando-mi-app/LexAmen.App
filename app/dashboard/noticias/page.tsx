import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NoticiasClient } from "./noticias-client";
import Image from "next/image";

export default async function NoticiasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch first page of approved noticias
  const noticias = await prisma.noticiaJuridica.findMany({
    where: { estado: "aprobada" },
    orderBy: { fechaAprobacion: "desc" },
    take: 20,
  });

  // Get distinct fuentes and categorias for filter dropdowns
  const fuentes = await prisma.noticiaJuridica.findMany({
    where: { estado: "aprobada" },
    distinct: ["fuente"],
    select: { fuente: true, fuenteNombre: true },
  });

  const categorias = await prisma.noticiaJuridica.findMany({
    where: { estado: "aprobada", categoria: { not: null } },
    distinct: ["categoria"],
    select: { categoria: true },
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
  }));

  return (
    <main
      className="gz-page min-h-screen"
      style={{ backgroundColor: "var(--gz-cream)" }}
    >
      {/* Gazette-style header */}
      <header className="mx-auto max-w-[1280px] px-4 lg:px-10 pt-8 pb-4">
        <div className="flex items-center gap-3 mb-2">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={32}
            height={32}
            className="h-7 w-7 opacity-60"
          />
          <div>
            <h1 className="font-cormorant text-[28px] lg:text-[34px] !font-bold text-gz-ink leading-none">
              Noticias Jur&iacute;dicas
            </h1>
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-ink-light mt-1">
              Actualidad legislativa y jurisprudencial de Chile
            </p>
          </div>
        </div>
        <div className="h-[2px] bg-gz-ink mt-3" />
        <div className="mt-[3px] h-px bg-gz-ink" />
      </header>

      <NoticiasClient
        initialNoticias={serialized}
        fuentes={fuentes.map((f) => ({
          value: f.fuente,
          label: f.fuenteNombre,
        }))}
        categorias={categorias
          .map((c) => c.categoria)
          .filter((c): c is string => c !== null)}
      />
    </main>
  );
}
