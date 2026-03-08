import Link from "next/link";
import { LogoutButton } from "../logout-button";
import { NotificationBell } from "./notification-bell";
import { PageTitle } from "./page-title";
import { ThemeToggle } from "./theme-toggle";

interface DashboardHeaderProps {
  userName: string;
  userTier: string;
  tierEmoji: string;
  isAdmin: boolean;
}

export function DashboardHeader({
  userName,
  userTier,
  tierEmoji,
  isAdmin,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-white px-4 py-3">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-2">
        {/* Left: Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="text-xl font-bold text-navy font-display hover:text-navy/80 transition-colors shrink-0"
          >
            ⚖️ Iuris Studio
          </Link>
          <PageTitle />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {isAdmin && (
            <Link
              href="/dashboard/admin"
              className="inline-flex rounded-full bg-gold/20 px-2.5 py-1 text-[10px] font-semibold text-gold hover:bg-gold/30 transition-colors"
            >
              Panel Admin
            </Link>
          )}
          <Link
            href="/dashboard/liga"
            className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold hover:bg-gold/25 transition-colors"
          >
            {tierEmoji} {userTier}
          </Link>
          <NotificationBell />
          <ThemeToggle />
          <span className="hidden sm:inline text-sm text-navy/70 truncate max-w-[120px]">
            {userName}
          </span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
