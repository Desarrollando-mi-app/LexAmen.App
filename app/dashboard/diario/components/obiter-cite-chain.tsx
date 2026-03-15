"use client";

import Link from "next/link";
import { useState } from "react";
import type { ObiterData } from "../types/obiter";
import { parseObiterContent } from "@/lib/legal-reference-parser";
import { ObiterLegalRef } from "./obiter-legal-ref";

// ─── Types ──────────────────────────────────────────────────

type CitationItem = {
  id: string;
  content: string;
  createdAt: string;
  apoyosCount: number;
  citasCount: number;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
};

type ObiterCiteChainProps = {
  originalObiter: ObiterData;
  citations: CitationItem[];
  currentUserId: string | null;
  onApoyar: (id: string) => void;
  onCitar: (obiter: ObiterData) => void;
};

// ─── Rendered Content ───────────────────────────────────────

function RenderedContentInline({ content }: { content: string }) {
  const parsed = parseObiterContent(content);

  return (
    <>
      {parsed.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.value}</span>;
        }
        return (
          <ObiterLegalRef
            key={i}
            article={segment.article}
            code={segment.code}
            originalText={segment.original}
          />
        );
      })}
    </>
  );
}

// ─── Mini Citation Card ─────────────────────────────────────

function CitationMiniCard({
  citation,
  level,
}: {
  citation: CitationItem;
  level: number;
}) {
  // Indent levels: 0, 1, 2 (max visual)
  const mlClass = level === 0 ? "ml-0" : level === 1 ? "ml-6" : "ml-12";
  const borderColorClass =
    level === 0
      ? "border-gz-gold"
      : level === 1
        ? "border-gz-rule"
        : "border-gz-cream-dark";

  return (
    <div className={`${mlClass} mb-3 border-l-2 ${borderColorClass} pl-4`}>
      <div className="py-3">
        {/* Author */}
        <Link
          href={`/dashboard/perfil/${citation.user.id ?? ""}`}
          className="font-archivo text-[12px] font-semibold text-gz-ink hover:text-gz-gold transition-colors"
        >
          {citation.user.firstName} {citation.user.lastName}
        </Link>

        {/* Content */}
        <div className="mt-1 line-clamp-3 font-cormorant text-[15px] text-gz-ink-mid">
          <RenderedContentInline content={citation.content} />
        </div>

        {/* Mini actions */}
        <div className="mt-2 flex items-center gap-0 font-ibm-mono text-[10px] tracking-[0.5px] text-gz-ink-light">
          <span>Apoyar {citation.apoyosCount}</span>
          <span className="mx-1.5 text-gz-ink-light/30">·</span>
          <span>Citar {citation.citasCount}</span>
          <span className="mx-1.5 text-gz-ink-light/30">·</span>
          <Link
            href={`/dashboard/diario/obiter/${citation.id}`}
            className="text-gz-gold transition-colors hover:text-gz-ink"
          >
            Ver →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────

export function ObiterCiteChain({
  citations,
}: ObiterCiteChainProps) {
  const [showAll, setShowAll] = useState(false);

  if (citations.length === 0) return null;

  const INITIAL_SHOW = 5;
  const visibleCitations = showAll
    ? citations
    : citations.slice(0, INITIAL_SHOW);
  const remainingCount = citations.length - INITIAL_SHOW;

  return (
    <div>
      {/* Section header */}
      <div className="my-4 flex items-center gap-3">
        <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          Debate · {citations.length}{" "}
          {citations.length === 1 ? "cita" : "citas"}
        </span>
        <div className="h-px flex-1 bg-gz-rule" />
      </div>

      {/* Citations (all level 0 since we only have direct citations from the API) */}
      {visibleCitations.map((citation) => (
        <CitationMiniCard key={citation.id} citation={citation} level={0} />
      ))}

      {/* Show more */}
      {!showAll && remainingCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 inline-block border-b border-gz-gold pb-0.5 font-archivo text-[12px] text-gz-gold transition-colors hover:text-gz-ink"
        >
          Ver {remainingCount} {remainingCount === 1 ? "cita" : "citas"} más →
        </button>
      )}
    </div>
  );
}
