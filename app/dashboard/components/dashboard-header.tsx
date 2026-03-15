import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";
import { GlobalSearch } from "./global-search";
import { AvatarDropdown } from "./avatar-dropdown";
import { HeaderCountdown } from "./header-countdown";

interface DashboardHeaderProps {
  userName: string;
  userId: string;
  avatarUrl: string | null;
  userTier: string;
  tierEmoji: string;
  isAdmin: boolean;
  examDate: string | null;
}

export function DashboardHeader({
  userName,
  userId,
  avatarUrl,
  isAdmin,
  examDate,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-gz-rule" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="mx-auto flex max-w-[1440px] items-center px-4 py-3">
        {/* Left: Theme toggle + Countdown */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <ThemeToggle />
          <div className="hidden sm:block">
            <HeaderCountdown serverExamDate={examDate} />
          </div>
        </div>

        {/* Center: Logo */}
        <div className="flex-1 flex justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={28}
              height={28}
              className="h-[28px] w-[28px]"
            />
            <span className="font-cormorant text-[18px] !font-bold text-gz-ink tracking-[1px]">
              Studio <span className="text-gz-red">Iuris</span>
            </span>
          </Link>
        </div>

        {/* Right: Search + Notifications + Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <GlobalSearch />
          <NotificationBell />
          <AvatarDropdown userId={userId} firstName={userName} avatarUrl={avatarUrl} isAdmin={isAdmin} />
        </div>
      </div>
    </header>
  );
}
