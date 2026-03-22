/**
 * Plan utilities — centralized logic for checking user plan restrictions.
 * Admins are always treated as premium regardless of their plan field.
 */

export function isFreePlan(user: { plan: string; isAdmin?: boolean }): boolean {
  if (user.isAdmin) return false; // Admins never have free restrictions
  return user.plan === "FREE";
}

export function isPremium(user: { plan: string; isAdmin?: boolean }): boolean {
  return !isFreePlan(user);
}
