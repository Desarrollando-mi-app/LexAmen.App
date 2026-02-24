"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { register } from "../actions";
import { AuthCard } from "@/components/ui/auth-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

export default function RegisterPage() {
  const [state, formAction] = useFormState(register, {});

  if (state?.success) {
    return (
      <AuthCard
        title="Revisa tu correo"
        subtitle="Te enviamos un enlace de verificación"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/10">
            <svg
              className="h-8 w-8 text-gold"
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
          <p className="text-sm text-navy/70">
            Haz clic en el enlace que enviamos a tu correo para activar tu
            cuenta. Revisa tu bandeja de spam si no lo encuentras.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-gold hover:underline"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle="Comienza a estudiar Derecho"
      footer={
        <span>
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-gold hover:underline">
            Inicia sesión
          </Link>
        </span>
      }
    >
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <Input
            label="Nombre"
            name="firstName"
            placeholder="Ej: María"
            required
          />
          <Input
            label="Apellido"
            name="lastName"
            placeholder="Ej: González"
            required
          />
        </div>

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@correo.cl"
          required
        />

        <Input
          label="Contraseña"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          required
          minLength={8}
        />

        <Input
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          placeholder="Repite tu contraseña"
          required
        />

        <label className="flex items-start gap-2.5">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-1 h-4 w-4 rounded border-border accent-gold"
          />
          <span className="text-xs leading-relaxed text-navy/70">
            Acepto los{" "}
            <Link
              href="/terms"
              className="font-medium text-gold hover:underline"
            >
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link
              href="/privacy"
              className="font-medium text-gold hover:underline"
            >
              Política de Privacidad
            </Link>
          </span>
        </label>

        <SubmitButton />
      </form>
    </AuthCard>
  );
}
