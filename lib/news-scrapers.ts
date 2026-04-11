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
    rama: null,
  },
  // ── Nuevas fuentes (7) ─────────────────────────────────────
  {
    id: "FISCALIA",
    nombre: "Fiscalía de Chile",
    tipo: "scraping" as const,
    url: "https://www.fiscaliadechile.cl/Fiscalia/sala_prensa/noticias_702.do",
    categoria: "sentencia",
    rama: "penal",
  },
  {
    id: "DIRECCION_TRABAJO",
    nombre: "Dirección del Trabajo",
    tipo: "scraping" as const,
    url: "https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22102.html",
    categoria: "normativa",
    rama: "laboral",
  },
  {
    id: "CONTRALORIA",
    nombre: "Contraloría General de la República",
    tipo: "scraping" as const,
    url: "https://www.contraloria.cl/web/cgr/prensa",
    categoria: "normativa",
    rama: "administrativo",
  },
  {
    id: "SII",
    nombre: "Servicio de Impuestos Internos",
    tipo: "scraping" as const,
    url: "https://www.sii.cl/destacados/",
    categoria: "normativa",
    rama: "tributario",
  },
  {
    id: "CMF",
    nombre: "Comisión para el Mercado Financiero",
    tipo: "scraping" as const,
    url: "https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43561.html",
    categoria: "normativa",
    rama: "comercial",
  },
  {
    id: "DPP",
    nombre: "Defensoría Penal Pública",
    tipo: "scraping" as const,
    url: "https://www.dpp.cl/sala-de-prensa/noticias-702",
    categoria: "gremial",
    rama: "penal",
  },
  {
    id: "MINREL",
    nombre: "Cancillería de Chile",
    tipo: "scraping" as const,
    url: "https://www.minrel.gob.cl/noticias",
    categoria: "internacional",
    rama: "internacional",
  },
  // ── Ministerios ───────────────────────────────────────────
  {
    id: "MIN_JUSTICIA",
    nombre: "Min. de Justicia y DDHH",
    tipo: "scraping" as const,
    url: "https://www.minjusticia.gob.cl/noticias/",
    categoria: "normativa",
    rama: null,
  },
  {
    id: "MINTRAB",
    nombre: "Min. del Trabajo",
    tipo: "scraping" as const,
    url: "https://www.mintrab.gob.cl/noticias/",
    categoria: "normativa",
    rama: "laboral",
  },
  {
    id: "MIN_HACIENDA",
    nombre: "Min. de Hacienda",
    tipo: "scraping" as const,
    url: "https://www.hacienda.cl/noticias",
    categoria: "normativa",
    rama: "tributario",
  },
];

// ─── Article resumen extractor ───────────────────────────────────────────────
// Fetches the actual article page and extracts the first 2-3 paragraphs
// as a descriptive resumen. Zero cost — just an HTTP fetch + HTML parse.

async function fetchArticleResumen(articleUrl: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StudioIuris/1.0; +https://studioiuris.cl)",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);

    // Remove noise: nav, header, footer, sidebar, scripts, styles
    $("nav, header, footer, aside, script, style, .menu, .sidebar, .nav, .footer, .header, .cookie, .banner, .ad").remove();

    // Try to find article body with common selectors
    const bodySelectors = [
      "article p",
      ".entry-content p",
      ".post-content p",
      ".article-body p",
      ".field-body p",
      ".contenido p",
      ".texto p",
      ".cuerpo p",
      ".noticia-detalle p",
      "main p",
      "#content p",
      ".content p",
    ];

    let paragraphs: string[] = [];
    for (const sel of bodySelectors) {
      const found: string[] = [];
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        // Skip very short paragraphs (likely captions/labels)
        if (text.length > 30) found.push(text);
      });
      if (found.length >= 2) {
        paragraphs = found;
        break;
      }
      if (found.length > paragraphs.length) {
        paragraphs = found;
      }
    }

    if (paragraphs.length === 0) return null;

    // Take first 2-3 paragraphs, max 500 chars total
    let resumen = "";
    for (const p of paragraphs.slice(0, 3)) {
      if (resumen.length + p.length > 500) {
        if (resumen.length === 0) resumen = p.substring(0, 500);
        break;
      }
      resumen += (resumen ? " " : "") + p;
    }

    return resumen || null;
  } catch {
    return null;
  }
}

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
        // Filtrar resultados que son sentencias/causas (no noticias institucionales)
        const lowerT = titulo.toLowerCase();
        if (
          lowerT.includes("sala") && lowerT.includes("causa") ||
          lowerT.match(/^rol\s/i) ||
          lowerT.match(/^ingreso\s/i) ||
          lowerT.match(/tercera sala|primera sala|segunda sala|cuarta sala/i)
        ) {
          return; // Skip — es una causa, no una noticia
        }

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

// ─── Generic government site scraper ─────────────────────────────────────────
// Reusable: fetches a page, looks for news links via common CSS patterns.
// Tries multiple selectors and deduplicates by URL.

