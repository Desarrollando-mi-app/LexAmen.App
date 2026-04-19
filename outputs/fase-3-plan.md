# Fase 3 — Plan de reclasificación (DRY-RUN)

_Generado 2026-04-19T19:33:06.061Z. Sin escrituras en DB._

**Total huérfanos detectados: 3634**

## Distribución por regla

| Regla | Count | % | Acción |
|-------|-------|---|--------|
| **R8** | 1915 | 52.7% | Sin match — requiere revisión manual |
| **R1** | 1647 | 45.3% | Marcar `esIntegrador=true`, mantener titulo |
| **RM** | 72 | 2.0% | Metadata (FORMATO_*, REVISTA, CITACION…) — revisar/eliminar |

## Por regla · por modelo

| Regla | FC | MCQ | V/F | Def | Fill | Err | Ord | Match | Caso | Dict | TL | Total |
|-------|----|-----|-----|-----|------|-----|-----|-------|------|------|----|----|
| **R8** | 429 | 380 | 263 | 223 | 142 | 96 | 75 | 114 | 58 | 80 | 55 | **1915** |
| **R1** | 418 | 313 | 303 | 187 | 126 | 70 | 4 | 86 | 64 | 70 | 6 | **1647** |
| **RM** | 21 | 15 | 7 | 6 | 3 | 2 | 3 | 3 | 9 | 1 | 2 | **72** |

## Titulos de origen (top 30)

| Origen (titulo) | Total | Distribución por regla |
|-----------------|-------|------------------------|
| `CPC_JUICIO_ORDINARIO` | 727 | R1: 727 |
| `LIBRO_IV` | 647 | R8: 647 |
| `CPC_JUICIOS_ESPECIALES` | 468 | R1: 468 |
| `LIBRO_II` | 438 | R8: 438 |
| `LIBRO_I` | 325 | R8: 325 |
| `LIBRO_III` | 228 | R8: 228 |
| `CPC_ACTOS_NO_CONTENCIOSOS` | 176 | R1: 176 |
| `COT_INTEGRADOR_FINAL` | 159 | R1: 159 |
| `JURISPRUDENCIA` | 105 | R1: 105 |
| `LIV` | 77 | R8: 77 |
| `LII` | 39 | R8: 39 |
| `TITULO_III` | 36 | R8: 36 |
| `LI` | 31 | R8: 31 |
| `TITULO_I` | 26 | R8: 26 |
| `LIII` | 19 | R8: 19 |
| `TITULO_V` | 17 | R8: 17 |
| `FORMATO_B` | 16 | RM: 16 |
| `INTEGRACION` | 13 | RM: 13 |
| `CPC_COMPLETO` | 12 | R1: 12 |
| `TITULO_II` | 11 | R8: 11 |
| `REGLAS` | 11 | R8: 11 |
| `FORMATO_D` | 9 | RM: 9 |
| `CITACION` | 8 | RM: 8 |
| `REVISTA` | 7 | RM: 7 |
| `TITULO_IV` | 6 | R8: 6 |
| `FORMATO_DEBATE` | 5 | RM: 5 |
| `(null)` | 4 | R8: 4 |
| `FORMATO_A` | 3 | RM: 3 |
| `Del Analisis de Fallos` | 2 | RM: 2 |
| `FORMATO_C` | 1 | RM: 1 |

## R8 — Filas que quedan sin cambio (requieren revisión manual)

| (rama · titulo) | Count |
|------------------|-------|
| `DERECHO_CIVIL·LIBRO_IV` | 647 |
| `DERECHO_PROCESAL_CIVIL·LIBRO_II` | 297 |
| `DERECHO_PROCESAL_CIVIL·LIBRO_III` | 217 |
| `DERECHO_CIVIL·LIBRO_I` | 173 |
| `DERECHO_PROCESAL_CIVIL·LIBRO_I` | 152 |
| `DERECHO_CIVIL·LIBRO_II` | 141 |
| `DERECHO_CIVIL·LIV` | 77 |
| `DERECHO_CIVIL·LII` | 39 |
| `DERECHO_CIVIL·TITULO_III` | 36 |
| `DERECHO_CIVIL·LI` | 31 |
| `DERECHO_CIVIL·TITULO_I` | 26 |
| `DERECHO_CIVIL·LIII` | 19 |
| `DERECHO_CIVIL·TITULO_V` | 17 |
| `DERECHO_CIVIL·TITULO_II` | 11 |
| `DERECHO_PROCESAL_CIVIL·REGLAS` | 11 |
| `DERECHO_CIVIL·LIBRO_III` | 11 |
| `DERECHO_CIVIL·TITULO_IV` | 6 |
| `DERECHO_PROCESAL_CIVIL·(null)` | 3 |
| `DERECHO_CIVIL·(null)` | 1 |

