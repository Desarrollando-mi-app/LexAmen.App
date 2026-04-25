"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MATERIAS_SALA,
  UNIVERSIDADES_CHILE,
} from "@/lib/ayudantia-constants";
import {
  FormSection,
  FormField,
  TextInput,
  TextArea,
  Select,
  Footer,
  FormError,
} from "@/components/sala/publish-sheet";

const FORMATOS = [
  { value: "ONLINE", label: "Online" },
  { value: "PRESENCIAL", label: "Presencial" },
  { value: "AMBOS", label: "Online o presencial" },
] as const;

const PRECIOS = [
  { value: "GRATUITO", label: "Gratuito" },
  { value: "PAGADO", label: "Con honorarios" },
] as const;

const CONTACTOS = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "OTRO", label: "Otro" },
] as const;

const ORIENTADAS_A = [
  "1° año",
  "2° año",
  "3° año",
  "4° año",
  "5° año",
  "Egreso / examen de grado",
];

export interface AyudantiaFormInitialValues {
  type?: "OFREZCO" | "BUSCO";
  titulo?: string | null;
  materia?: string;
  universidad?: string;
  format?: string;
  priceType?: string;
  priceAmount?: number | null;
  description?: string;
  disponibilidad?: string | null;
  contactMethod?: string;
  contactValue?: string;
  orientadaA?: string[] | null;
}

interface AyudantiaFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  /** Si está presente, el form opera en modo edición (PATCH al endpoint). */
  editingId?: string;
  initialValues?: AyudantiaFormInitialValues;
}

/**
 * Form V4 editorial para crear o editar una ayudantía. Modo create:
 * POST /api/sala/ayudantias. Modo edit: PATCH /api/sala/ayudantias/[id].
 * Soporta los dos tipos: OFREZCO (tutor) y BUSCO (estudiante busca tutor).
 * En modo edición el tipo es invariante.
 */
