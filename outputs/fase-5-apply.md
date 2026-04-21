# Fase 5 — Apply reporte
_Ejecutado 2026-04-20T17:30:37.902Z_
## Parámetros
- `--apply`: sí
- `--include-medium`: no
- Filtro kind: todos
## Totales
- Plan leído: **4361** filas
- Aplicadas (confidence ok + new value): **3088**
- Residuos (para revisión editorial): **1273**
## Por modelo
| Modelo | planned | updated |
|--------|--------:|--------:|
| flashcard | 874 | 874 |
| mcq | 614 | 614 |
| trueFalse | 444 | 444 |
| definicion | 331 | 331 |
| fillBlank | 221 | 221 |
| errorIdentification | 135 | 135 |
| orderSequence | 90 | 90 |
| matchColumns | 101 | 101 |
| casoPractico | 65 | 65 |
| dictadoJuridico | 141 | 141 |
| timeline | 72 | 72 |
## Residuos por confidence
| Kind | low | unknown |
|------|----:|--------:|
| P5 | 96 | 242 |
| R8 | 0 | 875 |
## Siguientes pasos
- Fase 6: extraer integradores a dropdown + UI "Estudiar".
- Los residuos low/unknown quedan para triage editorial manual.