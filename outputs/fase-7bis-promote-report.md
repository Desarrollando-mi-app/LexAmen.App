# Fase 7-bis · Promoción de LOW → MEDIUM

_Generado 2026-04-21T20:44:16.747Z. Determinístico, sin LLM._

## Regla aplicada

Las 75 rows con `confidence=low` tienen `target_titulo` y `target_libro` válidos — la heurística R8 las emparejó con keywords débiles pero el destino es plausible. Se promueven a `medium` para que `fase7bis-apply --apply` las recoja.

Las 73 rows con `confidence=null` (sin `target_titulo`) se dejan tal cual. Su source row conserva `ramasAdicionales`, lo que garantiza que aparezcan en filtros cross-rama pero sin duplicación en la DB.

## Resumen

| Métrica | Valor |
|---------|------:|
| Rows promovidas low→medium | 75 |
| Rows skipped (null titulo) | 73 |

## Por target_rama (promovidas)

| Target rama | Count |
|---|---:|
| CIVIL | 43 |
| ORGANICO | 16 |
| PROCESAL_CIVIL | 16 |

## Top títulos destino (promovidos)

| target_rama|target_titulo | Count |
|---|---:|
| `DERECHO_PROCESAL_CIVIL|CPC_LIII_T1` | 9 |
| `DERECHO_ORGANICO|COT_T5` | 8 |
| `DERECHO_CIVIL|LI_T2` | 7 |
| `DERECHO_CIVIL|LI_T4` | 7 |
| `DERECHO_CIVIL|LII_T7` | 7 |
| `DERECHO_CIVIL|LIV_T15` | 5 |
| `DERECHO_ORGANICO|COT_T6` | 4 |
| `DERECHO_PROCESAL_CIVIL|CPC_LII_T5` | 4 |
| `DERECHO_ORGANICO|COT_T8` | 3 |
| `DERECHO_CIVIL|LIV_T23` | 3 |
| `DERECHO_CIVIL|LIV_T2` | 3 |
| `DERECHO_CIVIL|LI_T7` | 3 |
| `DERECHO_CIVIL|LIV_T42` | 3 |
| `DERECHO_ORGANICO|COT_T4` | 1 |
| `DERECHO_CIVIL|LI_T1` | 1 |
| `DERECHO_CIVIL|LII_T8` | 1 |
| `DERECHO_CIVIL|LIII_T3` | 1 |
| `DERECHO_CIVIL|LIV_T29` | 1 |
| `DERECHO_CIVIL|LIV_T20` | 1 |
| `DERECHO_PROCESAL_CIVIL|CPC_LIII_T16` | 1 |

## Siguiente paso

```bash
# Previsualizar:
npx tsx scripts/fase7bis-apply.ts --dry-run

# Aplicar a DB:
npx tsx scripts/fase7bis-apply.ts
```
