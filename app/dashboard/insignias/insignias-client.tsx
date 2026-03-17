"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

// ─── Types ──────────────────────────────────────────────

interface BadgeInfo {
  slug: string;
  label: string;
  emoji: string;
  description: string;
  tier: "bronze" | "silver" | "gold" | "special" | "unique";
  earned: boolean;
  earnedAt: string | null;
  xpRequired?: number;
}

interface CategoryInfo {
  key: string;
  label: string;
  emoji: string;
  badges: BadgeInfo[];
  earned: number;
  total: number;
}

interface InsigniasData {
  categories: CategoryInfo[];
  totalEarned: number;
  totalBadges: number;
  currentGrado: number;
  currentXp: number;
}

// ─── Tier styles ────────────────────────────────────────

const TIER_BORDER: Record<string, string> = {
  bronze: "border-l-2 border-amber-600",
  silver: "border-l-2 border-gray-400",
  gold: "border-l-2 border-yellow-400",
  special: "border-l-2 border-purple-500",
  unique: "border-l-2 border-gz-gold-bright",
};

const TIER_LABEL: Record<string, string> = {
  bronze: "Bronce",
  silver: "Plata",
  gold: "Oro",
  special: "Especial",
  unique: "Único",
};

// ─── Loading skeleton ───────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 py-8">
        <div className="mb-8 animate-pulse">
          <div className="h-3 w-28 bg-gz-rule/40 rounded mb-3" />
          <div className="h-10 w-56 bg-gz-rule/40 rounded mb-4" />
          <div className="h-[2px] bg-gz-rule/40 mb-6" />
          <div className="h-4 w-48 bg-gz-rule/30 rounded mb-2" />
          <div className="h-2 w-full bg-gz-rule/20 rounded-full" />
        </div>
        <div className="border border-gz-rule/30 rounded-[4px] p-5 mb-8 animate-pulse">
          <div className="h-3 w-24 bg-gz-rule/30 rounded mb-2" />
          <div className="h-8 w-32 bg-gz-rule/30 rounded mb-1" />
          <div className="h-3 w-20 bg-gz-rule/20 rounded" />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="border border-gz-rule/30 rounded-[4px] p-4 mb-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 bg-gz-rule/30 rounded" />
              <div className="h-5 w-40 bg-gz-rule/30 rounded" />
              <div className="flex-1" />
              <div className="h-4 w-16 bg-gz-rule/20 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Category section ───────────────────────────────────

