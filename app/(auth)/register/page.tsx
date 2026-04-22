"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { register } from "../actions";
import { AuthCard } from "@/components/ui/auth-card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { validatePassword } from "@/lib/password-validation";
import { formatRut } from "@/lib/rut";
import { UNIVERSIDADES_CHILE } from "@/lib/universidades-chile";
import { REGIONES_CHILE } from "@/lib/regiones-chile";

const ETAPAS = [
  { value: "estudiante", label: "Estudiante de Derecho" },
  { value: "egresado", label: "Egresado · preparando grado" },
  { value: "abogado", label: "Abogado titulado" },
  { value: "profesor", label: "Profesor · académico" },
];

const UNIVERSIDAD_OPTIONS = UNIVERSIDADES_CHILE.map((u) => ({
  value: u.value,
  label: u.label,
}));

const REGION_OPTIONS = REGIONES_CHILE.map((r) => ({ value: r, label: r }));

/** Section eyebrow in editorial style */
function SectionEyebrow({ roman, title }: { roman: string; title: string }) {
  return (
    <div className="flex items-baseline gap-2 pb-1 border-b border-gz-rule">
      <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] text-gz-gold">
        {roman}
      </span>
      <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid">
        {title}
      </span>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full"
      disabled={pending}
    >
      {pending ? "Creando cuenta..." : "Crear cuenta"}
    </Button>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const check = validatePassword(password);
  const items = [
    { label: "8+ caracteres", ok: check.hasMinLength },
    { label: "1 mayúscula", ok: check.hasUppercase },
    { label: "2 números", ok: check.hasTwoNumbers },
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
      {items.map((item) => (
        <span
          key={item.label}
          className={`text-[11px] font-medium flex items-center gap-1 ${
            item.ok ? "text-gz-sage" : "text-gz-ink-light"
          }`}
        >
          {item.ok ? "✓" : "○"} {item.label}
        </span>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, {});
  const [password, setPassword] = useState("");
  const [rut, setRut] = useState("");
  const [etapa, setEtapa] = useState("");

  const currentYear = new Date().getFullYear();
  const añosIngreso: Array<{ value: string; label: string }> = [];
  for (let y = currentYear; y >= currentYear - 15; y--) {
    añosIngreso.push({ value: String(y), label: String(y) });
  }

  if (state?.success) {
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle="Te enviamos un enlace de verificación"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gz-gold/10">
            <svg
              className="h-8 w-8 text-gz-gold"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <p className="font-archivo text-[13px] text-gz-ink-mid">
            Haz clic en el enlace que enviamos a tu correo para activar tu
            cuenta. Revisa tu bandeja de spam si no lo encuentras.
          </p>
          <Link
            href="/login"
            className="inline-block font-archivo text-[13px] font-medium text-gz-gold hover:underline"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  // Etapa-specific label for the "year" field
  const yearLabel =
    etapa === "estudiante"
      ? "Año de ingreso"
      : etapa === "egresado"
      ? "Año de ingreso"
      : etapa === "abogado"
      ? "Año de titulación"
      : etapa === "profesor"
      ? "Año de titulación"
      : "Año de ingreso / titulación";

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Tu identidad real es la base del claustro"
      footer={
        <span>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-gz-gold hover:underline">
            Inicia sesión
          </Link>
        </span>
      }
    >
      <form action={formAction} className="space-y-6">
        {state?.error && (
          <div className="rounded-[3px] border border-gz-burgundy/20 bg-gz-burgundy/[0.06] p-3 font-archivo text-[13px] text-gz-burgundy">
            {state.error}
          </div>
        )}

        {/* ── I · Identidad ─────────────────────────────── */}
        <section className="space-y-4">
          <SectionEyebrow roman="I" title="Identidad" />

          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              label="Nombre"
              name="firstName"
              placeholder="Ej: María"
              autoComplete="given-name"
              required
            />
            <Input
              label="Apellido"
              name="lastName"
              placeholder="Ej: González"
              autoComplete="family-name"
              required
            />
          </div>

          <Input
            label="RUT"
            name="rut"
            placeholder="12.345.678-K"
            value={rut}
            onChange={(e) => setRut(formatRut(e.target.value))}
            inputMode="text"
            maxLength={12}
            required
          />

          <div className="flex flex-col gap-4 sm:flex-row">
            <Input
              label="Fecha de nacimiento"
              name="dateOfBirth"
              type="date"
              max={`${currentYear - 15}-12-31`}
              min="1930-01-01"
              required
            />
            <Input
              label="Teléfono"
              name="phone"
              type="tel"
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              required
            />
          </div>
        </section>

        {/* ── II · Situación académica ──────────────────── */}
        <section className="space-y-4">
          <SectionEyebrow roman="II" title="Situación académica" />

          <Select
            label="Etapa actual"
            name="etapaActual"
            options={ETAPAS}
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            placeholder="— Selecciona tu etapa —"
            required
            defaultValue=""
          />

          <Select
            label="Universidad"
            name="universidad"
            options={UNIVERSIDAD_OPTIONS}
            placeholder="— Selecciona tu universidad —"
            required
            defaultValue=""
          />

          <div className="flex flex-col gap-4 sm:flex-row">
            <Select
              label={yearLabel}
              name="anioReferencia"
              options={añosIngreso}
              placeholder="— Año —"
              required
              defaultValue=""
            />
            <Select
              label="Región"
              name="region"
              options={REGION_OPTIONS}
              placeholder="— Región (opcional) —"
              defaultValue=""
            />
          </div>
        </section>

        {/* ── III · Acceso ──────────────────────────────── */}
        <section className="space-y-4">
          <SectionEyebrow roman="III" title="Acceso" />

          <Input
            label="Correo electrónico"
            name="email"
            type="email"
            placeholder="tu@correo.cl"
            autoComplete="email"
            required
          />

          <div>
            <PasswordInput
              label="Contraseña"
              name="password"
              placeholder="Mínimo 8 caracteres, 1 mayúscula, 2 números"
              autoComplete="new-password"
              required
              minLength={8}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPassword(e.target.value)
              }
            />
            <PasswordStrength password={password} />
          </div>

          <PasswordInput
            label="Confirmar contraseña"
            name="confirmPassword"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
        </section>

        {/* ── Términos y responsabilidad ────────────────── */}
        <div className="pt-2 space-y-3 border-t border-gz-rule">
          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="acceptTerms"
              required
              className="mt-1 h-4 w-4 rounded-sm border-gz-rule accent-[var(--gz-gold)]"
            />
            <span className="font-archivo text-[12px] leading-relaxed text-gz-ink-mid">
              Acepto los{" "}
              <Link
                href="/terms"
                className="font-medium text-gz-gold hover:underline"
              >
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href="/privacy"
                className="font-medium text-gz-gold hover:underline"
              >
                Política de Privacidad
              </Link>
            </span>
          </label>

          <label className="flex items-start gap-2.5">
            <input
              type="checkbox"
              name="acceptResponsibility"
              required
              className="mt-1 h-4 w-4 rounded-sm border-gz-rule accent-[var(--gz-gold)]"
            />
            <span className="font-archivo text-[12px] leading-relaxed text-gz-ink-mid">
              Declaro que los datos entregados son{" "}
              <span className="italic text-gz-ink">verídicos</span> y asumo{" "}
              <span className="italic text-gz-ink">responsabilidad pública</span>{" "}
              sobre lo que publique en Studio IURIS.
            </span>
          </label>
        </div>

        <SubmitButton />

        <p className="font-cormorant italic text-center text-[13px] text-gz-ink-light pt-2">
          — Aquí se firma con nombre propio —
        </p>
      </form>
    </AuthCard>
  );
}
