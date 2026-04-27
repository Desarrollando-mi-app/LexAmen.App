"use client";

// Detecta URLs http(s), #hashtags y @menciones en un texto plano y los
// renderiza como nodos React. URLs externas → <a target="_blank">,
// noticias internas → <Link>, hashtags → <Link> al feed filtrado,
// menciones → <Link> al perfil del usuario por handle.

import Link from "next/link";

// Token compuesto que captura URL, hashtag o mención. El orden importa:
// URL primero (para no chocar con # o @ dentro de un href), luego
// hashtag, luego mención.
// Usamos string + new RegExp para evitar warnings de flags 'u'/\p{...}
// en builds con target ES5 implícito.
const URL_SRC = "https?:\\/\\/[^\\s<>\"')]+";
const HASHTAG_SRC = "#[\\p{L}\\p{N}_]{2,40}";
const MENTION_SRC = "@[a-zA-Z0-9_]{2,30}";
const TOKEN_RE = new RegExp(
  `(${URL_SRC}|${HASHTAG_SRC}|${MENTION_SRC})`,
  "gu",
);
const HASHTAG_TEST_RE = new RegExp("^#[\\p{L}\\p{N}_]{2,40}$", "u");
const MENTION_TEST_RE = new RegExp("^@[a-zA-Z0-9_]{2,30}$");

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
  const parts = text.split(TOKEN_RE);
  return (
    <>
      {parts.map((part, i) => {
        // Hashtag
        if (part.startsWith("#") && HASHTAG_TEST_RE.test(part)) {
          const tag = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/dashboard/diario?hashtag=${encodeURIComponent(tag)}`}
              className="font-archivo font-semibold text-gz-burgundy hover:text-gz-gold transition-colors cursor-pointer"
            >
              {part}
            </Link>
          );
        }
        // Mención
        if (part.startsWith("@") && MENTION_TEST_RE.test(part)) {
          const handle = part.slice(1).toLowerCase();
          return (
            <Link
              key={i}
              href={`/dashboard/perfil/@${handle}`}
              className="font-archivo font-semibold text-gz-navy hover:text-gz-gold transition-colors cursor-pointer"
            >
              {part}
            </Link>
          );
        }
        // URL
        if (part.startsWith("http://") || part.startsWith("https://")) {
          // Mover puntuación final fuera del link
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
        // Texto normal
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