function CategorySection({
  category,
  expanded,
  onToggle,
  currentXp,
}: {
  category: CategoryInfo;
  expanded: boolean;
  onToggle: () => void;
  currentXp: number;
}) {
  const progress =
    category.total > 0
      ? Math.round((category.earned / category.total) * 100)
      : 0;

  return (
    <div className="border border-gz-rule rounded-[4px] mb-3 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gz-cream-dark/30 transition-colors text-left"
      >
        <span className="text-[22px]">{category.emoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="font-cormorant text-[20px] font-bold text-gz-ink leading-tight">
            {category.label}
          </h2>
        </div>
        <span className="font-ibm-mono text-[11px] text-gz-ink-mid shrink-0">
          {category.earned}/{category.total}
        </span>
        {/* Mini progress bar */}
        <div className="w-16 h-1.5 bg-gz-rule/30 rounded-full overflow-hidden shrink-0 hidden sm:block">
          <div
            className="h-full bg-gz-gold-bright rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <svg
          className={`w-4 h-4 text-gz-ink-mid shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gz-rule px-4 py-2">
          {category.badges.map((badge) => (
            <BadgeRow
              key={badge.slug}
              badge={badge}
              currentXp={currentXp}
              isGradoCategory={category.key === "grados"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Badge row ──────────────────────────────────────────

function BadgeRow({
  badge,
  currentXp,
  isGradoCategory,
}: {
  badge: BadgeInfo;
  currentXp: number;
  isGradoCategory: boolean;
}) {
  const isCurrentGrado =
    isGradoCategory &&
    badge.xpRequired !== undefined &&
    badge.earned &&
    !badge.slug.startsWith("NIVEL_");

  // Find if this is the next locked grado badge
  const isNextGrado =
    isGradoCategory &&
    !badge.earned &&
    badge.xpRequired !== undefined &&
    badge.xpRequired > 0 &&
    !badge.slug.startsWith("NIVEL_");

  const xpProgress =
    isNextGrado && badge.xpRequired
      ? Math.min((currentXp / badge.xpRequired) * 100, 100)
      : 0;

  return (
    <div
      className={`flex items-start gap-3 py-3 border-b border-gz-cream-dark last:border-b-0 pl-2 ${
        TIER_BORDER[badge.tier] || ""
      } ${!badge.earned ? "opacity-60" : ""}`}
    >
      {/* Status icon + emoji */}
      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        {badge.earned ? (
          <span className="text-[20px]">{badge.emoji}</span>
        ) : (
          <span className="text-[20px] grayscale">
            {badge.emoji}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p
            className={`font-archivo text-[13px] font-semibold ${
              badge.earned ? "text-gz-ink" : "text-gz-ink-light"
            }`}
          >
            {badge.label}
          </p>
          {isCurrentGrado && (
            <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] px-1.5 py-0.5 rounded-sm bg-gz-gold/10 text-gz-gold whitespace-nowrap">
              Tu grado
            </span>
          )}
          <span
            className={`font-ibm-mono text-[8px] uppercase tracking-[1px] px-1.5 py-0.5 rounded-sm shrink-0 ${
              badge.earned
                ? "bg-[var(--gz-gold)]/[0.12] text-gz-gold"
                : "bg-gz-cream-dark text-gz-ink-light"
            }`}
          >
            {badge.earned ? "Obtenido" : "Bloqueado"}
          </span>
        </div>
        <p
          className={`text-[11px] mt-0.5 ${
            badge.earned ? "text-gz-ink-mid" : "text-gz-ink-light"
          }`}
        >
          {badge.description}
        </p>

        {/* Earned date */}
        {badge.earned && badge.earnedAt && (
          <p className="font-ibm-mono text-[9px] text-gz-ink-light mt-1">
            Obtenido el{" "}
            {new Date(badge.earnedAt).toLocaleDateString("es-CL", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}

        {/* XP progress for next locked grado */}
        {isNextGrado && badge.xpRequired && (
          <div className="mt-1.5">
            <div className="flex items-center gap-2 mb-0.5">
              <div className="flex-1 h-1.5 bg-gz-rule/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gz-gold-bright/60 rounded-full transition-all"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <span className="font-ibm-mono text-[9px] text-gz-ink-light shrink-0">
                {currentXp.toLocaleString()}/{badge.xpRequired.toLocaleString()}{" "}
                XP
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tier indicator */}
      <span className="font-ibm-mono text-[8px] uppercase tracking-[1px] text-gz-ink-light shrink-0 mt-1 hidden sm:block">
        {TIER_LABEL[badge.tier]}
      </span>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────

export function InsigniasClient() {
  const [data, setData] = useState<InsigniasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "grados"
  );

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => {
        if (!r.ok) throw new Error("Error al cargar insignias");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Error desconocido");
        setLoading(false);
      });
  }, []);

  if (loading || (!data && !error)) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-10 py-8">
          <div className="bg-gz-burgundy/5 border border-gz-burgundy/20 rounded-[4px] p-6 text-center">
            <p className="font-archivo text-[14px] text-gz-burgundy mb-2">
              {error}
            </p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                fetch("/api/badges")
                  .then((r) => r.json())
                  .then((d) => {
                    setData(d);
                    setLoading(false);
                  })
                  .catch(() => {
                    setError("Error al cargar insignias");
                    setLoading(false);
                  });
              }}
              className="font-archivo text-[12px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 hover:text-gz-ink hover:border-gz-ink transition-colors"
            >
              Reintentar &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const globalProgress = Math.round(
    (data.totalEarned / data.totalBadges) * 100
  );

  return (
    <div className="gz-page min-h-screen bg-[var(--gz-cream)]">
      <div className="max-w-[1280px] mx-auto px-4 lg:px-10 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
              Reconocimientos
            </p>
          </div>
          <div className="flex items-center gap-3 mb-1">
            <Image
              src="/brand/logo-sello.svg"
              alt="Studio Iuris"
              width={80}
              height={80}
              className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
            />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-none">
              Mis Insignias
            </h1>
          </div>
          <p className="font-cormorant text-[16px] italic text-gz-ink-mid mt-1">
            Hitos y reconocimientos de tu camino en la preparaci&oacute;n del
            examen de grado
          </p>
          <div className="h-[2px] bg-gz-ink mt-3" />
        </div>

        {/* Global progress */}
        <div className="mb-8 animate-gz-slide-up">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="font-cormorant text-[28px] font-bold text-gz-ink">
              {data.totalEarned}
            </span>
            <span className="font-archivo text-[14px] text-gz-ink-mid">
              / {data.totalBadges} insignias obtenidas
            </span>
          </div>
          <div className="w-full h-2 bg-gz-rule/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-gz-gold-bright rounded-full transition-all"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
          <p className="font-ibm-mono text-[11px] text-gz-ink-mid mt-1">
            {globalProgress}%
          </p>
        </div>

        {/* Grado actual highlight */}
        <div
          className="border border-gz-rule rounded-[4px] p-5 mb-8 bg-white animate-gz-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold mb-1">
            Tu grado actual
          </p>
          <p className="font-cormorant text-[28px] font-bold text-gz-ink">
            Grado {data.currentGrado}
          </p>
          <p className="font-archivo text-[13px] text-gz-ink-mid">
            {data.currentXp.toLocaleString()} XP totales
          </p>
        </div>

        {/* Categories accordion */}
        <div
          className="animate-gz-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          {data.categories.map((cat) => (
            <CategorySection
              key={cat.key}
              category={cat}
              expanded={expandedCategory === cat.key}
              onToggle={() =>
                setExpandedCategory(
                  expandedCategory === cat.key ? null : cat.key
                )
              }
              currentXp={data.currentXp}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
