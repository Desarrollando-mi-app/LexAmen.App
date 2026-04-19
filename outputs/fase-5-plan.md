# Fase 5 — Plan de clasificación LLM (DRY-RUN)

_Generado 2026-04-19T22:18:56.734Z. Sin escrituras en DB._

**Candidatos procesados: 4361**
- P5 (parrafo ambiguo): 2446
- R8 (titulo inválido): 1915

## Resultados por tipo y confianza

| Tipo | Alta | Media | Baja | UNKNOWN | Sin asignar |
|------|-----:|------:|-----:|--------:|------------:|
| **P5** | 189 | 5 | 8 | 0 | 2244 |
| **R8** | 131 | 1 | 0 | 0 | 1783 |

## Muestras

### P5

| Modelo | id | rama | old_titulo | → titulo | → parrafo | conf | razón |
|--------|----|------|-----------|----------|-----------|------|-------|
| flashcard | `cmnnxdw0` | CIVIL | `LIV_T32` | `—` | `—` | unknown |  |
| flashcard | `cmn16o0u` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o19` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o1i` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o1k` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o1m` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o1n` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o1s` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o21` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o23` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o26` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o2i` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o2j` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o3o` | CIVIL | `LI_T1` | `—` | `—` | unknown |  |
| flashcard | `cmn16o36` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16o3a` | CIVIL | `LI_T2` | `—` | `—` | unknown |  |
| flashcard | `cmn16ohp` | CIVIL | `LI_T7` | `—` | `—` | unknown |  |
| flashcard | `cmn16ohr` | CIVIL | `LI_T7` | `—` | `—` | unknown |  |
| flashcard | `cmn16ohs` | CIVIL | `LI_T7` | `—` | `—` | unknown |  |
| flashcard | `cmn16oic` | CIVIL | `LI_T8` | `—` | `—` | unknown |  |

### R8

| Modelo | id | rama | old_titulo | → titulo | → parrafo | conf | razón |
|--------|----|------|-----------|----------|-----------|------|-------|
| flashcard | `cmn3wgpn` | CIVIL | `TITULO_I` | `—` | `—` | unknown |  |
| flashcard | `cmn3wh8a` | PROCESAL_CIVIL | `LIBRO_II` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpp` | CIVIL | `TITULO_I` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpr` | CIVIL | `TITULO_I` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpt` | CIVIL | `TITULO_I` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpu` | CIVIL | `TITULO_II` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjmx` | PROCESAL_CIVIL | `LIBRO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjn0` | PROCESAL_CIVIL | `LIBRO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpw` | CIVIL | `TITULO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgpy` | CIVIL | `TITULO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgq0` | CIVIL | `TITULO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgq2` | CIVIL | `TITULO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgq3` | CIVIL | `TITULO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjn2` | PROCESAL_CIVIL | `LIBRO_III` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjr7` | PROCESAL_CIVIL | `LIBRO_III` | `CPC_LI_T17` | `—` | high | El título XVII se refiere a las resoluciones judiciales, que es donde se abordan |
| flashcard | `cmn3wgq5` | CIVIL | `TITULO_III` | `—` | `—` | unknown | No hay un título en el Código Civil chileno que se relacione directamente con el |
| flashcard | `cmn3wgq9` | CIVIL | `TITULO_V` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjxe` | PROCESAL_CIVIL | `LIBRO_II` | `—` | `—` | unknown |  |
| flashcard | `cmn3wjxg` | PROCESAL_CIVIL | `LIBRO_II` | `—` | `—` | unknown |  |
| flashcard | `cmn3wgqd` | CIVIL | `TITULO_I` | `—` | `—` | unknown |  |

## Siguiente paso

- Revisa el CSV.
- Si apruebas, corro `scripts/fase5-apply.ts` para aplicar solo filas con confianza **high** (y opcionalmente **medium**).
- Las **low**/**unknown** quedan marcadas como "requieren revisión editorial".
