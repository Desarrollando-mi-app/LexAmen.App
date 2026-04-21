# Fase 7 — Ejercicios flaggeados para revisión manual

Detectados durante el ranking LLM (openai gpt-4o-mini + claude-haiku-4-5).
Son casos donde Haiku marcó `aplica=false` **con razón de alta confianza**
que apunta a contenido fuera del scope curricular (no solo "no aplica a la rama target", sino "parece mal clasificado en su rama primaria").

---

## #1 — MCQ sobre TOP (Tribunal Oral en lo Penal)

| Campo | Valor |
|---|---|
| **id** | `cmn17dmry007hy40zfiv7mo5p` |
| **modelo** | MCQ |
| **rama actual** | `DERECHO_ORGANICO` |
| **libro / tituloRef** | `LIBRO_COT` / `COT_T3` |
| **codigo** | `CODIGO_ORGANICO_TRIBUNALES` |
| **pregunta** | "Contra la sentencia del TOP procede:" |

**Problema detectado por Haiku:**
> Ejercicio específico sobre recursos contra sentencias del TOP (Tribunal Oral
> en lo Penal). Regulación sustancial en CPP arts. 372-387. CPC tiene régimen
> distinto de recursos (apelación, casación).

**Análisis:**
El TOP es un tribunal penal. El recurso procedente (recurso de nulidad,
CPP arts. 372-387) es materia de **Derecho Procesal Penal**, que está fuera
del scope de Studio Iuris (Civil / Procesal Civil / Orgánico).

La rama correcta sería `DERECHO_PROCESAL_PENAL` (que no existe en el enum
`Rama`). El COT sí regula la existencia del TOP (art. 17) pero las normas de
**recursos contra sentencias penales** no son parte del COT.

**Acción sugerida:** revisar manualmente. Opciones:
1. **Reclasificar:** mover a un futuro módulo de Procesal Penal (cuando exista)
2. **Desactivar:** `UPDATE "MCQ" SET ...` (si MCQ tiene flag análogo a `isActive`)
3. **Mantener** si se acepta como ejercicio "orgánico periférico" sobre
   competencia del TOP

**Dueño de la decisión:** Bastian (scope curricular).
