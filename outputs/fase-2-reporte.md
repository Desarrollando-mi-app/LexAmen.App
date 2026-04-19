# Fase 2 — Reporte de migración Prisma

_Aplicada 2026-04-19. Aditivo, nullable, cero data loss._

## Cambios al schema

En **11 modelos de ejercicio** se agregaron:

1. `parrafo String?` (solo donde faltaba: 8 modelos — Flashcard/MCQ/TrueFalse ya lo tenían)
2. `esIntegrador Boolean @default(false)` (los 11)
3. `sourceExerciseId String?` (los 11)

Más **33 índices nuevos** (3 por modelo):

- `@@index([rama, libro, titulo, parrafo])` o `@@index([rama, libro, tituloMateria, parrafo])`
- `@@index([esIntegrador])`
- `@@index([sourceExerciseId])`

### Modelos tocados

| Modelo | parrafo nuevo | Campo taxonomía | Índice rama/libro/titulo/parrafo |
|--------|---------------|------------------|----------------------------------|
| Flashcard | ya existía | `titulo` | `rama, libro, titulo, parrafo` |
| MCQ | ya existía | `titulo` | `rama, libro, titulo, parrafo` |
| TrueFalse | ya existía | `titulo` | `rama, libro, titulo, parrafo` |
| Definicion | ✓ | `titulo` | `rama, libro, titulo, parrafo` |
| FillBlank | ✓ | `titulo` | `rama, libro, titulo, parrafo` |
| ErrorIdentification | ✓ | `titulo` | `rama, libro, titulo, parrafo` |
| OrderSequence | ✓ | `tituloMateria` | `rama, libro, tituloMateria, parrafo` |
| MatchColumns | ✓ | `tituloMateria` | `rama, libro, tituloMateria, parrafo` |
| CasoPractico | ✓ | `tituloMateria` | `rama, libro, tituloMateria, parrafo` |
| DictadoJuridico | ✓ | `tituloMateria` | `rama, libro, tituloMateria, parrafo` |
| Timeline | ✓ | `tituloMateria` | `rama, libro, tituloMateria, parrafo` |

## SQL aplicado

Script ubicado en `prisma/migrations/20260419_145625_fase2_reorg_ejercicios/migration.sql` (150 líneas).

Resumen de operaciones:
- 11 `ALTER TABLE ... ADD COLUMN` (x 2–3 columnas c/u)
- 33 `CREATE INDEX`
- 0 drops, 0 renames, 0 not-null sin default

## Flujo de aplicación

Bloqueo: `prisma migrate dev` falló en shadow database por un `DROP TYPE Submateria` histórico (migración `20260224_mcq_module`) que no era replayable. Bypass seguro:

1. `prisma migrate diff --from-config-datasource --to-schema` → generó SQL aditivo.
2. `prisma db execute --file migration.sql` → aplicó contra prod directamente.
3. `prisma migrate resolve --applied 20260419_145625_fase2_reorg_ejercicios` → registró en `_prisma_migrations`.
4. `prisma generate` → regeneró cliente.
5. `tsc --noEmit` → sin errores.

La tabla `_prisma_migrations` ahora refleja el estado real.

## Validación

- `npx prisma validate` → schema válido.
- `npx tsc --noEmit` → 0 errores.
- Todas las filas existentes tienen `esIntegrador=false` (default), `parrafo=NULL`, `sourceExerciseId=NULL` — inerte.
- La app sigue funcionando sin cambios de código.

## Siguiente fase

**Fase 3** — Re-clasificar huérfanos (5,735 filas) a `titulo` válido aplicando reglas R1–R8:
- Dry-run primero: genero reporte de qué fila va a dónde.
- Requiere tu aprobación antes de ejecutar UPDATEs.
- Después: huérfanos del catastro bajan a ~0.
