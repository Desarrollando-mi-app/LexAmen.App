import Link from "next/link";
import { LogoutButton } from "../logout-button";
import { NotificationBell } from "./notification-bell";
import { PageTitle } from "./page-title";
import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { HeaderAvatar } from "./header-avatar";

interface DashboardHeaderProps {
  userName: string;
  userId: string;
  avatarUrl: string | null;
  userTier: string;
  tierEmoji: string;
  isAdmin: boolean;
}

export function DashboardHeader({
  userName,
  userId,
  avatarUrl,
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
        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && (
            <Link
              href="/admin"
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
          <Link
            href="/dashboard/diario"
            className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/15 transition-colors hidden sm:inline-flex"
          >
            📰 El Diario
          </Link>
          <Link
            href="/dashboard/ranking"
            className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/15 transition-colors hidden sm:inline-flex"
          >
            🏛️ Ranking
          </Link>
          <Link
            href="/dashboard/simulacro"
            className="rounded-full bg-navy/10 px-3 py-1 text-xs font-semibold text-navy hover:bg-navy/15 transition-colors hidden lg:inline-flex"
          >
            🎙️ Simulacro
          </Link>
          <GlobalSearch />
          <NotificationBell />
          <ThemeToggle />
          <span className="hidden sm:inline text-sm text-navy/70 truncate max-w-[120px]">
            {userName}
          </span>
          <HeaderAvatar userId={userId} firstName={userName} avatarUrl={avatarUrl} />
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
