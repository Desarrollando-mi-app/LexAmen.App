# Fase 0 — Reconocimiento

_Documento generado 2026-04-19. Lectura solamente, sin escritura en DB._

## 1. Inventario de modelos de ejercicio/progreso en Prisma

Se identifican **11 modelos de ejercicio** y sus respectivos modelos de progreso/intento. La columna "Progreso keyed por" indica cómo se registra el avance del usuario.

| # | Modelo ejercicio | Línea | Modelo progreso/intento | Línea | Progreso keyed por |
|---|------------------|-------|--------------------------|-------|---------------------|
| 1 | `Flashcard` | 459 | `UserFlashcardProgress` + `FlashcardFavorite` | 483 / 771 | `@@unique([userId, flashcardId])` |
| 2 | `MCQ` | 500 | `UserMCQAttempt` | 531 | _a verificar en Fase 2_ |
| 3 | `TrueFalse` | 546 | `UserTrueFalseAttempt` | 570 | _a verificar en Fase 2_ |
| 4 | `Definicion` | 1761 | `DefinicionIntento` | 1791 | _a verificar en Fase 2_ |
| 5 | `FillBlank` | 1928 | `FillBlankAttempt` | 1953 | _a verificar en Fase 2_ |
| 6 | `ErrorIdentification` | 1970 | `ErrorIdentificationAttempt` | 1996 | _a verificar en Fase 2_ |
| 7 | `OrderSequence` | 2014 | `OrderSequenceAttempt` | 2040 | _a verificar en Fase 2_ |
| 8 | `MatchColumns` | 2059 | `MatchColumnsAttempt` | 2087 | _a verificar en Fase 2_ |
| 9 | `CasoPractico` | 2106 | `CasoPracticoAttempt` | 2132 | _a verificar en Fase 2_ |
| 10 | `DictadoJuridico` | 2149 | `DictadoAttempt` | 2173 | _a verificar en Fase 2_ |
| 11 | `Timeline` | 2192 | `TimelineAttempt` | 2221 | _a verificar en Fase 2_ |

**Campos de taxonomía comunes** en los 11 modelos de ejercicio: `rama Rama`, `codigo Codigo`, `libro Libro`, `titulo String`, más índices `@@index([rama, libro])` y `@@index([rama, libro, titulo])`.

**Campo que añadirá Fase 2** a los 11 modelos:
- `parrafo String?` (nullable)
- `esIntegrador Boolean @default(false)`
- `sourceExerciseId String?` (nullable, para duplicación cross-rama)
- `@@index([rama, libro, titulo, parrafo])`

**Confirmación crítica:** como los modelos de progreso están keyed por `(userId, exerciseId)` y no por `(userId, rama, exerciseId)`, la **duplicación de filas (Opción A)** da automáticamente progreso independiente por rama sin tocar el esquema de progreso. No hay que modificar los `@@unique` de progreso. ✅

## 2. Localización del dropdown "Estudiar"

| Plataforma | Archivo | Líneas | Items actuales |
|------------|---------|--------|----------------|
| Desktop | `app/dashboard/components/gz-masthead-nav.tsx` | 40–48 | Índice Maestro, Instituciones, Ejercicios (11 módulos) |
| Mobile | `app/dashboard/components/mobile-nav.tsx` | 46–55 | Índice Maestro, Instituciones, Ejercicios (11 módulos) |

**Plan Fase 6:** insertar un cuarto item en ambos archivos:

```ts
{ href: "/dashboard/estudios/integradores", label: "Ejercicios integradores", emoji: "🧩" }
```

Y una ruta nueva `/dashboard/estudios/integradores` que lee del catálogo `lib/integrador-catalog.ts`.

## 3. Análisis de los 448 keys huérfanos (5.735 rows)

Los huérfanos se agrupan en **4 familias de patrones**, cada una con su estrategia de reclasificación:

### Familia A — Material integrador (→ catálogo integrador, fuera del índice)