async function scrapeGenericGov(
  baseUrl: string,
  selectors: string[] = [
    "article a",
    ".noticia a",
    ".news-item a",
    ".views-row a",
    "h2 a",
    "h3 a",
    ".post-title a",
    ".entry-title a",
    ".listado a",
    ".contenido a",
    "li a",
  ],
  domain?: string,
): Promise<RawNewsItem[]> {
  try {
    const res = await fetch(baseUrl, {
      next: { revalidate: 0 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StudioIuris/1.0; +https://studioiuris.cl)",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const cheerio = await import("cheerio");
    const $ = cheerio.load(html);
    const items: RawNewsItem[] = [];
    const parsedBase = new URL(baseUrl);
    const baseDomain = domain ?? `${parsedBase.protocol}//${parsedBase.host}`;

    for (const selector of selectors) {
      $(selector).each((_, el) => {
        const href = $(el).attr("href");
        const titulo =
          $(el).find("h2, h3, h4, h5").first().text().trim() ||
          $(el).text().trim() ||
          $(el).attr("title")?.trim();
        if (!titulo || !href || titulo.length < 10) return;
        const url = href.startsWith("http")
          ? href
          : `${baseDomain}${href.startsWith("/") ? "" : "/"}${href}`;
        items.push({
          titulo: titulo.substring(0, 300),
          url,
          resumen: titulo.substring(0, 300),
        });
      });
      if (items.length >= 5) break; // First matching selector is enough
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

// ─── Fiscalía de Chile ──────────────────────────────────────────────────────

async function scrapeFiscalia(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.fiscaliadechile.cl/Fiscalia/sala_prensa/noticias_702.do",
    ["div.noticia a", ".noticias a", "article a", "h2 a", "h3 a", ".listado-noticias a"],
    "https://www.fiscaliadechile.cl",
  );
}

// ─── Dirección del Trabajo ──────────────────────────────────────────────────

async function scrapeDT(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.dt.gob.cl/portal/1626/w3-propertyvalue-22102.html",
    ["article a", ".article-list a", "h2 a", "h3 a", ".destacado a", "li.listado a"],
    "https://www.dt.gob.cl",
  );
}

// ─── Contraloría General ────────────────────────────────────────────────────

async function scrapeContraloria(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.contraloria.cl/web/cgr/prensa",
    ["article a", ".asset-abstract a", ".asset-title a", "h2 a", "h3 a", ".entry-title a"],
    "https://www.contraloria.cl",
  );
}

// ─── SII ────────────────────────────────────────────────────────────────────

async function scrapeSII(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.sii.cl/destacados/",
    ["article a", ".noticia a", "h2 a", "h3 a", ".campo-titulo a", "li a[href*='sii.cl']"],
    "https://www.sii.cl",
  );
}

// ─── CMF ────────────────────────────────────────────────────────────────────

async function scrapeCMF(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.cmfchile.cl/portal/principal/613/w3-propertyvalue-43561.html",
    ["article a", ".listado a", "h2 a", "h3 a", ".article-title a", ".news-item a"],
    "https://www.cmfchile.cl",
  );
}

// ─── Defensoría Penal Pública ───────────────────────────────────────────────

async function scrapeDPP(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.dpp.cl/sala-de-prensa/noticias-702",
    ["article a", ".noticia a", "h2 a", "h3 a", ".view-content a", ".views-row a"],
    "https://www.dpp.cl",
  );
}

// ─── Cancillería (MINREL) ───────────────────────────────────────────────────

async function scrapeMINREL(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.minrel.gob.cl/noticias",
    ["article a", ".noticia a", "h2 a", "h3 a", ".view-content a", ".views-row a", ".field-title a"],
    "https://www.minrel.gob.cl",
  );
}

// ─── Min. de Justicia y DDHH ────────────────────────────────────────────────

async function scrapeMinJusticia(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.minjusticia.gob.cl/noticias/",
    ["article a", ".noticia a", "h2 a", "h3 a", ".entry-title a", ".post-title a"],
    "https://www.minjusticia.gob.cl",
  );
}

// ─── Min. del Trabajo ───────────────────────────────────────────────────────

async function scrapeMintrab(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.mintrab.gob.cl/noticias/",
    ["article a", ".noticia a", "h2 a", "h3 a", ".entry-title a", ".views-row a"],
    "https://www.mintrab.gob.cl",
  );
}

// ─── Min. de Hacienda ───────────────────────────────────────────────────────

