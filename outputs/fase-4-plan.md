# Fase 4 — Plan de clasificación por párrafo (DRY-RUN)

_Generado 2026-04-19T20:03:01.512Z. Sin escrituras en DB._

**Candidatos (titulo válido + parrafo=NULL): 12026**

## Distribución por regla

| Regla | Count | % | Acción |
|-------|------:|--:|--------|
| **P1** | 5785 | 48.1% | Titulo sin párrafos definidos → skip |
| **P5** | 2446 | 20.3% | Ambiguo (0 o múltiples matches) → mantener NULL |
| **P4** | 1791 | 14.9% | Match único por keyword del label |
| **P3** | 1359 | 11.3% | Match por artículo (art. N ∈ rango) |
| **P6** | 645 | 5.4% | Fallback a 'Reglas generales' (P1 del titulo) |

## Por regla · por modelo

| Regla | FC | MCQ | V/F | Def | Fill | Err | Ord | Match | Caso | Dict | TL | Total |
|-------|---:|----:|----:|----:|-----:|----:|----:|------:|-----:|-----:|---:|-----:|
| **P1** | 1675 | 1055 | 913 | 625 | 372 | 261 | 109 | 238 | 176 | 281 | 80 | **5785** |
| **P5** | 687 | 482 | 369 | 259 | 166 | 90 | 51 | 111 | 69 | 117 | 45 | **2446** |
| **P4** | 510 | 326 | 295 | 201 | 120 | 86 | 35 | 58 | 65 | 75 | 20 | **1791** |
| **P3** | 449 | 216 | 212 | 164 | 62 | 66 | 32 | 36 | 28 | 70 | 24 | **1359** |
| **P6** | 124 | 156 | 123 | 59 | 57 | 18 | 11 | 48 | 20 | 19 | 10 | **645** |

## Top 30 títulos con más P5 (ambiguos — quedan NULL)

| Titulo | P5 count | Total del titulo |
|--------|---------:|-----------------:|
| `COT_T7` | 410 | 1174 |
| `COT_T2` | 169 | 198 |
| `LIII_T6` | 150 | 363 |
| `LII_T7` | 139 | 194 |
| `LIV_T23` | 87 | 132 |
| `LIV_T2` | 87 | 220 |
| `COT_T11` | 86 | 233 |
| `LIV_T42` | 73 | 101 |
| `LIV_T22` | 73 | 194 |
| `LIV_T22A` | 63 | 146 |
| `LIII_T3` | 58 | 69 |
| `COT_T5` | 58 | 61 |
| `LIV_T12` | 54 | 102 |
| `CPC_LII_T11` | 54 | 215 |
| `CPC_LI_T19` | 52 | 52 |
| `LI_T2` | 46 | 99 |
| `LI_T7` | 46 | 78 |
| `LIII_T7` | 43 | 555 |
| `LI_T6` | 42 | 209 |
| `LII_T11` | 41 | 60 |
| `LII_T1` | 38 | 55 |
| `COT_T12` | 38 | 47 |
| `COT_T6` | 35 | 59 |
| `LIV_T32` | 34 | 47 |
| `LIV_T26` | 33 | 40 |
| `LI_T30` | 33 | 40 |
| `LIV_T36` | 31 | 39 |
| `LII_T12` | 29 | 48 |
| `LI_T19` | 26 | 44 |
| `LIV_T25` | 25 | 44 |

## Muestra — primeras 15 asignaciones por regla

### P4

| Modelo | id | titulo | → parrafo | nota |
|--------|----|--------|-----------|------|
| flashcard | `cmn16o0w` | `LI_T1` | `LI_T1_P4` | keyword match |
| flashcard | `cmn16o16` | `LI_T1` | `LI_T1_P3` | dominant keyword (5 vs 2) |
| flashcard | `cmn16o1c` | `LI_T1` | `LI_T1_P3` | dominant keyword (2 vs 1) |
| flashcard | `cmn16o1q` | `LI_T2` | `LI_T2_P1` | dominant keyword (2 vs 1) |
| flashcard | `cmn16o25` | `LI_T2` | `LI_T2_P3` | keyword match |
| flashcard | `cmn16o3l` | `LI_T1` | `LI_T1_P4` | dominant keyword (4 vs 1) |
| flashcard | `cmn16o3n` | `LI_T1` | `LI_T1_P4` | keyword match |
| flashcard | `cmn16o3q` | `LI_T1` | `LI_T1_P4` | dominant keyword (3 vs 1) |
| flashcard | `cmn16oii` | `LI_T8` | `LI_T8_P2` | keyword match |
| flashcard | `cmn16oik` | `LI_T8` | `LI_T8_P2` | keyword match |
| flashcard | `cmn16oil` | `LI_T8` | `LI_T8_P2` | keyword match |
| flashcard | `cmn16oin` | `LI_T8` | `LI_T8_P2` | dominant keyword (2 vs 1) |
| flashcard | `cmn16ois` | `LI_T8` | `LI_T8_P3` | keyword match |
| flashcard | `cmn16ojg` | `LI_T10` | `LI_T10_P2` | dominant keyword (4 vs 2) |
| flashcard | `cmn16oji` | `LI_T10` | `LI_T10_P2` | dominant keyword (6 vs 2) |