| Key | Aproximado rows |
|-----|-----------------|
| `CPC_JUICIO_ORDINARIO` | ~900 |
| `CPC_JUICIOS_ESPECIALES` | ~500 |
| `CPC_ACTOS_NO_CONTENCIOSOS` | ~250 |
| `COT_INTEGRADOR_FINAL` | ~200 |
| `JURISPRUDENCIA` | ~120 |
| **Subtotal Familia A** | **~2.000** |

**Destino:** marcar `esIntegrador = true` y poblar `integradorUnidad` según el catálogo. NO aparecen en el índice maestro.

### Familia B — Libro completo sin título (generic, necesita distribución)

| Key | Rama | Aproximado rows |
|-----|------|-----------------|
| `LIBRO_I` | Civil | ~300 |
| `LIBRO_II` | Civil | ~280 |
| `LIBRO_IV` | Civil | ~1.100 |
| `LIBRO_I` | Procesal | ~150 |
| `LIBRO_II` | Procesal | ~350 |
| `LIBRO_III` | Procesal | ~220 |
| `LIV`, `LII`, `LIII` | Civil | ~100 |
| `TP` | Civil | ~200 |
| **Subtotal Familia B** | **~2.700** |

**Destino:** reclasificación por keyword → `titulo.id` específico dentro del mismo libro. Se aplica Fase 3 (a título) y luego Fase 4 (a párrafo).

### Familia C — Título sin prefijo de libro (Procesal)

| Key | Rama | Aproximado rows |
|-----|------|-----------------|
| `CPC_T1` a `CPC_T9` | Procesal | ~150 |
| `COT_T1`, `COT_T7`, `COT_T9`, `COT_T11` | Procesal (rama mal clasificada) | ~100 |
| **Subtotal Familia C** | **~250** |

**Destino:** prefijo faltante. `CPC_T7` → `CPC_LI_T7` o `CPC_LII_T7` según keyword; `COT_T*` en Procesal → mover a rama Orgánico con el mismo titulo id.

### Familia D — Rama mal clasificada (edge cases)

| Key | Rama actual | Aproximado rows |
|-----|-------------|-----------------|
| `CPC_LI_T12` | Orgánico (debería ser Procesal) | 22 |
| `COT_T*` | Procesal (debería ser Orgánico) | ver Familia C |
| **Subtotal Familia D** | **~50** |

**Destino:** corrección de `rama` sin cambiar `titulo`.

### Totales por familia

| Familia | Rows | % del total huérfano |
|---------|------|----------------------|
| A — Integrador | ~2.000 | 35% |
| B — Libro genérico | ~2.700 | 47% |
| C — Título sin prefijo | ~250 | 4% |
| D — Rama mal clasificada | ~50 | 1% |
| Cola larga (keys únicas <10 rows) | ~735 | 13% |
| **Total** | **~5.735** | **100%** |

## 4. Muestreo manual pendiente (lo pide el Gate de Fase 0)

Para confirmar reglas de clasificación antes de Fase 3, propongo extraer **20 rows al azar de cada una** de las 10 keys más pobladas (Familias A + B), imprimir pregunta/respuesta/explicación, y clasificarlas a mano. Eso son ~200 rows. Se hace vía script de lectura de DB y se anexa como `outputs/fase-0-muestreo.md`.

**Requisito previo:** confirmar backup de las tablas de ejercicios y progreso (o hacerlo en este paso) antes de cualquier operación de escritura posterior.

## 5. Backup

**Estado:** PENDIENTE de confirmación por parte del usuario.

**Comandos sugeridos** (para que los corras antes de Fase 3, que es la primera que escribe):

```bash
# En Supabase Dashboard → Database → Backups, tomar snapshot "Pre-reorganización-2026-04"
# O vía CLI:
pg_dump "$DIRECT_URL" \
  --schema=public \
  --table='public."Flashcard"' \
  --table='public."MCQ"' \
  --table='public."TrueFalse"' \
  --table='public."Definicion"' \
  --table='public."FillBlank"' \
  --table='public."ErrorIdentification"' \
  --table='public."OrderSequence"' \
  --table='public."MatchColumns"' \
  --table='public."CasoPractico"' \
  --table='public."DictadoJuridico"' \
  --table='public."Timeline"' \
  > backups/pre-reorg-ejercicios-$(date +%Y%m%d).sql
```

