import Image from "next/image";
import { ProfileDropdown } from "./profile-dropdown";
import { NotificationBell } from "./notification-bell";
import { UserSearch } from "./user-search";

interface GzUserBarProps {
  userName: string;
  email: string;
  avatarUrl: string | null;
  streak: number;
  causasGanadas: number;
  tasaAcierto: number;
  grado: number;
  gradoNombre: string;
  isAdmin: boolean;
  userId: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GzUserBar({
  userName,
  email,
  avatarUrl,
  streak,
  causasGanadas,
  tasaAcierto,
  grado,
  gradoNombre,
  isAdmin,
  userId,
}: GzUserBarProps) {
  const initials = getInitials(userName);

  return (
    <div className="flex justify-between items-center px-4 lg:px-10 py-2.5 border-b border-gz-rule bg-[var(--gz-gold)]/[0.04]">
      {/* Left: avatar + profile dropdown + stats */}
      <div className="flex items-center gap-4">
        {/* Avatar (mobile only — desktop avatar is in ProfileDropdown) */}
        <div className="w-8 h-8 rounded-full bg-gz-navy flex items-center justify-center text-gz-gold-bright text-xs font-semibold shrink-0 overflow-hidden sm:hidden">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={userName}
              width={32}
              height={32}
              className="w-full h-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        {/* Profile dropdown */}
        <ProfileDropdown
          userName={userName}
          email={email}
          avatarUrl={avatarUrl}
          grado={grado}
          gradoNombre={gradoNombre}
          isAdmin={isAdmin}
          userId={userId}
        />

        {/* Notification bell — inmediately after profile dropdown */}
        <NotificationBell />

        {/* Stats — hidden on mobile */}
        <div className="hidden sm:flex items-center gap-5 ml-2">
          <div className="w-px h-5 bg-gz-rule" />
          <div data-streak-indicator className="font-ibm-mono text-[11px] text-gz-ink-mid flex items-center gap-1.5">
            🔥 <strong className="text-gz-ink text-[13px]">{streak}</strong> días de racha
          </div>
          <div className="font-ibm-mono text-[11px] text-gz-ink-mid flex items-center gap-1.5">
            🏆 <strong className="text-gz-ink text-[13px]">{causasGanadas}</strong> causas ganadas
          </div>
          <div className="font-ibm-mono text-[11px] text-gz-ink-mid flex items-center gap-1.5">
            📊 <strong className="text-gz-ink text-[13px]">{tasaAcierto}%</strong> acierto
          </div>
        </div>
      </div>

      {/* Right: user search */}
      <div className="flex items-center gap-2">
        <UserSearch />
      </div>
    </div>
  );
}
