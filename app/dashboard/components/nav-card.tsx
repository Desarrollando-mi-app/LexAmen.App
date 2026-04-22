import Link from "next/link";

// ─── Entrenamiento sub-items ────────────────────────────────

const ENTRENAMIENTO_ITEMS = [
  { href: "/dashboard/flashcards", label: "Flashcards" },
  { href: "/dashboard/mcq", label: "MCQ" },
  { href: "/dashboard/truefalse", label: "V/F" },
];

const MAIN_MODULES = [
  {
    href: "/dashboard/simulacro",
    icon: "🎙️",
    label: "Simulacro",
  },
  {
    href: "/dashboard/causas",
    icon: "⚔️",
    label: "Causas",
  },
  {
    href: "/dashboard/sala/ayudantias",
    icon: "🏛️",
    label: "Ayudantías",
  },
];

export function NavCard() {
  return (
    <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden h-full flex flex-col">
      {/* ── Entrenamiento section ───────────────────── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📚</span>
          <span className="text-sm font-semibold text-navy font-cormorant">
            Entrenamiento
          </span>
        </div>
        <div className="space-y-0.5 pl-7">
          {ENTRENAMIENTO_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-[3px] px-3 py-2 text-xs text-navy/70 transition-colors hover:bg-navy/5 hover:text-navy group"
            >
              <span className="flex items-center gap-2">
                <span className="text-navy/30">·</span>
                {item.label}
              </span>
              <svg
                className="h-3.5 w-3.5 text-navy/15 group-hover:text-gold/60 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main modules ───────────────────────────── */}
      {MAIN_MODULES.map((item) => (
        <div key={item.href}>
          <div className="border-t border-gz-rule/30 mx-4" />
          <Link
            href={item.href}
            className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-navy/5 group"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm font-semibold text-navy group-hover:text-gold transition-colors font-cormorant">
                {item.label}
              </span>
            </div>
            <svg
              className="h-4 w-4 text-navy/15 group-hover:text-gold/60 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        </div>
      ))}
    </div>
  );
}
