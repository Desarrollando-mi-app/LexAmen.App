"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AREAS_PRACTICA,
  CIUDADES_CHILE,
  FORMATOS_TRABAJO,
  TIPOS_CONTRATO,
  EXPERIENCIA_OPTIONS,
} from "@/lib/sala-constants";
import {
  FormSection,
  FormField,
  TextInput,
  TextArea,
  Select,
  Footer,
  FormError,
} from "@/components/sala/publish-sheet";

const METODOS_POSTULACION = [
  { value: "interno", label: "Dentro de la plataforma" },
  { value: "email", label: "Postulación por email" },
  { value: "link", label: "Formulario / link externo" },
  { value: "linkedin", label: "Vía LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export interface OfertaFormInitialValues {
  empresa?: string;
  cargo?: string;
  areaPractica?: string;
  ciudad?: string;
  formato?: string;
  tipoContrato?: string;
  experienciaReq?: string | null;
  remuneracion?: string | null;
  descripcion?: string;
  requisitos?: string | null;
  metodoPostulacion?: string;
  contactoPostulacion?: string | null;
}

interface OfertaFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  /** Si está presente, el form opera en modo edición (PATCH al endpoint). */
  editingId?: string;
  initialValues?: OfertaFormInitialValues;
}

/**
 * Form V4 editorial para crear o editar una oferta laboral.
 * Modo create: POST /api/sala/ofertas. Modo edit: PATCH /api/sala/ofertas/[id].
 */
export function OfertaForm({
  onCancel,
  onSuccess,
  editingId,
  initialValues,
}: OfertaFormProps) {
  const router = useRouter();
  const isEdit = Boolean(editingId);
  const init = initialValues ?? {};

  const [empresa, setEmpresa] = useState(init.empresa ?? "");
  const [cargo, setCargo] = useState(init.cargo ?? "");
  const [areaPractica, setAreaPractica] = useState(init.areaPractica ?? "");
  const [ciudad, setCiudad] = useState(init.ciudad ?? "");
  const [formato, setFormato] = useState(init.formato ?? "");
  const [tipoContrato, setTipoContrato] = useState(init.tipoContrato ?? "");
  const [experienciaReq, setExperienciaReq] = useState(init.experienciaReq ?? "");
  const [remuneracion, setRemuneracion] = useState(init.remuneracion ?? "");
  const [descripcion, setDescripcion] = useState(init.descripcion ?? "");
  const [requisitos, setRequisitos] = useState(init.requisitos ?? "");
  const [metodoPostulacion, setMetodoPostulacion] = useState(
    init.metodoPostulacion ?? "interno",
  );
  const [contactoPostulacion, setContactoPostulacion] = useState(
    init.contactoPostulacion ?? "",
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    empresa.trim() &&
    cargo.trim() &&
    descripcion.trim() &&
    formato &&
    tipoContrato &&
    metodoPostulacion;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Completa los campos requeridos antes de publicar.");
      return;
    }

    setSubmitting(true);
    try {
      const url = isEdit
        ? `/api/sala/ofertas/${editingId}`
        : "/api/sala/ofertas";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: empresa.trim(),
          cargo: cargo.trim(),
          areaPractica: areaPractica || "otro",
          descripcion: descripcion.trim(),
          ciudad: ciudad.trim(),
          formato,
          tipoContrato,
          experienciaReq: experienciaReq || undefined,
          remuneracion: remuneracion.trim() || undefined,
          requisitos: requisitos.trim() || undefined,
          metodoPostulacion,
          contactoPostulacion: contactoPostulacion.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ??
            (isEdit
              ? "No pudimos actualizar la oferta."
              : "No pudimos publicar la oferta."),
        );
        return;
      }
      toast.success(isEdit ? "Oferta actualizada" : "Oferta publicada");
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

      <FormSection
        title="Cargo"
        hint="Lo más visible del aviso. Sé específico — “Asociado civil 2°-3° año” gana a “Abogado”."
      >
        <FormField label="Empresa o estudio" required>
          <TextInput
            value={empresa}
            onChange={(e) => setEmpresa(e.target.value)}
            placeholder="ej. Estudio Pérez & Asociados"
            maxLength={120}
          />
        </FormField>
        <FormField label="Cargo" required>
          <TextInput
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="ej. Asociado área civil"
            maxLength={120}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Área de práctica">
            <Select
              value={areaPractica}
              onChange={(e) => setAreaPractica(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {AREAS_PRACTICA.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Ciudad">
            <Select
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {CIUDADES_CHILE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Condiciones">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Formato" required>
            <Select
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {FORMATOS_TRABAJO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tipo de contrato" required>
            <Select
              value={tipoContrato}
              onChange={(e) => setTipoContrato(e.target.value)}
            >
              <option value="">Selecciona…</option>
              {TIPOS_CONTRATO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Experiencia requerida">
            <Select
              value={experienciaReq}
              onChange={(e) => setExperienciaReq(e.target.value)}
            >
              <option value="">No especificada</option>
              {EXPERIENCIA_OPTIONS.map((e) => (
                <option key={e.value} value={e.value}>
                  {e.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField
            label="Remuneración"
            hint="Texto libre — ej. “$1.200.000 líquido” o “A convenir”."
          >
            <TextInput
              value={remuneracion}
              onChange={(e) => setRemuneracion(e.target.value)}
              placeholder="ej. $1.200.000 líquido"
              maxLength={80}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Descripción">
        <FormField
          label="Descripción del cargo"
          required
          hint="Cuenta qué hará la persona, con qué equipo trabajará y qué se valora."
        >
          <TextArea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={3000}
            placeholder="Describe el rol, las responsabilidades y el equipo…"
          />
        </FormField>
        <FormField
          label="Requisitos"
          hint="Opcional. Universidad, especialidad, herramientas…"
        >
          <TextArea
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
            maxLength={1500}
            placeholder="Bullet points o texto libre."
          />
        </FormField>
      </FormSection>

      <FormSection title="Cómo postular">
        <FormField label="Método de postulación" required>
          <Select
            value={metodoPostulacion}
            onChange={(e) => setMetodoPostulacion(e.target.value)}
          >
            {METODOS_POSTULACION.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label="Contacto"
          hint="Email, link al formulario o número de WhatsApp, según el método."
        >
          <TextInput
            value={contactoPostulacion}
            onChange={(e) => setContactoPostulacion(e.target.value)}
            placeholder="ej. seleccion@estudio.cl"
            maxLength={500}
          />
        </FormField>
      </FormSection>

      <Footer
        onCancel={onCancel}
        submitLabel={isEdit ? "Guardar cambios" : "Publicar oferta"}
        submitting={submitting}
        canSubmit={Boolean(canSubmit)}
      />
    </form>
  );
}
