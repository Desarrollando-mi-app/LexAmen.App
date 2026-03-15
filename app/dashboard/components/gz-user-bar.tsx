import Image from "next/image";

interface GzUserBarProps {
  userName: string;
  avatarUrl: string | null;
  streak: number;
  causasGanadas: number;
  tasaAcierto: number;
}

function getSaludo(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
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
  avatarUrl,
  streak,
  causasGanadas,
  tasaAcierto,
}: GzUserBarProps) {
  const saludo = getSaludo();
  const initials = getInitials(userName);

  return (
    <div className="flex justify-between items-center px-4 lg:px-10 py-2.5 border-b border-gz-rule bg-[var(--gz-gold)]/[0.04]">
      {/* Left: avatar + greeting */}
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-gz-navy flex items-center justify-center text-gz-gold-bright text-xs font-semibold shrink-0 overflow-hidden">
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
        <span className="font-cormorant text-[15px] font-semibold text-gz-ink">
          {saludo}, {userName}
        </span>
      </div>

      {/* Right: stats */}
      <div className="hidden sm:flex items-center gap-5">
        <div className="font-ibm-mono text-[11px] text-gz-ink-mid flex items-center gap-1.5">
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
  );
}
