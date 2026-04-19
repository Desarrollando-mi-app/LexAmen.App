# Fase 1 — Reporte de ejecución

_Completada 2026-04-19. Solo TypeScript, cero escritura en DB._

## Cambios realizados

### 1. Interfaz `ParrafoNode` añadida a `lib/curriculum-data.ts`

```ts
export interface ParrafoNode {
  id: string;            // formato: `{tituloId}_P{n}`
  label: string;
  articulosRef?: string;
}
```

### 2. `TituloNode.parrafos` cambió de tipo

```diff
 export interface TituloNode {
   id: string;
   label: string;
   articulosRef?: string;
-  parrafos?: string[];
+  parrafos?: ParrafoNode[];
   leyesAnexas?: LeyAnexa[];
 }
```

### 3. Migración de 56 bloques `parrafos` (259 párrafos transformados)

Script `scripts/fase1-parrafos-ids.ts` recorrió el archivo y reemplazó cada entrada string por `ParrafoNode`. Se hizo idempotente (skip cuando ya era ParrafoNode).

Un caso inline (`LIII_T10`) se editó a mano.

### 4. `MENSAJE_BELLO` ahora tiene 10 párrafos de verdad

| ID | Label |
|----|-------|
| `MENSAJE_BELLO_P1` | §1. Contexto histórico y crítica a la legislación colonial |
| `MENSAJE_BELLO_P2` | §2. Justificación de la codificación |
| `MENSAJE_BELLO_P3` | §3. Proceso de elaboración del Código |
| `MENSAJE_BELLO_P4` | §4. Fuentes del Código y derecho comparado |
| `MENSAJE_BELLO_P5` | §5. Consideraciones sobre el Título Preliminar |
| `MENSAJE_BELLO_P6` | §6. Consideraciones sobre el Libro I — De las Personas |
| `MENSAJE_BELLO_P7` | §7. Consideraciones sobre el Libro II — De los bienes y su dominio |
| `MENSAJE_BELLO_P8` | §8. Consideraciones sobre el Libro III — De la sucesión por causa de muerte |
| `MENSAJE_BELLO_P9` | §9. Consideraciones sobre el Libro IV — De las obligaciones y los contratos |
| `MENSAJE_BELLO_P10` | §10. Valor interpretativo del Mensaje y conclusión |

### 5. Helpers añadidos

```ts
export function findParrafo(parrafoId: string): {
  ramaKey: string;
  seccion: SeccionNode;
  titulo: TituloNode;
  parrafo: ParrafoNode;
} | null;

export function findTitulo(tituloId: string): {
  ramaKey: string;
  seccion: SeccionNode;
  titulo: TituloNode;
} | null;
```

### 6. Callsites actualizados

| Archivo | Cambio |
|---------|--------|
| `app/dashboard/components/curriculum-progress.tsx` | `key={par}` → `key={par.id}`, `{par}` → `{par.label}` |
| `app/dashboard/indice-maestro/indice-maestro-client.tsx` | Nueva interface `ParrafoData`, `parrafos: string[]` → `ParrafoData[]`, render usa `.id` y `.label` |
| `app/dashboard/indice-maestro/page.tsx` | `parrafos: t.parrafos ?? []` sigue funcionando (transita los ParrafoNode) |
| `lib/curriculum-data.ts` | `getParrafosForTitulo` retorna `ParrafoNode[]` en lugar de `string[]` |

## Validación

```
Total párrafos: 268
IDs únicos: 268 ✓
MENSAJE_BELLO: 10 párrafos ✓
Lookup MENSAJE_BELLO_P5 → §5. Consideraciones sobre el Título Preliminar ✓
Lookup LI_T2_P1 → 1. Del principio de la existencia de las personas ✓

Párrafos por rama:
  DERECHO_CIVIL: 179
  DERECHO_PROCESAL_CIVIL: 38
  DERECHO_ORGANICO: 51
```

## Typecheck

`npx tsc --noEmit` pasa sin errores.

## Archivos

- `lib/curriculum-data.ts` — modificado (back-up en `lib/curriculum-data.ts.bak-fase1`)
- `scripts/fase1-parrafos-ids.ts` — script de migración
- `scripts/validate-parrafos.ts` — script de validación
- `app/dashboard/components/curriculum-progress.tsx` — ajustado
- `app/dashboard/indice-maestro/indice-maestro-client.tsx` — ajustado

## Siguiente fase

**Fase 2** — Migración Prisma:
- Añadir `parrafo String?` a los 8 modelos que aún no lo tienen.
- Añadir `esIntegrador Boolean @default(false)` a los 11 modelos.
- Añadir `sourceExerciseId String?` a los 11 modelos.
- Añadir índice `@@index([rama, libro, titulo, parrafo])`.

Escribiría la migración primero en dev (con snapshot local) y la aplicaría allí. Después de que la apruebes, se promueve a prod vía `prisma migrate deploy`.