### P3

| Modelo | id | titulo | → parrafo | nota |
|--------|----|--------|-----------|------|
| flashcard | `cmn16o2g` | `LI_T2` | `LI_T2_P2` | override: "muerte natural" |
| flashcard | `cmn16o2l` | `LI_T2` | `LI_T2_P3` | override: "muerte presunta" |
| flashcard | `cmn16o2q` | `LI_T2` | `LI_T2_P3` | override: "muerte presunta" |
| flashcard | `cmn16o2s` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o3f` | `LI_T2` | `LI_T2_P3` | override: "muerte presunta" |
| flashcard | `cmn16o2x` | `LI_T2` | `LI_T2_P3` | override: "muerte presunta" |
| flashcard | `cmn16o2z` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o30` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o38` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o3b` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o3d` | `LI_T2` | `LI_T2_P3` | override: "desaparecido" |
| flashcard | `cmn16o3j` | `LI_T2` | `LI_T2_P1` | override: "existencia natural" |
| flashcard | `cmnnwp8g` | `LI_T6` | `LI_T6_P5` | override: "separación judicial" |
| flashcard | `cmn16ohu` | `LI_T7` | `LI_T7_P3` | override: "filiación matrimonial" |
| flashcard | `cmn16ohy` | `LI_T7` | `LI_T7_P3` | override: "filiación matrimonial" |

### P6

| Modelo | id | titulo | → parrafo | nota |
|--------|----|--------|-----------|------|
| flashcard | `cmn16ohw` | `LI_T7` | `LI_T7_P1` | fallback a reglas generales |
| flashcard | `cmn16oi5` | `LI_T7` | `LI_T7_P1` | fallback a reglas generales |
| flashcard | `cmn16oi7` | `LI_T7` | `LI_T7_P1` | fallback a reglas generales |
| flashcard | `cmn16oi9` | `LI_T7` | `LI_T7_P1` | fallback a reglas generales |
| flashcard | `cmn16oia` | `LI_T7` | `LI_T7_P1` | fallback a reglas generales |
| flashcard | `cmn16oir` | `LI_T8` | `LI_T8_P1` | fallback a reglas generales |
| flashcard | `cmn16oiw` | `LI_T8` | `LI_T8_P1` | fallback a reglas generales |
| flashcard | `cmn16or5` | `LI_T19` | `LI_T19_P1` | fallback a reglas generales |
| flashcard | `cmn16org` | `LI_T19` | `LI_T19_P1` | fallback a reglas generales |
| flashcard | `cmn16ori` | `LI_T19` | `LI_T19_P1` | fallback a reglas generales |
| flashcard | `cmn16oza` | `LII_T2` | `LII_T2_P1` | fallback a reglas generales |
| flashcard | `cmn16ozd` | `LII_T2` | `LII_T2_P1` | fallback a reglas generales |
| flashcard | `cmn16ozj` | `LII_T2` | `LII_T2_P1` | fallback a reglas generales |
| flashcard | `cmn16ozk` | `LII_T2` | `LII_T2_P1` | fallback a reglas generales |
| flashcard | `cmn16ozm` | `LII_T2` | `LII_T2_P1` | fallback a reglas generales |

## Siguiente paso

- Revisa el CSV y el resumen.
- Si te parece bien, corremos `scripts/fase4-apply.ts` — actualiza `parrafo` en las filas P2/P3/P4.
- P1 (titulo sin párrafos) y P5 (ambiguo) quedan con `parrafo=NULL`. Son candidatas de Fase 5.
