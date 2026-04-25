"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AREAS_PRACTICA,
  CIUDADES_CHILE,
  FORMATOS_TRABAJO,
  REMUNERACION_OPTIONS,
} from "@/lib/sala-constants";
import { PASANTIA_JORNADAS } from "@/lib/pasantias-helpers";
import {
  FormSection,
  FormField,
  TextInput,
  TextArea,
  Select,
  Footer,
  FormError,
} from "@/components/sala/publish-sheet";

interface PasantiaFormProps {
  onCancel: () => void;
  onSuccess: () => void;
}

/**
 * Form V4 editorial para crear una publicación de pasantía. POST
 * /api/sala/pasantias. Soporta los dos tipos: "ofrezco" (un estudio
 * publica una vacante) y "busco" (un estudiante publica que busca
 * pasantía).
 */
export function PasantiaForm({ onCancel, onSuccess }: PasantiaFormProps) {
  const router = useRouter();

  const [type, setType] = useState<"ofrezco" | "busco">("ofrezco");
  const [empresa, setEmpresa] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [areaPractica, setAreaPractica] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [formato, setFormato] = useState("");
  const [jornada, setJornada] = useState("");
  const [duracion, setDuracion] = useState("");
  const [remuneracion, setRemuneracion] = useState("a_convenir");
  const [montoRemu, setMontoRemu] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [cupos, setCupos] = useState("");
  const [requisitos, setRequisitos] = useState("");

  // Solo para "ofrezco":
  const [postulacionTipo, setPostulacionTipo] = useState<"INTERNA" | "EXTERNA">(
    "INTERNA",
  );
  const [postulacionUrl, setPostulacionUrl] = useState("");
  const [contactoEmail, setContactoEmail] = useState("");
  const [contactoWhatsapp, setContactoWhatsapp] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOfrezco = type === "ofrezco";

  const canSubmit =
    titulo.trim() &&
    descripcion.trim() &&
    areaPractica &&
    formato &&
    remuneracion &&
    (!isOfrezco || empresa.trim()) &&
    (postulacionTipo !== "EXTERNA" || postulacionUrl.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError("Completa los campos requeridos antes de publicar.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sala/pasantias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          empresa: isOfrezco ? empresa.trim() : "—",
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          areaPractica,
          ciudad: ciudad.trim(),
          formato,
          jornada: jornada || null,
          duracion: duracion.trim() || undefined,
          remuneracion,
          montoRemu: montoRemu.trim() || undefined,
          requisitos: requisitos.trim() || undefined,
          fechaInicio: fechaInicio || undefined,
          fechaLimite: fechaLimite || undefined,
          cupos: cupos ? Number(cupos) : null,
          ...(isOfrezco
            ? {
                postulacionTipo,
                postulacionUrl:
                  postulacionTipo === "EXTERNA"
                    ? postulacionUrl.trim()
                    : null,
                contactoEmail: contactoEmail.trim() || null,
                contactoWhatsapp: contactoWhatsapp.trim() || null,
              }
            : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No pudimos publicar la pasantía.");
        return;
      }
      toast.success(
        isOfrezco ? "Pasantía publicada" : "Búsqueda publicada",
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

      {/* Tipo */}
      <FormSection title="Tipo de publicación">
        <div className="grid grid-cols-2 gap-0 border border-gz-rule rounded-[3px] overflow-hidden">
          <TypeOption
            active={type === "ofrezco"}
            onClick={() => setType("ofrezco")}
            label="Ofrezco"
            hint="Tengo una vacante de pasantía."
          />
          <TypeOption
            active={type === "busco"}
            onClick={() => setType("busco")}
            label="Busco"
            hint="Soy estudiante y busco pasantía."
          />
        </div>
      </FormSection>

      <FormSection title="Encabezado">
        {isOfrezco && (
          <FormField label="Estudio o empresa" required>
            <TextInput
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="ej. Estudio Pérez & Asociados"
              maxLength={120}
            />
          </FormField>
        )}
        <FormField
          label={isOfrezco ? "Título de la pasantía" : "Título de tu búsqueda"}
          required
        >
          <TextInput
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={
              isOfrezco
                ? "ej. Pasante área civil"
                : "ej. Estudiante 4° año busca pasantía civil"
            }
            maxLength={140}
          />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Área de práctica" required>
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
          <FormField label="Jornada">
            <Select
              value={jornada}
              onChange={(e) => setJornada(e.target.value)}
            >
              <option value="">Sin especificar</option>
              {PASANTIA_JORNADAS.map((j) => (
                <option key={j.value} value={j.value}>
                  {j.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Remuneración" required>
            <Select
              value={remuneracion}
              onChange={(e) => setRemuneracion(e.target.value)}
            >
              {REMUNERACION_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </FormField>
          {remuneracion === "pagada" && (
            <FormField label="Monto" hint="Texto libre — ej. “$400.000 mensual”.">
              <TextInput
                value={montoRemu}
                onChange={(e) => setMontoRemu(e.target.value)}
                placeholder="ej. $400.000 mensual"
                maxLength={80}
              />
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Inicio">
            <TextInput
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </FormField>
          <FormField label="Postulaciones hasta">
            <TextInput
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
            />
          </FormField>
          <FormField label="Duración" hint="Texto libre — ej. “3 meses”.">
            <TextInput
              value={duracion}
              onChange={(e) => setDuracion(e.target.value)}
              placeholder="ej. 3 meses"
              maxLength={60}
            />
          </FormField>
        </div>
        {isOfrezco && (
          <FormField label="Cupos">
            <TextInput
              type="number"
              min={1}
              max={50}
              value={cupos}
              onChange={(e) => setCupos(e.target.value)}
              placeholder="ej. 2"
              className="max-w-[160px]"
            />
          </FormField>
        )}
      </FormSection>

      <FormSection title="Descripción">
        <FormField
          label={isOfrezco ? "Descripción del rol" : "Sobre ti"}
          required
        >
          <TextArea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={3000}
            placeholder={
              isOfrezco
                ? "Qué hará la persona, con qué equipo, qué se valora…"
                : "Quién eres, qué te interesa y qué experiencia traes."
            }
          />
        </FormField>
        <FormField
          label="Requisitos"
          hint="Opcional. Año mínimo, promedio, herramientas…"
        >
          <TextArea
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
            maxLength={1500}
            placeholder="Bullet points o texto libre."
          />
        </FormField>
      </FormSection>

      {isOfrezco && (
        <FormSection title="Cómo postular">
          <FormField label="Tipo de postulación" required>
            <Select
              value={postulacionTipo}
              onChange={(e) =>
                setPostulacionTipo(e.target.value as "INTERNA" | "EXTERNA")
              }
            >
              <option value="INTERNA">Dentro de Studio Iuris</option>
              <option value="EXTERNA">Por link / formulario externo</option>
            </Select>
          </FormField>
          {postulacionTipo === "EXTERNA" && (
            <FormField label="URL externa" required>
              <TextInput
                type="url"
                value={postulacionUrl}
                onChange={(e) => setPostulacionUrl(e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </FormField>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Email de contacto">
              <TextInput
                type="email"
                value={contactoEmail}
                onChange={(e) => setContactoEmail(e.target.value)}
                placeholder="ej. seleccion@estudio.cl"
                maxLength={200}
              />
            </FormField>
            <FormField label="WhatsApp" hint="Solo dígitos, con código país.">
              <TextInput
                value={contactoWhatsapp}
                onChange={(e) => setContactoWhatsapp(e.target.value)}
                placeholder="ej. +56 9 1234 5678"
                maxLength={40}
              />
            </FormField>
          </div>
        </FormSection>
      )}

      <Footer
        onCancel={onCancel}
        submitLabel={isOfrezco ? "Publicar pasantía" : "Publicar búsqueda"}
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
