# Fase 5 · Promoción de LOW → MEDIUM

_Generado 2026-04-21T20:33:25.715Z. Estrategia determinística, sin LLM._

## Regla aplicada

Para cada decisión P5 con `confidence=low`:

1. Se buscan los pares con `confidence=high` en el mismo `(rama, título)`.
2. Si hay un párrafo dominante (≥50% de los pares): se hereda ese párrafo.
3. Si no hay mayoría: se asigna `${titulo}_P1` como fallback.

En todos los casos la confianza se promueve a `medium` y `reasoning` recibe un prefijo `[PROMOTED ...]`.

## Resumen

| Métrica | Valor |
|---------|------:|
| Total LOW promovidas | 99 |
| Heredadas de vecinos high | 98 |
| Fallback a P1 | 1 |

## Desglose por título

| Rama | Título | Total | Peer-dominant | P1-fallback |
|------|--------|------:|--------------:|------------:|
| ORGANICO | `COT_T2` | 64 | 64 | 0 |
| CIVIL | `LIII_T6` | 20 | 20 | 0 |
| CIVIL | `LII_T12` | 6 | 6 | 0 |
| ORGANICO | `COT_T16` | 1 | 1 | 0 |
| PROCESAL_CIVIL | `CPC_LI_T19` | 1 | 1 | 0 |
| CIVIL | `LIV_T33` | 1 | 1 | 0 |
| PROCESAL_CIVIL | `CPC_LII_T11` | 1 | 1 | 0 |
| CIVIL | `LII_T1` | 1 | 1 | 0 |
| CIVIL | `LIV_T12` | 1 | 0 | 1 |
| CIVIL | `LI_T2` | 1 | 1 | 0 |
| CIVIL | `LIV_T26` | 1 | 1 | 0 |
| ORGANICO | `COT_T5` | 1 | 1 | 0 |

## Siguiente paso

```bash
# Previsualizar qué se aplicará (incluyendo medium):
npx tsx scripts/fase5-apply.ts --include-medium

# Aplicar a DB:
npx tsx scripts/fase5-apply.ts --apply --include-medium
```
