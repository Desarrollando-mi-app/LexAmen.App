import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { FlashcardViewer } from "./flashcard-viewer";
import Image from "next/image";

const DAILY_FREE_LIMIT = 30;

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: {
    rama?: string;
    libro?: string;
    titulo?: string;
    dificultad?: string;
    mode?: string;
  };
}) {
  // 1. Autenticar
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // 2. Obtener usuario con plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, plan: true, isAdmin: true },
  });

  if (!dbUser) {
    redirect("/login");
  }

  // 3. Contar revisiones de hoy
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const reviewsToday = await prisma.userFlashcardProgress.count({
    where: {
      userId: authUser.id,
      lastReviewedAt: { gte: startOfToday },
    },
  });

  // 4. Obtener todas las flashcards con progreso del usuario + favoritos
  const [rawFlashcards, favorites] = await Promise.all([
    prisma.flashcard.findMany({
      include: {
        progress: {
          where: { userId: authUser.id },
          select: {
            nextReviewAt: true,
            easeFactor: true,
            interval: true,
            repetitions: true,
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.flashcardFavorite.findMany({
      where: { userId: authUser.id },
      select: { flashcardId: true },
    }),
  ]);

  const favoriteIds = favorites.map((f) => f.flashcardId);
  const favSet = new Set(favoriteIds);

  // 5. Serializar para el client component (Dates → ISO strings)
  const flashcards = rawFlashcards.map((fc) => ({
    id: fc.id,
    front: fc.front,
    back: fc.back,
    rama: fc.rama,
    codigo: fc.codigo,
    libro: fc.libro,
    titulo: fc.titulo,
    parrafo: fc.parrafo,
    leyAnexa: fc.leyAnexa,
    articuloRef: fc.articuloRef,
    dificultad: fc.dificultad,
    isFavorite: favSet.has(fc.id),
    progress: fc.progress[0]
      ? {
          nextReviewAt: fc.progress[0].nextReviewAt.toISOString(),
          easeFactor: fc.progress[0].easeFactor,
          interval: fc.progress[0].interval,
          repetitions: fc.progress[0].repetitions,
        }
      : null,
  }));

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
        {/* Gazette page header */}
        <div className="mb-6">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Repetici&oacute;n Espaciada &middot; SM-2
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">
              Flashcards
            </h1>
          </div>
          <div className="h-[2px] bg-gz-rule-dark" />
        </div>
        <FlashcardViewer
          flashcards={flashcards}
          favoriteIds={favoriteIds}
          reviewsToday={reviewsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE" || dbUser.isAdmin}
          initialFilters={{
            rama: searchParams.rama,
            libro: searchParams.libro,
            titulo: searchParams.titulo,
            dificultad: searchParams.dificultad,
            mode: searchParams.mode,
          }}
        />
      </div>
    </main>
  );
}
