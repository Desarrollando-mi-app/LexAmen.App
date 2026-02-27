import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "../logout-button";
import { FlashcardViewer } from "./flashcard-viewer";

const DAILY_FREE_LIMIT = 30;

export default async function FlashcardsPage() {
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
    select: { firstName: true, plan: true },
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
    unidad: fc.unidad,
    materia: fc.materia,
    submateria: fc.submateria,
    tipo: fc.tipo,
    nivel: fc.nivel,
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

  // 6. Extraer materias, submaterias y niveles únicos
  const materias = Array.from(new Set(rawFlashcards.map((fc) => fc.materia)));
  const submaterias = Array.from(new Set(rawFlashcards.map((fc) => fc.submateria)));
  const niveles = Array.from(new Set(rawFlashcards.map((fc) => fc.nivel)));

  return (
    <main className="min-h-screen bg-paper">
      {/* Header */}
      <header className="border-b border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-navy hover:text-navy/80">
            LéxAmen
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-navy/70">{dbUser.firstName}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        <FlashcardViewer
          flashcards={flashcards}
          favoriteIds={favoriteIds}
          materias={materias}
          submaterias={submaterias}
          niveles={niveles}
          reviewsToday={reviewsToday}
          dailyLimit={DAILY_FREE_LIMIT}
          isPremium={dbUser.plan !== "FREE"}
        />
      </div>
    </main>
  );
}
