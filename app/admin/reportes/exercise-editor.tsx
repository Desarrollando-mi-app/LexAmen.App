"use client";

import { useState, useEffect } from "react";
import { exerciseCode, EXERCISE_TYPE_LABEL, type ExerciseType } from "@/lib/exercise-codes";

interface Props {
  exerciseType: ExerciseType;
  exerciseId: string;
  initialSnapshot: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
}

/* ─── Type-specific form components ─── */

interface FieldProps<T = string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  rows?: number;
  type?: "text" | "number";
}

function TextField({ label, value, onChange, rows = 0 }: FieldProps) {
  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
        {label}
      </label>
      {rows > 0 ? (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full resize-y rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
        />
      ) : (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
        />
      )}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
        {label}
      </label>
      <input
        type="number"
        value={value ?? 0}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
      />
    </div>
  );
}

function SelectField<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
        {label}
      </label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink focus:border-gz-gold focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function CheckField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 font-archivo text-[13px] text-gz-ink">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      {label}
    </label>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: unknown; onChange: (v: unknown) => void }) {
  const [text, setText] = useState(() => {
    try { return typeof value === "string" ? value : JSON.stringify(value, null, 2); }
    catch { return ""; }
  });
  const [error, setError] = useState<string | null>(null);

  function handleChange(t: string) {
    setText(t);
    try {
      const parsed = JSON.parse(t);
      onChange(parsed);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "JSON inválido");
    }
  }

  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">
        {label} {error && <span className="text-gz-burgundy normal-case tracking-normal">— {error}</span>}
      </label>
      <textarea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        rows={10}
        className={`w-full resize-y rounded-[3px] border bg-white px-3 py-2 font-ibm-mono text-[11px] text-gz-ink focus:outline-none ${error ? "border-gz-burgundy" : "border-gz-rule focus:border-gz-gold"}`}
      />
    </div>
  );
}

const RAMA_OPTS = [
  { value: "DERECHO_CIVIL", label: "Derecho Civil" },
  { value: "DERECHO_PROCESAL_CIVIL", label: "Procesal Civil" },
  { value: "DERECHO_ORGANICO", label: "Orgánico" },
];

const DIFICULTAD_OPTS_NUM = [
  { value: "1", label: "Básico" },
  { value: "2", label: "Intermedio" },
  { value: "3", label: "Avanzado" },
];

const DIFICULTAD_OPTS_STR = [
  { value: "BASICO", label: "Básico" },
  { value: "INTERMEDIO", label: "Intermedio" },
  { value: "AVANZADO", label: "Avanzado" },
];

/* ─── Main editor ─── */

