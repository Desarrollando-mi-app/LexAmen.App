# Fase 9 · QA Final
_Auditoría generada el 2026-04-21_

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total rows (11 modelos) | 15.681 |
| Total integradores (`esIntegrador=true`) | 1.647 |
| % integradores sobre total | 10.5% |
| Orphans libro (agrupaciones) | 90 |
| Orphans parrafo (agrupaciones) | 0 |
| LEY_17336 fuera de estructura | 0 |

---

## Integradores por módulo

| Módulo | Total rows | Integradores | % |
|--------|-----------:|-------------:|--:|
| Flashcard | 4327 | 418 | 9.7% |
| MCQ | 2945 | 313 | 10.6% |
| TrueFalse | 2486 | 303 | 12.2% |
| Definicion | 1728 | 187 | 10.8% |
| FillBlank | 1048 | 126 | 12.0% |
| ErrorIdentification | 689 | 70 | 10.2% |
| OrderSequence | 320 | 4 | 1.3% |
| MatchColumns | 694 | 86 | 12.4% |
| CasoPractico | 489 | 64 | 13.1% |
| DictadoJuridico | 713 | 70 | 9.8% |
| Timeline | 242 | 6 | 2.5% |
| **Total** | **15681** | **1647** | **10.5%** |

---

## LEY_17336 · Distribución por título/párrafo

| Título/Párrafo | Rows |
|----------------|-----:|
| L17336_T1/L17336_T1_P1 | 38 |
| L17336_T1/L17336_T1_P2 | 2 |
| L17336_T1/L17336_T1_P3 | 6 |
| L17336_T1/L17336_T1_P4 | 8 |
| L17336_T1/L17336_T1_P5 | 31 |
| L17336_T3 | 16 |
| L17336_T4 | 11 |
| L17336_T5 | 3 |
| **Total** | **115** |

✓ Todos los registros con libro=LEY_17336 apuntan correctamente a L17336_T*.

---

## Orphans · `libro` no existente en CURRICULUM (90)

| Rama | Libro | Rows afectadas |
|------|-------|---------------:|
| DERECHO_CIVIL | CODIGO_CIVIL | 1798 |
| DERECHO_PROCESAL_CIVIL | CPC | 733 |
| DERECHO_PROCESAL_CIVIL | CPC_LIBRO_II | 306 |
| DERECHO_PROCESAL_CIVIL | CPC_LIBRO_I | 257 |
| DERECHO_ORGANICO | COT | 238 |
| DERECHO_PROCESAL_CIVIL | CPC_LIBRO_III | 191 |
| DERECHO_PROCESAL_CIVIL | MODULO_DIARIO | 187 |
| DERECHO_PROCESAL_CIVIL | CPC_LIBRO_IV | 95 |
| DERECHO_PROCESAL_CIVIL | LIBRO_COT | 88 |
| DERECHO_PROCESAL_CIVIL | COT | 83 |
| DERECHO_CIVIL | CPC | 39 |
| DERECHO_PROCESAL_CIVIL | CPC_INTEGRADOR | 15 |
| DERECHO_PROCESAL_CIVIL | LIBRO_I | 2 |

---

## Orphans · `parrafo` no existente en CURRICULUM para su título (0)

_Todos los valores de `parrafo` son válidos para su (rama, título)._