Además, cada fase que escriba mantiene una tabla `_reclass_log` con el estado `antes`/`después`, permitiendo rollback granular sin restaurar el dump completo.

## 6. Mapeo tentativo 448 keys → destino (Gate de aprobación)

| Regla | Patrón de key | Destino | Fases involucradas |
|-------|---------------|---------|--------------------|
| R1 | `CPC_JUICIO_ORDINARIO`, `CPC_JUICIOS_ESPECIALES`, `CPC_ACTOS_NO_CONTENCIOSOS`, `COT_INTEGRADOR_FINAL`, `JURISPRUDENCIA` | `esIntegrador=true` + catálogo integrador | 6 |
| R2 | `LIBRO_I`, `LIBRO_II`, `LIBRO_III`, `LIBRO_IV` (Civil/Procesal) | Distribuir a `titulo` específico por keyword dentro del libro | 3 |
| R3 | `LIV`, `LII`, `LIII` (Civil) | Sinónimos de `LIBRO_IV`, `LIBRO_II`, `LIBRO_III` → aplicar R2 | 3 |
| R4 | `TP` (Civil) | Distribuir a `TP_1`…`TP_6` por keyword | 3 |
| R5 | `CPC_T1`…`CPC_T9` (Procesal) | Añadir prefijo de libro: `CPC_LI_T*` o `CPC_LII_T*` según keyword | 3 |
| R6 | `COT_T*` en rama=Procesal | Cambiar rama a Orgánico, mantener `titulo` | 3 (fix rama) |
| R7 | `CPC_LI_T12` en rama=Orgánico | Cambiar rama a Procesal | 3 (fix rama) |
| R8 | Cola larga (~735 rows en keys <10) | Revisión individual si keyword no resuelve; fallback a título del libro más probable | 3 + revisión humana |

## 7. Hallazgos del muestreo (140 rows leídos, 14 keys representativas)

Correr el muestreo reveló cosas que cambian algunas reglas. Detalle en `outputs/fase-0-muestreo.md`.

### Hallazgo 1 — `parrafo` YA existe en algunos modelos

Los modelos **Flashcard, MCQ, TrueFalse** ya tienen columna `parrafo String?` nullable en el schema Prisma. Esto **reduce el alcance de Fase 2**: hay que añadir `parrafo` solo a los otros 8 modelos (Definicion, FillBlank, ErrorIdentification, OrderSequence, MatchColumns, CasoPractico, DictadoJuridico, Timeline), en lugar de a los 11.

### Hallazgo 2 — Esquemas heterogéneos (`rama`/`libro`/`titulo`)

No todos los modelos tipan la taxonomía igual:

| Modelo | rama | libro | titulo |
|--------|------|-------|--------|
| Flashcard, MCQ, TrueFalse | `Rama` (enum) | `Libro` (enum) | `String` |
| Definicion | `Rama` (enum) | `String?` | `String?` |
| FillBlank | `String` | `String?` | `String?` |
| Resto (pendiente verificar en Fase 2) | — | — | — |

**Implicación Fase 2:** la migración debe normalizar o al menos documentar la heterogeneidad. Mantenemos tipos por ahora para no romper, pero anotamos como deuda técnica.

### Hallazgo 3 — Regla R4 (`TP` → `TP_1..6`) es INCORRECTA

El muestreo de `CIVIL · TP` mostró que las flashcards son todas sobre el **Mensaje de Andrés Bello** (historia del Código, crítica a las Partidas, etc.), no sobre el texto del Título Preliminar. Deben ir a `MENSAJE_BELLO`, no a `TP_*`.

### Hallazgo 4 — Regla R3 (`LIV`/`LII`/`LIII` = sinónimos de libros) también requiere matiz

El muestreo de `CIVIL · LIV` también mostró contenido del **Mensaje** (Sección VI sobre obligaciones, escrita por Bello). No es contenido del Libro IV propiamente tal. Muchos de estos rows son más Mensaje que libro.