async function scrapeMinHacienda(): Promise<RawNewsItem[]> {
  return scrapeGenericGov(
    "https://www.hacienda.cl/noticias",
    ["article a", ".noticia a", "h2 a", "h3 a", ".entry-title a", ".views-row a"],
    "https://www.hacienda.cl",
  );
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
          case "FISCALIA":
            items = await scrapeFiscalia();
            break;
          case "DIRECCION_TRABAJO":
            items = await scrapeDT();
            break;
          case "CONTRALORIA":
            items = await scrapeContraloria();
            break;
          case "SII":
            items = await scrapeSII();
            break;
          case "CMF":
            items = await scrapeCMF();
            break;
          case "DPP":
            items = await scrapeDPP();
            break;
          case "MINREL":
            items = await scrapeMINREL();
            break;
          case "MIN_JUSTICIA":
            items = await scrapeMinJusticia();
            break;
          case "MINTRAB":
            items = await scrapeMintrab();
            break;
          case "MIN_HACIENDA":
            items = await scrapeMinHacienda();
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

          const noticia = await prisma.noticiaJuridica.create({
            data: {
              titulo: item.titulo,
              resumen: item.resumen || item.titulo,
              urlFuente: item.url,
              fuente: source.id,
              fuenteNombre: source.nombre,
              categoria: source.categoria,
              rama: (source as { rama?: string | null }).rama ?? null,
              imagenUrl: item.imagenUrl || null,
              fechaPublicacionFuente: item.fecha || new Date(),
              estado: "pendiente",
            },
          });
          nuevas++;

          // 1. Extract real resumen from article page (free, no AI)
          fetchArticleResumen(item.url)
            .then((realResumen) => {
              if (realResumen && realResumen !== item.titulo) {
                return prisma.noticiaJuridica.update({
                  where: { id: noticia.id },
                  data: { resumen: realResumen },
                });
              }
            })
            .catch(() => {});

          // 2. AI enrichment for leyes only (metadata: titulo sugerido, numero, etc.)
          if (
            (source.categoria === "nueva_ley" || source.categoria === "normativa") &&
            process.env.OPENAI_API_KEY
          ) {
            enrichNoticia(item.titulo, source.id, true)
              .then((result) =>
                prisma.noticiaJuridica.update({
                  where: { id: noticia.id },
                  data: {
                    tituloSugerido: result.tituloSugerido,
                    motivoLey: result.motivoLey,
                    numeroLey: result.numeroLey,
                    leyesModificadas: result.leyesModificadas,
                    ...(!(source as { rama?: string | null }).rama && result.rama
                      ? { rama: result.rama }
                      : {}),
                  },
                }),
              )
              .catch(() => {});
          }
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

// ─── AI Title Suggestion ──────────────────────────────────

interface EnrichResult {
  resumen: string;
  tituloSugerido: string;
  motivoLey: string | null;
  numeroLey: string | null;
  leyesModificadas: string | null;
  rama: string | null;
}

/**
 * AI enrichment: generates a descriptive resumen for ALL noticias,
 * plus metadata (titulo sugerido, numero ley, leyes modificadas) for leyes.
 */
async function enrichNoticia(
  tituloOriginal: string,
  fuente: string,
  isLey: boolean,
): Promise<EnrichResult> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const systemPrompt = isLey
    ? "Eres un editor jurídico chileno. Dado el título de una noticia legislativa, genera:\n" +
      "1. RESUMEN: 2-3 frases descriptivas (máx 300 chars) explicando de qué trata la noticia en lenguaje claro.\n" +
      "2. TITULO: título descriptivo corto (máx 120 chars). NO incluir número de ley.\n" +
      "3. MOTIVO: frase corta (máx 200 chars) explicando POR QUÉ se ingresó o publicó.\n" +
      "4. NUMERO_LEY: si se menciona un número de ley, extraerlo. Si no, null.\n" +
      "5. LEYES_MODIFICADAS: leyes que modifica o deroga. Si no, null.\n" +
      "6. RAMA: área del derecho (civil, penal, constitucional, laboral, administrativo, comercial, procesal, tributario, familia, internacional). Si no es claro, null.\n\n" +
      'JSON: {"resumen":"...","titulo":"...","motivo":"...","numeroLey":"..."|null,"leyesModificadas":"..."|null,"rama":"..."|null}'
    : "Eres un editor jurídico chileno. Dado el título de una noticia jurídica, genera:\n" +
      "1. RESUMEN: 2-3 frases descriptivas (máx 300 chars) explicando de qué trata en lenguaje claro y accesible. NO repitas el título textualmente.\n" +
      "2. RAMA: área del derecho (civil, penal, constitucional, laboral, administrativo, comercial, procesal, tributario, familia, internacional). Si no es claro, null.\n\n" +
      'JSON: {"resumen":"...","rama":"..."|null}';

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Título: "${tituloOriginal}"\nFuente: ${fuente}` },
    ],
    response_format: { type: "json_object" },
    max_tokens: 400,
    temperature: 0.3,
  });

  const text = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(text);
  return {
    resumen: parsed.resumen ?? tituloOriginal,
    tituloSugerido: parsed.titulo ?? tituloOriginal,
    motivoLey: parsed.motivo ?? null,
    numeroLey: parsed.numeroLey ?? null,
    leyesModificadas: parsed.leyesModificadas ?? null,
    rama: parsed.rama ?? null,
  };
}