## Muestra — primeras 20 asignaciones por regla

### R1

| Modelo | id | rama | old_titulo | → new_titulo | integrador | nota |
|--------|----|------|-----------|--------------|------------|------|
| flashcard | `cmn3zgqg` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqj` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqv` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmnnwtpl` | PROCESAL_CIVIL | `CPC_JUICIO_ORDINARIO` | `CPC_JUICIO_ORDINARIO` | ✓ | Integrador |
| flashcard | `cmnnwtpm` | PROCESAL_CIVIL | `CPC_JUICIO_ORDINARIO` | `CPC_JUICIO_ORDINARIO` | ✓ | Integrador |
| flashcard | `cmn3zgq6` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqa` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqc` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqe` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqh` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgql` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqo` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqq` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqs` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmnnwtpu` | PROCESAL_CIVIL | `CPC_JUICIO_ORDINARIO` | `CPC_JUICIO_ORDINARIO` | ✓ | Integrador |
| flashcard | `cmn3zgqt` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmnnwtpw` | PROCESAL_CIVIL | `CPC_JUICIO_ORDINARIO` | `CPC_JUICIO_ORDINARIO` | ✓ | Integrador |
| flashcard | `cmn3zgqx` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgqz` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |
| flashcard | `cmn3zgr0` | PROCESAL_CIVIL | `JURISPRUDENCIA` | `JURISPRUDENCIA` | ✓ | Integrador |

### RM

| Modelo | id | rama | old_titulo | → new_titulo | integrador | nota |
|--------|----|------|-----------|--------------|------------|------|
| flashcard | `cmn3wgqx` | PROCESAL_CIVIL | `FORMATO_B` | `FORMATO_B` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgqz` | PROCESAL_CIVIL | `FORMATO_B` | `FORMATO_B` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgr1` | PROCESAL_CIVIL | `FORMATO_A` | `FORMATO_A` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgr3` | PROCESAL_CIVIL | `FORMATO_B` | `FORMATO_B` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgr5` | PROCESAL_CIVIL | `FORMATO_C` | `FORMATO_C` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgr7` | PROCESAL_CIVIL | `FORMATO_D` | `FORMATO_D` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgr9` | PROCESAL_CIVIL | `CITACION` | `CITACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgra` | PROCESAL_CIVIL | `REVISTA` | `REVISTA` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgri` | PROCESAL_CIVIL | `INTEGRACION` | `INTEGRACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3wgrk` | PROCESAL_CIVIL | `INTEGRACION` | `INTEGRACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgr2` | PROCESAL_CIVIL | `CITACION` | `CITACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgr4` | PROCESAL_CIVIL | `CITACION` | `CITACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgr6` | PROCESAL_CIVIL | `CITACION` | `CITACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgr7` | PROCESAL_CIVIL | `REVISTA` | `REVISTA` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgr9` | PROCESAL_CIVIL | `FORMATO_DEBATE` | `FORMATO_DEBATE` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgrc` | PROCESAL_CIVIL | `INTEGRACION` | `INTEGRACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgrg` | PROCESAL_CIVIL | `INTEGRACION` | `INTEGRACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgri` | PROCESAL_CIVIL | `PUBLICACION` | `PUBLICACION` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgrj` | PROCESAL_CIVIL | `FORMATO_D` | `FORMATO_D` |  | metadata no-ejercicio — revisar |
| flashcard | `cmn3zgrl` | PROCESAL_CIVIL | `INTEGRACION` | `INTEGRACION` |  | metadata no-ejercicio — revisar |

## Siguiente paso

- Revisa el CSV (`outputs/fase-3-plan.csv`) y el resumen arriba.
- Si las reglas lucen bien, apruebas y corro `scripts/fase3-apply.ts` — aplica los UPDATEs en batches con rollback por modelo.
- Las filas R8 quedan intocadas (riesgo cero) y se abordan en Fase 5 (rebalanceo).
