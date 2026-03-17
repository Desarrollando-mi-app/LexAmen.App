import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  BADGE_RULES,
  BADGE_CATEGORIES,
  GRADO_THRESHOLDS,
  calculateGrado,
} from "@/lib/badge-constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return Response.json({ error: "No auth" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { xp: true, grado: true },
  });

  const earnedBadges = await prisma.userBadge.findMany({
    where: { userId: authUser.id },
    select: { badge: true, earnedAt: true },
  });

  const earnedMap = new Map(earnedBadges.map((b) => [b.badge, b.earnedAt]));
  const currentGrado = user ? calculateGrado(user.xp) : 1;

  // Build response grouped by category
  const categories = Object.entries(BADGE_CATEGORIES).map(([key, meta]) => {
    const badges = BADGE_RULES.filter((b) => b.category === key).map((b) => ({
      slug: b.slug,
      label: b.label,
      emoji: b.emoji,
      description: b.description,
      tier: b.tier,
      earned: earnedMap.has(b.slug),
      earnedAt: earnedMap.get(b.slug) || null,
      // For grado badges, add XP info
      ...(b.check?.type === "grado_reached" && {
        xpRequired: GRADO_THRESHOLDS[b.check.threshold as number] || 0,
      }),
    }));

    const earned = badges.filter((b) => b.earned).length;
    return {
      key,
      ...meta,
      badges,
      earned,
      total: badges.length,
    };
  });

  const totalEarned = categories.reduce((s, c) => s + c.earned, 0);
  const totalBadges = categories.reduce((s, c) => s + c.total, 0);

  return Response.json({
    categories,
    totalEarned,
    totalBadges,
    currentGrado,
    currentXp: user?.xp || 0,
  });
}
