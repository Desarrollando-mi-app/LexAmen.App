import { prisma } from "@/lib/prisma";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawNewsItem {
  titulo: string;
  url: string;
  resumen?: string;
  fecha?: Date;
  imagenUrl?: string;
}

export const NEWS_SOURCES = [
  {
    id: "BCN",
    nombre: "Biblioteca del Congreso Nacional",
    tipo: "rss" as const,
    url: "https://www.bcn.cl/leychile/rss",
    categoria: "normativa",
  },
  {
    id: "BCN_BOLETIN",
    nombre: "BCN — Boletín Legislativo",
    tipo: "rss" as const,
    url: "https://www.bcn.cl/laborparlamentaria/rss",
    categoria: "nueva_ley",
  },
  {
    id: "PODER_JUDICIAL",
    nombre: "Poder Judicial de Chile",
    tipo: "scraping" as const,
    url: "https://www.pjud.cl/prensa-y-comunicaciones/noticias-del-poder-judicial",
    categoria: "sentencia",
  },
  {
    id: "TC",
    nombre: "Tribunal Constitucional",
    tipo: "scraping" as const,
    url: "https://www.tribunalconstitucional.cl/prensa",
    categoria: "sentencia",
  },
  {
    id: "DIARIO_OFICIAL",
    nombre: "Diario Oficial",
    tipo: "scraping" as const,
    url: "https://www.diariooficial.interior.gob.cl/edicionelectronica/",
    categoria: "nueva_ley",
  },
  {
    id: "COLEGIO_ABOGADOS",
    nombre: "Colegio de Abogados de Chile",
    tipo: "scraping" as const,
    url: "https://colegioabogados.cl/novedades/noticias/",
    categoria: "gremial",
  },
];

// ─── RSS fetcher ──────────────────────────────────────────────────────────────

async function fetchRSS(url: string): Promise<RawNewsItem[]> {
  try {
    const RSSParser = (await import("rss-parser")).default;
    const parser = new RSSParser({ timeout: 15_000 });
    const feed = await parser.parseURL(url);
    return (feed.items || []).slice(0, 10).map((item) => ({
      titulo: item.title || "Sin título",
      url: item.link || "",
      resumen: item.contentSnippet?.substring(0, 500) || item.title || "",
      fecha: item.pubDate ? new Date(item.pubDate) : undefined,
    }));
  } catch {
    return [];
  }
}

// ─── PJUD scraper (confirmed HTML structure) ──────────────────────────────────

async function scrapePJUD(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      "https://www.pjud.cl/prensa-y-comunicaciones/noticias-del-poder-judicial",
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const items: RawNewsItem[] = [];

    $("a.jt-result-item").each((_, el) => {
      const href = $(el).attr("href");
      const titulo = $(el).find("h5").text().trim();
      const fechaStr = $(el).find("small").text().trim(); // "18-03-2026 09:03"

      if (titulo && href) {
        const url = href.startsWith("http")
          ? href
          : `https://www.pjud.cl${href}`;

        let fecha: Date | undefined;
        if (fechaStr) {
          const parts = fechaStr.split(" ")[0]?.split("-");
          if (parts && parts.length === 3) {
            const [d, m, y] = parts;
            const parsed = new Date(`${y}-${m}-${d}`);
            if (!isNaN(parsed.getTime())) fecha = parsed;
          }
        }

        items.push({ titulo, url, resumen: titulo, fecha });
      }
    });

    return items.slice(0, 10);
  } catch {
    return [];
  }
}

// ─── TC scraper ───────────────────────────────────────────────────────────────

