// ─── Parsing de hashtags y menciones en OD content ──────────────
//
// Extrae #hashtags y @menciones de un texto plano. Las reglas:
//
// Hashtag: # seguido de una palabra (letras, números, _) sin espacios.
//   Casos válidos: #ProcesalCivil, #civil_2026, #articulo1545
//   No válidos: # solo, #-mal, espaciado en medio
//
// Mención: @ seguido de un handle (letras, números, _, mínimo 2 chars).
//   Casos válidos: @bastian, @bg_22, @abc
//   No válidos: emails (no tienen @ al inicio de palabra), @ solo
//
// Ambos se extraen solo si están al inicio de palabra (precedidos de
// espacio, salto de línea, signo de puntuación o inicio de string).
// Esto evita confundir un email "foo@bar" con una mención.

// Construimos los RegExp via constructor (string + flags) para evitar
// que el typechecker se queje del flag 'u' o de \p{...} en proyectos
// con target ES5 implícito. A runtime Node/Next soportan ambos sin
// problema.
const HASHTAG_RE = new RegExp(
  "(?:^|[\\s\\p{P}])#([\\p{L}\\p{N}_]{1,40})",
  "gu",
);
const MENTION_RE = new RegExp(
  "(?:^|[\\s\\p{P}])@([a-zA-Z0-9_]{2,30})",
  "gu",
);

/**
 * Extrae hashtags únicos (lowercase) del contenido. Sin '#'.
 */
export function extractHashtags(content: string): string[] {
  const set = new Set<string>();
  const matches = Array.from(content.matchAll(HASHTAG_RE));
  for (const match of matches) {
    const tag = match[1]?.toLowerCase();
    if (tag && tag.length >= 2 && tag.length <= 40) {
      set.add(tag);
    }
  }
  return Array.from(set);
}

/**
 * Extrae handles únicos (lowercase) del contenido. Sin '@'.
 */
export function extractMentions(content: string): string[] {
  const set = new Set<string>();
  const matches = Array.from(content.matchAll(MENTION_RE));
  for (const match of matches) {
    const handle = match[1]?.toLowerCase();
    if (handle && handle.length >= 2 && handle.length <= 30) {
      set.add(handle);
    }
  }
  return Array.from(set);
}

/**
 * Resuelve handles a userIds reales. Devuelve un mapa handle → userId
 * solo para los que existen. Útil para guardar mentionedUserIds y
 * disparar notificaciones.
 */
export async function resolveMentions(
  handles: string[],
  prisma: {
    user: {
      findMany: (args: {
        where: { handle: { in: string[] } };
        select: { id: true; handle: true };
      }) => Promise<{ id: string; handle: string | null }[]>;
    };
  },
): Promise<Map<string, string>> {
  if (handles.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { handle: { in: handles } },
    select: { id: true, handle: true },
  });
  const map = new Map<string, string>();
  for (const u of users) {
    if (u.handle) map.set(u.handle, u.id);
  }
  return map;
}
