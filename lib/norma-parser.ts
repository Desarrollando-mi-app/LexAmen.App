// ─── Norma Parser — Art. X CC → leychile.cl ────────────

const CODIGOS: Record<string, { idNorma: number; nombre: string }> = {
  CC: { idNorma: 172986, nombre: "Código Civil" },
  CPC: { idNorma: 22740, nombre: "Código de Procedimiento Civil" },
  CP: { idNorma: 1984, nombre: "Código Penal" },
  CPP: { idNorma: 176595, nombre: "Código Procesal Penal" },
  CT: { idNorma: 207436, nombre: "Código del Trabajo" },
  CCOM: { idNorma: 1974, nombre: "Código de Comercio" },
  COT: { idNorma: 25563, nombre: "Código Orgánico de Tribunales" },
};

export interface NormaLink {
  original: string;
  articulo: string;
  codigo: string;
  url: string;
}

/**
 * Parsea referencias a normas en texto libre.
 * Ejemplo: "Art. 1445 CC" → { original, articulo: "1445", codigo: "Código Civil", url: "https://..." }
 */
export function parseNormas(text: string): NormaLink[] {
  const regex =
    /Art\.?\s*(\d+(?:\s*(?:bis|ter|quáter|quater|inc\.\s*\d+))?)\s+(CC|CPC|CP|CPP|CT|CCOM|COT)\b/gi;
  const links: NormaLink[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const articulo = match[1].trim();
    const codigoKey = match[2].toUpperCase();
    const info = CODIGOS[codigoKey];
    if (info) {
      links.push({
        original: match[0],
        articulo,
        codigo: info.nombre,
        url: `https://www.leychile.cl/Navegar?idNorma=${info.idNorma}`,
      });
    }
  }

  return links;
}