export function AyudantiaForm({
  onCancel,
  onSuccess,
  editingId,
  initialValues,
}: AyudantiaFormProps) {
  const router = useRouter();
  const isEdit = Boolean(editingId);
  const init = initialValues ?? {};

  const [type, setType] = useState<"OFREZCO" | "BUSCO">(init.type ?? "OFREZCO");
  const [titulo, setTitulo] = useState(init.titulo ?? "");
  const [materia, setMateria] = useState(init.materia ?? "");
  const [universidad, setUniversidad] = useState(init.universidad ?? "");
  const [format, setFormat] = useState(init.format ?? "");
  const [priceType, setPriceType] = useState(init.priceType ?? "GRATUITO");
  const [priceAmount, setPriceAmount] = useState(
    init.priceAmount != null ? String(init.priceAmount) : "",
  );
  const [description, setDescription] = useState(init.description ?? "");
  const [disponibilidad, setDisponibilidad] = useState(
    init.disponibilidad ?? "",
  );
  const [contactMethod, setContactMethod] = useState(
    init.contactMethod ?? "WHATSAPP",
  );
  const [contactValue, setContactValue] = useState(init.contactValue ?? "");
  const [orientadaA, setOrientadaA] = useState<string[]>(
    init.orientadaA ?? [],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOfrezco = type === "OFREZCO";

  const canSubmit =
    materia &&
    universidad &&
    format &&
    priceType &&
    description.trim() &&
    contactMethod &&
    contactValue.trim() &&
    (priceType !== "PAGADO" || priceAmount);

  function toggleOrientada(label: string) {
    setOrientadaA((prev) =>
      prev.includes(label)
        ? prev.filter((x) => x !== label)
        : [...prev, label],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Completa los campos requeridos antes de publicar.");
      return;
    }
    if (description.length > 500) {
      setError("La descripción no puede superar los 500 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/sala/ayudantias/${editingId}`
        : "/api/sala/ayudantias";
      const payload: Record<string, unknown> = {
        materia,
        universidad,
        format,
        priceType,
        priceAmount:
          priceType === "PAGADO" ? Number(priceAmount) || 0 : undefined,
        description: description.trim(),
        orientadaA,
        contactMethod,
        contactValue: contactValue.trim(),
        titulo: titulo.trim() || undefined,
        disponibilidad: disponibilidad.trim() || undefined,
      };
      // En modo edición no enviamos `type` (es invariante).
      if (!isEdit) payload.type = type;

      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ??
            (isEdit
              ? "No pudimos actualizar la ayudantía."
              : "No pudimos publicar la ayudantía."),
        );
        return;
      }
      toast.success(
        isEdit
          ? isOfrezco
            ? "Ayudantía actualizada"
            : "Búsqueda actualizada"
          : isOfrezco
            ? "Ayudantía publicada"
            : "Búsqueda publicada",
      );
      router.refresh();
      onSuccess();
    } catch {
      setError("Hubo un problema de red. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <FormError message={error} />

      {!isEdit && (
        <FormSection title="Tipo de publicación">
          <div className="grid grid-cols-2 gap-0 border border-gz-rule rounded-[3px] overflow-hidden">
            <TypeOption
              active={isOfrezco}
              onClick={() => setType("OFREZCO")}
              label="Ofrezco"
              hint="Soy tutor / ayudante."
            />
            <TypeOption
              active={!isOfrezco}
              onClick={() => setType("BUSCO")}
              label="Busco"
              hint="Necesito un ayudante."
            />
          </div>
        </FormSection>
      )}

      <FormSection title="Encabezado">
        <FormField
          label="Título corto"
          hint="Opcional. Ej. “Repaso intensivo certamen civil II”."
        >
          <TextInput
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título de la ayudantía"
            maxLength={120}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Materia" required>
            <Select value={materia} onChange={(e) => setMateria(e.target.value)}>
              <option value="">Selecciona…</option>
              {MATERIAS_SALA.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Universidad" required>
            <Select
              value={universidad}
              onChange={(e) => setUniversidad(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {UNIVERSIDADES_CHILE.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Formato y honorarios">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Formato" required>
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option value="">Selecciona…</option>
              {FORMATOS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Modalidad" required>
            <Select
              value={priceType}
              onChange={(e) => setPriceType(e.target.value)}
            >
              {PRECIOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        {priceType === "PAGADO" && (
          <FormField
            label="Honorarios por hora"
            required
            hint="Solo el monto en CLP. Ej. 8000."
          >
            <TextInput
              type="number"
              min={0}
              step={1000}
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="ej. 8000"
              className="max-w-[200px]"
            />
          </FormField>
        )}
        <FormField
          label="Disponibilidad"
          hint="Opcional. Ej. “Lunes a viernes, tarde”."
        >
          <TextInput
            value={disponibilidad}
            onChange={(e) => setDisponibilidad(e.target.value)}
            placeholder="ej. Lunes a viernes, tarde"
            maxLength={200}
          />
        </FormField>
      </FormSection>

      <FormSection
        title="Orientada a"
        hint="Opcional. Para que estudiantes de otros niveles te encuentren mejor."
      >
        <div className="flex flex-wrap gap-2">
          {ORIENTADAS_A.map((o) => {
            const active = orientadaA.includes(o);
            return (
              <button
                key={o}
                type="button"
                onClick={() => toggleOrientada(o)}
                className={`px-3 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition cursor-pointer
                           ${active
                             ? "bg-gz-ink text-gz-cream border-gz-ink"
                             : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
              >
                {o}
              </button>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Descripción">
        <FormField
          label={isOfrezco ? "Sobre tu ayudantía" : "Qué necesitas"}
          required
          hint="Máximo 500 caracteres."
        >
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder={
              isOfrezco
                ? "Tu enfoque, experiencia y materiales."
                : "Lo que necesitas reforzar y para cuándo."
            }
          />
          <div className="text-right font-ibm-mono text-[10px] tracking-[1px] text-gz-ink-light mt-0.5">
            {description.length}/500
          </div>
        </FormField>
      </FormSection>

      <FormSection title="Contacto">
        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
          <FormField label="Método" required>
            <Select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
            >
              {CONTACTOS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Dato de contacto" required>
            <TextInput
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
              placeholder={
                contactMethod === "WHATSAPP"
                  ? "+56 9 1234 5678"
                  : contactMethod === "EMAIL"
                    ? "tu@correo.cl"
                    : "Cómo contactarte"
              }
              maxLength={200}
            />
          </FormField>
        </div>
      </FormSection>

      <Footer
        onCancel={onCancel}
        submitLabel={
          isEdit
            ? "Guardar cambios"
            : isOfrezco
              ? "Publicar ayudantía"
              : "Publicar búsqueda"
        }
        submitting={submitting}
        canSubmit={Boolean(canSubmit)}
      />
    </form>
  );
}

function TypeOption({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-4 py-3.5 transition cursor-pointer ${
        active
          ? "bg-gz-ink text-gz-cream"
          : "bg-white text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"
      } [&:not(:last-child)]:border-r [&:not(:last-child)]:border-gz-rule`}
    >
      <div className="font-cormorant font-semibold text-[18px] leading-tight">
        {label}
      </div>
      <div className={`mt-0.5 font-cormorant italic text-[13px] ${active ? "text-gz-cream/75" : "text-gz-ink-light"}`}>
        {hint}
      </div>
    </button>
  );
}
