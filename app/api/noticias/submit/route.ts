import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/noticias/submit
 *
 * User submits a "Columna de Opinión" or "Carta al Director".
 * Creates a NoticiaJuridica with estado="pendiente" for admin review.
 * The urlFuente is set to a unique internal URL since there's no external source.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    titulo: string;
    contenido: string;
    categoria: string;
    rama?: string | null;
    categoriaSecundaria?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { titulo, contenido, categoria, rama, categoriaSecundaria } = body;

  if (!titulo || titulo.trim().length < 5) {
    return NextResponse.json({ error: "El título debe tener al menos 5 caracteres" }, { status: 400 });
  }
  if (!contenido || contenido.trim().length < 20) {
    return NextResponse.json({ error: "El contenido debe tener al menos 20 caracteres" }, { status: 400 });
  }
  if (!["columna_opinion", "carta_director"].includes(categoria)) {
    return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
  }

  // Get user name for attribution
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  const authorName = user
    ? `${user.firstName} ${user.lastName}`
    : "Usuario";

  // Create as pendiente noticia
  const noticia = await prisma.noticiaJuridica.create({
    data: {
      titulo: titulo.trim(),
      resumen: contenido.trim().substring(0, 500),
      urlFuente: `studio-iuris://user-submit/${authUser.id}/${Date.now()}`,
      fuente: "STUDIO_IURIS",
      fuenteNombre: `${authorName} — Studio Iuris`,
      categoria,
      rama: rama || null,
      estado: "pendiente",
      notasAdmin: categoriaSecundaria
        ? `Categoría secundaria: ${categoriaSecundaria}`
        : null,
    },
  });

  return NextResponse.json({ ok: true, id: noticia.id });
}
