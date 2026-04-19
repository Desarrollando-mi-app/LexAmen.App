/**
 * Fase 1 — Transformación del currículum para dar ids a párrafos.
 *
 * Lee lib/curriculum-data.ts y transforma cada titulo.parrafos: string[]
 * en titulo.parrafos: ParrafoNode[] con { id, label }.
 *
 * El id se construye como `{tituloId}_P{n}` (n = 1-based).
 *
 * Preserva comentarios, indentación y leyesAnexas. Tracking por línea:
 * - Dentro de un array titulos[], sigue al último `id: "XXX"` visto como tituloId.
 * - Al entrar en `parrafos: [`, transforma hasta encontrar `]`.
 *
 * Uso: npx tsx scripts/fase1-parrafos-ids.ts [--dry-run]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const FILE = path.join(process.cwd(), "lib", "curriculum-data.ts");
const DRY = process.argv.includes("--dry-run");

const src = fs.readFileSync(FILE, "utf8");
const lines = src.split("\n");

// ── Paso 1: encontrar bloques {id:..., parrafos: [...]} ───────────────
// Heurística:
//  - Mantenemos stack de tituloIds. Al ver `id: "XXX",` y la siguiente línea
//    no-comentario es `label:` o `articulosRef:`, es un titulo id.
//    (Los seccion/rama ids también usan `id:`, pero están al nivel superior
//     de indent; los titulos están más adentro. Usaremos indent.)

interface BlockEdit {
  startLine: number; // línea donde está `parrafos: [`
  endLine: number;   // línea donde está `]`
  indent: string;    // indent del `parrafos:` key
  tituloId: string;  // id del titulo contenedor
  labels: string[];  // strings originales a transformar
}

const edits: BlockEdit[] = [];
let currentTituloId: string | null = null;
let currentTituloIndent = 0;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trim = line.trim();
  const ind = indentOf(line);

  // Detectar inicio de titulo: línea `{` y a continuación `id: "XXX"`.
  // Buscamos patrón: `id: "SOMETHING",` donde SOMETHING es un tituloId.
  // Heurística más simple: matchear `          id: "XXX",` con indent >= 10
  // Y verificar que la línea +1 o +2 tenga `label:` (característico de titulo).
  const idMatch = trim.match(/^id:\s*"([^"]+)",?\s*$/);
  if (idMatch) {
    // Mirar próximas 3 líneas buscando `label:`
    let hasLabel = false;
    for (let j = 1; j <= 3 && i + j < lines.length; j++) {
      const nxt = lines[i + j].trim();
      if (nxt.startsWith("label:")) { hasLabel = true; break; }
      if (nxt.startsWith("id:")) break;
    }
    // Heurística adicional: los tituloIds tienen patrón MENSAJE_BELLO, TP_1,
    // LI_T1, LII_T3, LIII_T7, LIV_T42, CPC_LI_T1, COT_T1, etc.
    // Los seccion.id son: MENSAJE, TITULO_PRELIMINAR, LIBRO_I, LIBRO_I_CPC, COT, etc.
    // Distinguimos: los titulos tienen un "_T" o "_P" o son "MENSAJE_BELLO"/"TP_N".
    const id = idMatch[1];
    const isTitulo =
      /_T\d+/.test(id) ||
      /TFINAL$/.test(id) ||
      /^TP_\d+$/.test(id) ||
      id === "MENSAJE_BELLO" ||
      id === "MENSAJE_CPC";

    if (hasLabel && isTitulo) {
      currentTituloId = id;
      currentTituloIndent = ind;
    }
  }

  // Detectar `parrafos: [`
  if (trim === "parrafos: [" || trim.startsWith("parrafos: [")) {
    if (!currentTituloId) {
      console.error(`[WARN] parrafos en línea ${i + 1} sin tituloId visible`);
      continue;
    }
    // Recolectar líneas hasta el cierre `]`
    const labels: string[] = [];
    let endLine = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const inner = lines[j].trim();
      if (inner === "]," || inner === "]") { endLine = j; break; }
      // Esperamos string entre comillas terminando en coma:
      //   "Label del párrafo",
      const strMatch = inner.match(/^"([^"]*)",?\s*$/);
      if (strMatch) {
        labels.push(strMatch[1]);
      } else if (inner.startsWith("{")) {
        // Ya es ParrafoNode — skip (idempotente)
        console.log(`[SKIP] ${currentTituloId} ya tiene ParrafoNode en línea ${j + 1}`);
        endLine = -2;
        break;
      }
    }
    if (endLine > 0) {
      edits.push({
        startLine: i,
        endLine,
        indent: " ".repeat(ind),
        tituloId: currentTituloId,
        labels,
      });
    }
  }
}

console.log(`Encontrados ${edits.length} bloques parrafos para transformar.`);
let totalParrafos = 0;
for (const e of edits) totalParrafos += e.labels.length;
console.log(`Total de párrafos a reescribir: ${totalParrafos}`);

if (edits.length === 0) {
  console.log("Nada que hacer.");
  process.exit(0);
}

// ── Paso 2: aplicar transformación (de atrás hacia adelante para no corromper índices)
const newLines = [...lines];
for (let k = edits.length - 1; k >= 0; k--) {
  const e = edits[k];
  const newBlock: string[] = [];
  newBlock.push(`${e.indent}parrafos: [`);
  e.labels.forEach((label, idx) => {
    const pid = `${e.tituloId}_P${idx + 1}`;
    // Escapar comillas en label si las hubiera (no es común)
    const safeLabel = label.replace(/"/g, '\\"');
    // Última entrada sin coma final
    const comma = idx < e.labels.length - 1 ? "," : ",";
    newBlock.push(`${e.indent}  { id: "${pid}", label: "${safeLabel}" }${comma}`);
  });
  // cerrar array — preservar terminador original (puede ser `],` o `]`)
  const originalClose = lines[e.endLine].trim();
  newBlock.push(`${e.indent}${originalClose}`);

  newLines.splice(e.startLine, e.endLine - e.startLine + 1, ...newBlock);
}

// ── Paso 3: actualizar interface TituloNode ─────────────────
// De: `parrafos?: string[];` → definición con ParrafoNode.
const ifaceIdx = newLines.findIndex((l) =>
  l.trim() === "parrafos?: string[];"
);
if (ifaceIdx >= 0) {
  newLines.splice(
    ifaceIdx,
    1,
    `  parrafos?: ParrafoNode[];`
  );
}

// ── Paso 4: insertar interface ParrafoNode antes de TituloNode ──────
const tituloIfaceIdx = newLines.findIndex((l) =>
  l.startsWith("export interface TituloNode")
);
if (tituloIfaceIdx > 0) {
  const parrafoIface = [
    "export interface ParrafoNode {",
    "  /** id único, formato: `{tituloId}_P{n}`. Ej: `LI_T2_P1` */",
    "  id: string;",
    "  /** Label humano del párrafo. Ej: `§1. Del principio de la existencia de las personas` */",
    "  label: string;",
    "  /** Rango de artículos que cubre, opcional. Ej: `Arts. 74–78` */",
    "  articulosRef?: string;",
    "}",
    "",
  ];
  newLines.splice(tituloIfaceIdx, 0, ...parrafoIface);
}