async function scrapeTC(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch("https://www.tribunalconstitucional.cl/prensa", {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const items: RawNewsItem[] = [];

    // Try common patterns for news links
    $("article a, .noticia a, .news-item a, .lista-noticias a, .views-row a").each((_, el) => {
      const href = $(el).attr("href");
      const titulo = $(el).text().trim() || $(el).attr("title")?.trim();
      if (titulo && href && titulo.length > 10) {
        const url = href.startsWith("http")
          ? href
          : `https://www.tribunalconstitucional.cl${href}`;
        items.push({ titulo: titulo.substring(0, 300), url, resumen: titulo.substring(0, 300) });
      }
    });

    // Fallback: look for h2/h3 inside links
    if (items.length === 0) {
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const heading = $(el).find("h2, h3, h4").first().text().trim();
        if (heading && href && heading.length > 10) {
          const url = href.startsWith("http")
            ? href
            : `https://www.tribunalconstitucional.cl${href}`;
          items.push({ titulo: heading.substring(0, 300), url, resumen: heading.substring(0, 300) });
        }
      });
    }

    // Deduplicate by URL
    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Diario Oficial scraper ───────────────────────────────────────────────────

async function scrapeDiarioOficial(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(
      "https://www.diariooficial.interior.gob.cl/edicionelectronica/",
      { next: { revalidate: 0 } },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const items: RawNewsItem[] = [];

    // Look for links to editions or normas
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (
        href &&
        text &&
        text.length > 5 &&
        (href.includes("norma") ||
          href.includes("edicion") ||
          href.includes("publicacion") ||
          href.includes(".pdf"))
      ) {
        const url = href.startsWith("http")
          ? href
          : `https://www.diariooficial.interior.gob.cl${href.startsWith("/") ? "" : "/"}${href}`;
        items.push({
          titulo: text.substring(0, 300),
          url,
          resumen: text.substring(0, 300),
        });
      }
    });

    // Fallback: article or section headings
    if (items.length === 0) {
      $("h2 a, h3 a, .post-title a, .entry-title a").each((_, el) => {
        const href = $(el).attr("href");
        const titulo = $(el).text().trim();
        if (titulo && href) {
          const url = href.startsWith("http")
            ? href
            : `https://www.diariooficial.interior.gob.cl${href}`;
          items.push({ titulo: titulo.substring(0, 300), url, resumen: titulo.substring(0, 300) });
        }
      });
    }

    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Colegio de Abogados scraper ──────────────────────────────────────────────

async function scrapeColegioAbogados(): Promise<RawNewsItem[]> {
  try {
    const res = await fetch("https://colegioabogados.cl/novedades/noticias/", {
      next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const items: RawNewsItem[] = [];

    // WordPress-style patterns
    $("article a, .post a, .entry-title a, h2 a, h3 a, .post-title a").each(
      (_, el) => {
        const href = $(el).attr("href");
        const titulo = $(el).text().trim();
        if (titulo && href && titulo.length > 10 && href.startsWith("http")) {
          items.push({
            titulo: titulo.substring(0, 300),
            url: href,
            resumen: titulo.substring(0, 300),
          });
        }
      },
    );

    // Fallback: look for any content links with headings
    if (items.length === 0) {
      $("a").each((_, el) => {
        const href = $(el).attr("href");
        const heading = $(el).find("h2, h3, h4").first().text().trim();
        if (heading && href && heading.length > 10 && href.startsWith("http")) {
          items.push({
            titulo: heading.substring(0, 300),
            url: href,
            resumen: heading.substring(0, 300),
          });
        }
      });
    }

    const seen = new Set<string>();
    return items
      .filter((item) => {
        if (seen.has(item.url)) return false;
        seen.add(item.url);
        return true;
      })
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Main recopilación function ───────────────────────────────────────────────

export async function recopilarNoticias(): Promise<{
  nuevas: number;
  duplicadas: number;
  errores: string[];
}> {
  let nuevas = 0;
  let duplicadas = 0;
  const errores: string[] = [];

  for (const source of NEWS_SOURCES) {
    try {
      let items: RawNewsItem[];

      if (source.tipo === "rss") {
        items = await fetchRSS(source.url);
      } else {
        switch (source.id) {
          case "PODER_JUDICIAL":
            items = await scrapePJUD();
            break;
          case "TC":
            items = await scrapeTC();
            break;
          case "DIARIO_OFICIAL":
            items = await scrapeDiarioOficial();
            break;
          case "COLEGIO_ABOGADOS":
            items = await scrapeColegioAbogados();
            break;
          default:
            items = [];
        }
      }

      for (const item of items) {
        if (!item.url || !item.titulo) continue;

        try {
          const exists = await prisma.noticiaJuridica.findUnique({
            where: { urlFuente: item.url },
          });

          if (exists) {
            duplicadas++;
            continue;
          }

          await prisma.noticiaJuridica.create({
            data: {
              titulo: item.titulo,
              resumen: item.resumen || item.titulo,
              urlFuente: item.url,
              fuente: source.id,
              fuenteNombre: source.nombre,
              categoria: source.categoria,
              imagenUrl: item.imagenUrl || null,
              fechaPublicacionFuente: item.fecha || new Date(),
              estado: "pendiente",
            },
          });
          nuevas++;
        } catch {
          // Duplicate or DB error for single item — skip silently
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      errores.push(`${source.id}: ${msg}`);
    }
  }

  return { nuevas, duplicadas, errores };
}
