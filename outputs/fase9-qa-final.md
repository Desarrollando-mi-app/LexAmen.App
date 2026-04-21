# Fase 9 · QA Final
_Auditoría generada el 2026-04-21_

---

## Resumen

| Métrica | Valor |
|---------|-------|
| Total rows (11 modelos) | 15.756 |
| Total integradores (`esIntegrador=true`) | 1.647 |
| % integradores sobre total | 10.5% |
| Orphans libro (agrupaciones) | 11 |
| Orphans parrafo (agrupaciones) | 7 |
| LEY_17336 fuera de estructura | 93 |

---

## Integradores por módulo

| Módulo | Total rows | Integradores | % |
|--------|-----------:|-------------:|--:|
| Flashcard | 4371 | 418 | 9.6% |
| MCQ | 2957 | 313 | 10.6% |
| TrueFalse | 2495 | 303 | 12.1% |
| Definicion | 1738 | 187 | 10.8% |
| FillBlank | 1048 | 126 | 12.0% |
| ErrorIdentification | 689 | 70 | 10.2% |
| OrderSequence | 320 | 4 | 1.3% |
| MatchColumns | 694 | 86 | 12.4% |
| CasoPractico | 489 | 64 | 13.1% |
| DictadoJuridico | 713 | 70 | 9.8% |
| Timeline | 242 | 6 | 2.5% |
| **Total** | **15756** | **1647** | **10.5%** |

---

## LEY_17336 · Distribución por título/párrafo

| Título/Párrafo | Rows |
|----------------|-----:|
| L17336_T1/L17336_T1_P1 | 2 |
| L17336_T1/L17336_T1_P2 | 1 |
| L17336_T1/L17336_T1_P4 | 2 |
| L17336_T1/L17336_T1_P5 | 4 |
| L17336_T1/LIV_T25_P1 | 3 |
| L17336_T1/LIV_T25_P3 | 3 |
| L17336_T3 | 5 |
| L17336_T3/LIV_T42_P2 | 1 |
| L17336_T5 | 1 |
| **Total** | **22** |

⚠ **93** registros con libro=LEY_17336 apuntan a un título fuera de L17336_*.

---

## Orphans · `libro` no existente en CURRICULUM (11)

| Rama | Libro | Rows afectadas |
|------|-------|---------------:|
| DERECHO_PROCESAL_CIVIL | MODULO_DIARIO | 179 |

---

## Orphans · `parrafo` no existente en CURRICULUM para su título (7)

| Rama | Título | Párrafo | Rows afectadas |
|------|--------|---------|---------------:|
| DERECHO_CIVIL | L17336_T1 | LIV_T25_P3 | 3 |
| DERECHO_CIVIL | L17336_T1 | LIV_T25_P1 | 3 |
| DERECHO_CIVIL | L17336_T3 | LIV_T42_P2 | 1 |