### Hallazgo 5 — Familias A y B bien caracterizadas

- `LIBRO_IV` (Civil) = contenido sobre **prescripción** (arts. 2492+) → `LIV_T42` (Título XLII: De la prescripción).
- `LIBRO_I` (Civil) = contenido sobre **matrimonio** (arts. 102+, Ley 19.947) → `LI_T4`.
- `LIBRO_II` (Civil) = contenido sobre **dominio y modos de adquirir** (arts. 582, 588, 643, 670) → distribuir entre `LII_T1`, `LII_T3`, `LII_T4`.
- `CPC_JUICIOS_ESPECIALES` = **juicio ejecutivo** → integrador. ✅
- `CPC_ACTOS_NO_CONTENCIOSOS` = **muerte presunta, arts. 818–823 CPC** → integrador. ✅
- `JURISPRUDENCIA` = **fuentes del derecho, art. 170 CPC, votos** → integrador. ✅
- `CPC · LIBRO_II` = **prescripción procesal, arts. 304, 310, 442 CPC** → `CPC_LII_T*` específico.

## 8. Reglas R1–R8 — REVISIÓN FINAL

| Regla | Patrón | Destino | Estado |
|-------|--------|---------|--------|
| **R1** | `CPC_JUICIO_ORDINARIO`, `CPC_JUICIOS_ESPECIALES`, `CPC_ACTOS_NO_CONTENCIOSOS`, `COT_INTEGRADOR_FINAL`, `JURISPRUDENCIA` | `esIntegrador=true` + catálogo integrador | ✅ confirmada |
| **R2** | `LIBRO_I/II/III/IV` (Civil/Procesal) | Distribuir a `titulo` específico por keyword dentro del libro | ✅ confirmada |
| **R3'** | `LIV`/`LII`/`LIII` (Civil) — si keyword menciona "Mensaje"/"Bello"/"codificación"/"Partidas" | → `MENSAJE_BELLO` | 🔄 **revisada** |
| **R3''** | `LIV`/`LII`/`LIII` (Civil) — si no es Mensaje | → Libro correspondiente, aplicar R2 | 🔄 **nueva sub-regla** |
| **R4'** | `TP` (Civil) — keyword "Mensaje"/"Bello"/"codificación" | → `MENSAJE_BELLO` | 🔄 **revisada** |
| **R4''** | `TP` (Civil) — si no es Mensaje | → `TP_1..TP_6` por keyword | 🔄 **nueva sub-regla** |
| **R5** | `CPC_T1..T9` (Procesal) | Añadir prefijo libro: `CPC_LI_T*` o `CPC_LII_T*` | ✅ confirmada |
| **R6** | `COT_T*` en rama=Procesal | Cambiar rama a Orgánico, mantener `titulo` | ✅ confirmada |
| **R7** | `CPC_LI_T12` en rama=Orgánico | Cambiar rama a Procesal | ✅ confirmada |
| **R8** | Cola larga (~735 rows en keys <10) | Heurística + fallback a revisión humana | ✅ confirmada |

## 9. Entregable y gate

- [x] Inventario de 11 modelos de ejercicio + 11 de progreso
- [x] Localización de dropdown Estudiar (desktop + mobile)
- [x] Clasificación de 448 keys huérfanas en 4 familias
- [x] Mapeo tentativo y reglas **R1–R8 revisadas** con muestreo real
- [x] **Backup completo vía `pg_dump`** → `backups/pre-reorg-ejercicios-20260419-1341.sql` (9.3 MB, 23 tablas, 15.660 rows de ejercicios + 198 de progreso)
- [x] Muestreo de 140 rows (14 keys × 10) → `outputs/fase-0-muestreo.md`
- [x] Hallazgos del muestreo documentados

**Fase 0 LISTA para cerrar.**

Para arrancar Fase 1 (solo TypeScript, sin DB) necesito tu aprobación de las reglas **R3'/R3''** y **R4'/R4''** revisadas — son las que cambiaron respecto del plan inicial.