// ── Paso 5: añadir helper findParrafo al final ──────────────
const helperBlock = `
// ─── Helpers de navegación por párrafo ─────────────────────────────
/**
 * Busca un párrafo por su id absoluto (formato \`{tituloId}_P{n}\`).
 * Retorna { rama, seccion, titulo, parrafo } o null si no existe.
 */
export function findParrafo(parrafoId: string): {
  ramaKey: string;
  seccion: SeccionNode;
  titulo: TituloNode;
  parrafo: ParrafoNode;
} | null {
  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    for (const seccion of rama.secciones) {
      for (const titulo of seccion.titulos) {
        if (!titulo.parrafos) continue;
        const parrafo = titulo.parrafos.find((p) => p.id === parrafoId);
        if (parrafo) return { ramaKey, seccion, titulo, parrafo };
      }
    }
  }
  return null;
}

/**
 * Busca un título por su id. Retorna { ramaKey, seccion, titulo } o null.
 */
export function findTitulo(tituloId: string): {
  ramaKey: string;
  seccion: SeccionNode;
  titulo: TituloNode;
} | null {
  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    for (const seccion of rama.secciones) {
      const titulo = seccion.titulos.find((t) => t.id === tituloId);
      if (titulo) return { ramaKey, seccion, titulo };
    }
  }
  return null;
}
`;
// Append al final del archivo (antes de cualquier export trailing)
newLines.push(helperBlock);

// ── Escribir ───────────────────────────────────────────────
const result = newLines.join("\n");
if (DRY) {
  console.log("---DRY RUN, no se escribe. Primeros 80 y últimos 40 caracteres tras edit:---");
  console.log(result.substring(0, 1500));
  console.log("...");
  console.log(result.substring(result.length - 1500));
} else {
  fs.writeFileSync(FILE, result);
  console.log(`✓ Escrito ${FILE}`);
  console.log(`  ${edits.length} bloques transformados`);
  console.log(`  ${totalParrafos} párrafos ahora con id`);
}
