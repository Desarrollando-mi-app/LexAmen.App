// ─── Hashtags — extracción y registro ────────────────────
import { prisma } from "@/lib/prisma";

/** Extrae hashtags de un texto. Retorna array de strings sin #, lowercase, únicos */
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9_]+/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.slice(1).toLowerCase())));
}

/**
 * Registra hashtags en DB: upsert cada tag + crea join con el post.
 * Si un tag alcanza count >= 3 y no está hidden, se marca como contingencia.
 */
export async function registerHashtags(
  postId: string,
  tags: string[]
): Promise<void> {
  for (const tag of tags) {
    const hashtag = await prisma.diarioHashtag.upsert({
      where: { tag },
      update: { count: { increment: 1 } },
      create: { tag, count: 1 },
    });

    await prisma.diarioPostHashtag.create({
      data: { postId, hashtagId: hashtag.id },
    });

    // Auto-contingencia cuando alcanza 3 usos
    const newCount = hashtag.count + 1; // upsert update ya incrementó, pero leemos el valor previo
    if (newCount >= 3 && !hashtag.isContingencia && !hashtag.hidden) {
      await prisma.diarioHashtag.update({
        where: { id: hashtag.id },
        data: { isContingencia: true },
      });
    }
  }
}

/** Decrementa count de hashtags al borrar un post */
export async function unregisterHashtags(postId: string): Promise<void> {
  const joins = await prisma.diarioPostHashtag.findMany({
    where: { postId },
    select: { hashtagId: true },
  });

  for (const { hashtagId } of joins) {
    await prisma.diarioHashtag.update({
      where: { id: hashtagId },
      data: { count: { decrement: 1 } },
    });
  }

  await prisma.diarioPostHashtag.deleteMany({ where: { postId } });
}