export function ExerciseEditor({ exerciseType, exerciseId, initialSnapshot, onClose, onSaved }: Props) {
  const [record, setRecord] = useState<Record<string, unknown> | null>(initialSnapshot);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch fresh record if no snapshot
  useEffect(() => {
    if (record) return;
    setLoading(true);
    fetch(`/api/admin/exercise/${exerciseType}/${exerciseId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setRecord(data.record);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [exerciseType, exerciseId, record]);

  function set(field: string, value: unknown) {
    setRecord((r) => (r ? { ...r, [field]: value } : r));
  }

  async function handleSave() {
    if (!record || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/exercise/${exerciseType}/${exerciseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error de red");
    } finally {
      setSaving(false);
    }
  }

  const code = exerciseCode(exerciseType, exerciseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[4px] border border-gz-rule p-6 shadow-lg" style={{ backgroundColor: "var(--gz-cream)" }}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="font-cormorant text-[20px] !font-bold text-gz-ink">Editar {code}</h3>
            <p className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light">{EXERCISE_TYPE_LABEL[exerciseType]}</p>
          </div>
          <button onClick={onClose} className="font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink">✕</button>
        </div>

        {loading && <p className="font-archivo text-[13px] text-gz-ink-light">Cargando...</p>}

        {record && !loading && (
          <div className="space-y-4">
            {/* Common fields rendered conditionally per type */}
            {exerciseType === "FLASHCARD" && (
              <>
                <TextField label="Front" value={(record.front as string) ?? ""} onChange={(v) => set("front", v)} rows={3} />
                <TextField label="Back" value={(record.back as string) ?? ""} onChange={(v) => set("back", v)} rows={5} />
                <TextField label="Artículo Ref" value={(record.articuloRef as string) ?? ""} onChange={(v) => set("articuloRef", v)} />
              </>
            )}

            {exerciseType === "MCQ" && (
              <>
                <TextField label="Pregunta" value={(record.question as string) ?? ""} onChange={(v) => set("question", v)} rows={3} />
                <TextField label="Opción A" value={(record.optionA as string) ?? ""} onChange={(v) => set("optionA", v)} rows={2} />
                <TextField label="Opción B" value={(record.optionB as string) ?? ""} onChange={(v) => set("optionB", v)} rows={2} />
                <TextField label="Opción C" value={(record.optionC as string) ?? ""} onChange={(v) => set("optionC", v)} rows={2} />
                <TextField label="Opción D" value={(record.optionD as string) ?? ""} onChange={(v) => set("optionD", v)} rows={2} />
                <SelectField label="Opción correcta" value={(record.correctOption as string) ?? "A"} onChange={(v) => set("correctOption", v)} options={[{ value: "A", label: "A" }, { value: "B", label: "B" }, { value: "C", label: "C" }, { value: "D", label: "D" }]} />
                <TextField label="Explicación" value={(record.explanation as string) ?? ""} onChange={(v) => set("explanation", v)} rows={3} />
              </>
            )}

            {exerciseType === "TRUEFALSE" && (
              <>
                <TextField label="Afirmación" value={(record.statement as string) ?? ""} onChange={(v) => set("statement", v)} rows={3} />
                <CheckField label="Es verdadero" value={(record.isTrue as boolean) ?? false} onChange={(v) => set("isTrue", v)} />
                <TextField label="Explicación" value={(record.explanation as string) ?? ""} onChange={(v) => set("explanation", v)} rows={3} />
              </>
            )}

            {exerciseType === "DEFINICION" && (
              <>
                <TextField label="Concepto" value={(record.concepto as string) ?? ""} onChange={(v) => set("concepto", v)} />
                <TextField label="Definición" value={(record.definicion as string) ?? ""} onChange={(v) => set("definicion", v)} rows={4} />
                <TextField label="Distractor 1" value={(record.distractor1 as string) ?? ""} onChange={(v) => set("distractor1", v)} />
                <TextField label="Distractor 2" value={(record.distractor2 as string) ?? ""} onChange={(v) => set("distractor2", v)} />
                <TextField label="Distractor 3" value={(record.distractor3 as string) ?? ""} onChange={(v) => set("distractor3", v)} />
                <TextField label="Explicación" value={(record.explicacion as string) ?? ""} onChange={(v) => set("explicacion", v)} rows={3} />
              </>
            )}

            {exerciseType === "FILLBLANK" && (
              <>
                <TextField label="Texto con blancos" value={(record.textoConBlancos as string) ?? ""} onChange={(v) => set("textoConBlancos", v)} rows={4} />
                <JsonField label="Blancos (JSON)" value={record.blancos} onChange={(v) => set("blancos", v)} />
                <TextField label="Explicación" value={(record.explicacion as string) ?? ""} onChange={(v) => set("explicacion", v)} rows={3} />
              </>
            )}

            {exerciseType === "ERROR_IDENTIFICATION" && (
              <>
                <TextField label="Texto con errores" value={(record.textoConErrores as string) ?? ""} onChange={(v) => set("textoConErrores", v)} rows={5} />
                <JsonField label="Segmentos (JSON)" value={record.segmentos} onChange={(v) => set("segmentos", v)} />
                <NumberField label="Total errores" value={(record.totalErrores as number) ?? 1} onChange={(v) => set("totalErrores", v)} />
                <TextField label="Explicación general" value={(record.explicacionGeneral as string) ?? ""} onChange={(v) => set("explicacionGeneral", v)} rows={3} />
              </>
            )}

            {exerciseType === "ORDER_SEQUENCE" && (
              <>
                <TextField label="Título" value={(record.titulo as string) ?? ""} onChange={(v) => set("titulo", v)} />
                <TextField label="Instrucción" value={(record.instruccion as string) ?? ""} onChange={(v) => set("instruccion", v)} rows={2} />
                <JsonField label="Items (JSON)" value={record.items} onChange={(v) => set("items", v)} />
                <TextField label="Explicación" value={(record.explicacion as string) ?? ""} onChange={(v) => set("explicacion", v)} rows={3} />
              </>
            )}

            {exerciseType === "MATCH_COLUMNS" && (
              <>
                <TextField label="Título" value={(record.titulo as string) ?? ""} onChange={(v) => set("titulo", v)} />
                <TextField label="Columna izq label" value={(record.columnaIzqLabel as string) ?? ""} onChange={(v) => set("columnaIzqLabel", v)} />
                <TextField label="Columna der label" value={(record.columnaDerLabel as string) ?? ""} onChange={(v) => set("columnaDerLabel", v)} />
                <JsonField label="Pares (JSON)" value={record.pares} onChange={(v) => set("pares", v)} />
                <TextField label="Explicación" value={(record.explicacion as string) ?? ""} onChange={(v) => set("explicacion", v)} rows={3} />
              </>
            )}

            {exerciseType === "CASO_PRACTICO" && (
              <>
                <TextField label="Título" value={(record.titulo as string) ?? ""} onChange={(v) => set("titulo", v)} />
                <TextField label="Hechos" value={(record.hechos as string) ?? ""} onChange={(v) => set("hechos", v)} rows={6} />
                <JsonField label="Preguntas (JSON)" value={record.preguntas} onChange={(v) => set("preguntas", v)} />
                <TextField label="Resumen final" value={(record.resumenFinal as string) ?? ""} onChange={(v) => set("resumenFinal", v)} rows={3} />
              </>
            )}

            {exerciseType === "DICTADO" && (
              <>
                <TextField label="Título" value={(record.titulo as string) ?? ""} onChange={(v) => set("titulo", v)} />
                <TextField label="Texto completo" value={(record.textoCompleto as string) ?? ""} onChange={(v) => set("textoCompleto", v)} rows={8} />
              </>
            )}

            {exerciseType === "TIMELINE" && (
              <>
                <TextField label="Título" value={(record.titulo as string) ?? ""} onChange={(v) => set("titulo", v)} />
                <TextField label="Instrucción" value={(record.instruccion as string) ?? ""} onChange={(v) => set("instruccion", v)} rows={2} />
                <JsonField label="Eventos (JSON)" value={record.eventos} onChange={(v) => set("eventos", v)} />
                <TextField label="Escala" value={(record.escala as string) ?? ""} onChange={(v) => set("escala", v)} />
                <NumberField label="Rango mín" value={(record.rangoMin as number) ?? 0} onChange={(v) => set("rangoMin", v)} />
                <NumberField label="Rango máx" value={(record.rangoMax as number) ?? 100} onChange={(v) => set("rangoMax", v)} />
                <TextField label="Explicación" value={(record.explicacion as string) ?? ""} onChange={(v) => set("explicacion", v)} rows={3} />
              </>
            )}

            {/* Common metadata for all */}
            <div className="grid grid-cols-2 gap-3 border-t border-gz-rule pt-4">
              <SelectField label="Rama" value={(record.rama as string) ?? "DERECHO_CIVIL"} onChange={(v) => set("rama", v)} options={RAMA_OPTS} />
              <TextField label="Libro" value={(record.libro as string) ?? ""} onChange={(v) => set("libro", v)} />
              <TextField label="Título" value={((record.titulo ?? record.tituloMateria) as string) ?? ""} onChange={(v) => set(exerciseType === "FLASHCARD" || exerciseType === "MCQ" || exerciseType === "TRUEFALSE" || exerciseType === "DEFINICION" || exerciseType === "FILLBLANK" || exerciseType === "ERROR_IDENTIFICATION" ? "titulo" : "tituloMateria", v)} />
              {(exerciseType === "FLASHCARD" || exerciseType === "MCQ" || exerciseType === "TRUEFALSE") ? (
                <SelectField label="Dificultad" value={(record.dificultad as string) ?? "BASICO"} onChange={(v) => set("dificultad", v)} options={DIFICULTAD_OPTS_STR} />
              ) : (
                <SelectField label="Dificultad" value={String(record.dificultad ?? 2)} onChange={(v) => set("dificultad", parseInt(v))} options={DIFICULTAD_OPTS_NUM} />
              )}
            </div>

            {error && (
              <div className="rounded-[3px] border border-gz-burgundy bg-gz-burgundy/10 p-3 font-archivo text-[13px] text-gz-burgundy">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-gz-rule pt-4">
              <button onClick={onClose} disabled={saving} className="rounded-[3px] px-4 py-2 font-archivo text-[13px] text-gz-ink-light hover:text-gz-ink">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} className="rounded-[3px] bg-gz-navy px-5 py-2 font-archivo text-[13px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50">
                {saving ? "Guardando..." : "💾 Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
