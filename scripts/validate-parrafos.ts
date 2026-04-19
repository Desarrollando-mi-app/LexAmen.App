import { CURRICULUM, findParrafo, findTitulo } from "../lib/curriculum-data";

const allParrafos: { id: string; tituloId: string; label: string }[] = [];
for (const [, rama] of Object.entries(CURRICULUM)) {
  for (const seccion of rama.secciones) {
    for (const titulo of seccion.titulos) {
      if (!titulo.parrafos) continue;
      for (const p of titulo.parrafos) {
        allParrafos.push({ id: p.id, tituloId: titulo.id, label: p.label });
      }
    }
  }
}

console.log(`Total párrafos: ${allParrafos.length}`);
const ids = allParrafos.map((p) => p.id);
const unique = new Set(ids);
console.log(`IDs únicos: ${unique.size}`);
if (ids.length !== unique.size) {
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  console.log(`DUPLICADOS:`, dupes);
}

const mb = findTitulo("MENSAJE_BELLO");
console.log(`\nMENSAJE_BELLO: ${mb?.titulo.parrafos?.length ?? 0} párrafos`);
mb?.titulo.parrafos?.forEach((p) => console.log(`  ${p.id}: ${p.label}`));

const lookup = findParrafo("MENSAJE_BELLO_P5");
console.log(`\nLookup MENSAJE_BELLO_P5 → ${lookup ? lookup.parrafo.label : "null"}`);

const lookup2 = findParrafo("LI_T2_P1");
console.log(`Lookup LI_T2_P1 → ${lookup2 ? lookup2.parrafo.label : "null"}`);

// Count parrafos per rama
const perRama: Record<string, number> = {};
for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  let c = 0;
  for (const seccion of rama.secciones) {
    for (const titulo of seccion.titulos) {
      c += titulo.parrafos?.length ?? 0;
    }
  }
  perRama[ramaKey] = c;
}
console.log("\nPárrafos por rama:", perRama);
