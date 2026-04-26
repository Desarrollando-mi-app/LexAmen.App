// ─── OG Link Preview ────────────────────────────────────────
//
// Detecta URLs en un texto y obtiene metadata Open Graph para mostrarlas
// como tarjetas de previsualización (en obiters principalmente).
//
// Estrategia:
//   - URLs internas /dashboard/noticias/[id] → query a la DB (rápido).
//   - URLs externas → fetch con timeout corto (3s) y parseo simple de
//     <meta og:*> y <title>. Si falla, devolvemos solo la URL.
//
// Limites:
//   - Máximo 2 URLs procesadas por publicación (para no abusar).
//   - Timeout de 3s por URL.
//   - User-Agent custom para que sitios responsables nos sirvan.

import { prisma } from "@/lib/prisma";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  kind: "noticia" | "external";
}

const MAX_URLS_PER_POST = 2;
const FETCH_TIMEOUT_MS = 3000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; StudioIuris-LinkPreview/1.0; +https://studioiuris.cl)";

// Regex para URLs http/https en texto. No es perfecto pero captura los
// casos comunes (http(s)://dominio[/path][?query][#frag]).
const URL_REGEX = /https?:\/\/[^\s<>"'\)]+/gi;

/**
 * Extrae URLs únicas de un texto, limitadas a MAX_URLS_PER_POST.
 */
export function extractUrls(content: string): string[] {
  if (!content) return [];
  const matches = content.match(URL_REGEX) ?? [];
  // Dedupe y limpia trailing punctuation común
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?\]\)]+$/, "");
    if (!seen.has(cleaned)) {
      seen.add(cleaned);
      out.push(cleaned);
      if (out.length >= MAX_URLS_PER_POST) break;
    }
  }
  return out;
}

/**
 * Detecta si una URL apunta a una noticia interna del Studio Iuris.
 * Devuelve el id de la noticia o null.
 */
function parseInternalNoticiaId(url: string): string | null {
  try {
    const u = new URL(url);
    // Aceptamos cualquier host porque puede venir el dominio público.
    const m = u.pathname.match(/^\/dashboard\/noticias\/([a-zA-Z0-9_-]+)\/?$/);
    if (m) return m[1];
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch con timeout. Si pasa el plazo, aborta.
 */
async function fetchWithTimeout(url: string, ms: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      // Restringir tamaño es difícil sin streams; confiamos en el timeout.
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extrae meta og: + <title> de un fragmento de HTML. Acepta solo los
 * primeros N kilobytes para evitar parsear páginas gigantes.
 */
function parseHtmlMeta(html: string): Partial<LinkPreview> {
  const head = html.slice(0, 100_000); // primeros ~100KB

  function metaTag(prop: string): string | null {
    // og:title, og:image, etc. (property="..." content="...")
    const re = new RegExp(
      `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["'][^>]*content\\s*=\\s*["']([^"']+)["']`,
      "i",
    );
    const m1 = head.match(re);
    if (m1) return decodeHtmlEntities(m1[1]);
    // Variante con content antes
    const reAlt = new RegExp(
      `<meta[^>]+content\\s*=\\s*["']([^"']+)["'][^>]*(?:property|name)\\s*=\\s*["']${prop.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}["']`,
      "i",
    );
    const m2 = head.match(reAlt);
    if (m2) return decodeHtmlEntities(m2[1]);
    return null;
  }

  function titleTag(): string | null {
    const m = head.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m ? decodeHtmlEntities(m[1].trim()) : null;
  }

  return {
    title: metaTag("og:title") ?? metaTag("twitter:title") ?? titleTag(),
    description:
      metaTag("og:description") ??
      metaTag("twitter:description") ??
      metaTag("description"),
    image: metaTag("og:image") ?? metaTag("twitter:image"),
    siteName: metaTag("og:site_name"),
  };
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Resuelve image relativa vs absoluta usando la URL base.
 */
function resolveUrl(maybeRelative: string, base: string): string {
  try {
    return new URL(maybeRelative, base).toString();
  } catch {
    return maybeRelative;
  }
}

/**
 * Obtiene preview para una URL. Para URLs internas de noticias, usa la DB.
 * Para externas, fetch + parse OG. Devuelve null si nada útil pudo
 * extraerse (caller debe decidir si guardar igual el { url } solo).
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  // Caso 1 — noticia interna
  const noticiaId = parseInternalNoticiaId(url);
  if (noticiaId) {
    try {
      const noticia = await prisma.noticiaJuridica.findUnique({
        where: { id: noticiaId },
        select: {
          id: true,
          titulo: true,
          resumen: true,
          imagenUrl: true,
          fuenteNombre: true,
          fechaAprobacion: true,
        },
      });
      if (noticia) {
        return {
          url,
          title: noticia.titulo,
          description: noticia.resumen ? noticia.resumen.slice(0, 240) : null,
          image: noticia.imagenUrl ?? null,
          siteName: noticia.fuenteNombre ?? "La Gaceta · Studio Iuris",
          kind: "noticia",
        };
      }
    } catch {
      // DB falló, seguimos al fallback básico
    }
    // Si no encontramos la noticia, devolvemos preview minimal
    return {
      url,
      title: "Noticia jurídica",
      description: null,
      image: null,
      siteName: "Studio Iuris",
      kind: "noticia",
    };
  }

  // Caso 2 — URL externa: fetch + parse
  const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
  if (!res || !res.ok) {
    return { url, title: null, description: null, image: null, siteName: null, kind: "external" };
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    return { url, title: null, description: null, image: null, siteName: null, kind: "external" };
  }
  let html: string;
  try {
    html = await res.text();
  } catch {
    return { url, title: null, description: null, image: null, siteName: null, kind: "external" };
  }
  const meta = parseHtmlMeta(html);
  const finalUrl = res.url || url;
  return {
    url: finalUrl,
    title: meta.title ?? null,
    description: meta.description ? meta.description.slice(0, 240) : null,
    image: meta.image ? resolveUrl(meta.image, finalUrl) : null,
    siteName: meta.siteName ?? new URL(finalUrl).hostname.replace(/^www\./, ""),
    kind: "external",
  };
}

/**
 * Procesa un texto: detecta URLs, obtiene previews en paralelo (con
 * timeout colectivo razonable), y devuelve el array. Falla silenciosa.
 */
export async function buildPreviewsForContent(
  content: string,
): Promise<LinkPreview[]> {
  const urls = extractUrls(content);
  if (urls.length === 0) return [];

  const previews = await Promise.all(
    urls.map((u) =>
      fetchLinkPreview(u).catch(() => ({
        url: u,
        title: null,
        description: null,
        image: null,
        siteName: null,
        kind: "external" as const,
      })),
    ),
  );
  return previews.filter((p): p is LinkPreview => p !== null);
}

/**
 * Serializa para storage en JSON. Devuelve null si no hay previews
 * (para evitar guardar "[]" innecesariamente).
 */
export function serializeLinkPreviews(previews: LinkPreview[]): string | null {
  if (previews.length === 0) return null;
  return JSON.stringify(previews);
}

/**
 * Parsea desde storage. Si falla el JSON, devuelve [] para no romper la UI.
 */
export function parseLinkPreviews(raw: string | null | undefined): LinkPreview[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is LinkPreview => typeof x === "object" && x !== null && typeof x.url === "string");
  } catch {
    return [];
  }
}
