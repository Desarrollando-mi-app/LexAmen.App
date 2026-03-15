// ─── Parser de referencias legales en textos de Obiter Dictum ──

export type ParsedContent =
  | { type: "text"; value: string }
  | { type: "legal_ref"; article: number; code: string; original: string };

/**
 * Parsea el contenido de un obiter detectando referencias legales.
 *
 * Patrones detectados (case insensitive):
 *   "Art. 1445 CC"
 *   "art. 1461 del CC"
 *   "artículo 706 CC"
 *   "Artículo 706 del Código Civil"
 *   "Arts. 1437 y 1438 CC"
 *   "Art. 1545 del C.C."
 *   "art. 1445 C. C."
 */
export function parseObiterContent(content: string): ParsedContent[] {
  // Regex para detectar referencias al CC
  // Captura: Art(s|ículos?)? número (y número)? (del)? CC|C.C.|Código Civil
  const regex =
    /Art(?:s|ículos?)?\.?\s*(\d{1,4})(?:\s*(?:y|,)\s*(\d{1,4}))?\s*(?:del\s+)?(?:CC|C\.?\s*C\.?|Código\s+Civil)/gi;

  const result: ParsedContent[] = [];
  let lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    // Agregar texto antes del match
    if (match.index > lastIndex) {
      result.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    // Primer artículo
    const article1 = parseInt(match[1], 10);
    result.push({
      type: "legal_ref",
      article: article1,
      code: "CC",
      original: match[2]
        ? // Si hay segundo artículo, el original es solo la parte del primero
          `Art. ${article1} CC`
        : match[0],
    });

    // Segundo artículo (si "Arts. 1437 y 1438 CC")
    if (match[2]) {
      const article2 = parseInt(match[2], 10);
      // Agregar " y " entre las dos referencias
      result.push({ type: "text", value: " y " });
      result.push({
        type: "legal_ref",
        article: article2,
        code: "CC",
        original: `Art. ${article2} CC`,
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Agregar texto restante
  if (lastIndex < content.length) {
    result.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  // Si no hubo matches, devolver el contenido completo como texto
  if (result.length === 0) {
    return [{ type: "text", value: content }];
  }

  return result;
}
