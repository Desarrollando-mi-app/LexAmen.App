"use client";

// Detecta URLs http(s) en un texto plano y devuelve nodos React con
// las URLs como <a target="_blank"> editorial (gold underline).
// Si el URL es interno (`/dashboard/noticias/[id]`), abre en SPA.

import Link from "next/link";

const URL_REGEX = /(https?:\/\/[^\s<>"'\)]+)/g;

function isInternalNoticia(url: string): { id: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/dashboard\/noticias\/([a-zA-Z0-9_-]+)\/?$/);
    if (m) return { id: m[1] };
    return null;
  } catch {
    return null;
  }
}

export function LinkifiedText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          // URL match
          const cleaned = part.replace(/[.,;:!?\]\)]+$/, "");
          const trailing = part.slice(cleaned.length);
          const internal = isInternalNoticia(cleaned);
          if (internal) {
            return (
              <span key={i}>
                <Link
                  href={`/dashboard/noticias/${internal.id}`}
                  className="text-gz-burgundy underline decoration-gz-burgundy/40 underline-offset-[3px] hover:text-gz-gold hover:decoration-gz-gold transition-colors break-all"
                >
                  {cleaned}
                </Link>
                {trailing}
              </span>
            );
          }
          return (
            <span key={i}>
              <a
                href={cleaned}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gz-gold underline decoration-gz-gold/40 underline-offset-[3px] hover:text-gz-burgundy hover:decoration-gz-burgundy transition-colors break-all"
              >
                {cleaned}
              </a>
              {trailing}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
