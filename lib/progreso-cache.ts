import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getCachedProgreso(userId: string): Promise<Prisma.JsonValue | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { progresoCache: true, progresoCacheAt: true },
  });

  if (user?.progresoCache && user?.progresoCacheAt &&
      Date.now() - user.progresoCacheAt.getTime() < CACHE_TTL_MS) {
    return user.progresoCache;
  }
  return null;
}

export async function saveCachedProgreso(userId: string, data: Prisma.InputJsonValue): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { progresoCache: data, progresoCacheAt: new Date() },
  });
}

export async function invalidateProgresoCache(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { progresoCacheAt: null },
  });
}
