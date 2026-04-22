"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login } from "../actions";
import { AuthCard } from "@/components/ui/auth-card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      disabled={pending}
    >
      {pending ? "Ingresando..." : "Iniciar sesión"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, {});

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle="Bienvenido de vuelta"
      footer={
        <span>
          ¿No tienes cuenta?{" "}
          <Link
            href="/register"
            className="font-medium text-gold hover:underline"
          >
            Regístrate
          </Link>
        </span>
      }
    >
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-[3px] border border-gz-burgundy/20 bg-gz-burgundy/[0.06] p-3 font-archivo text-[13px] text-gz-burgundy">
            {state.error}
          </div>
        )}

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@correo.cl"
          required
        />

        <PasswordInput
          label="Contraseña"
          name="password"
          placeholder="Tu contraseña"
          required
        />

        <div className="text-right">
          <Link
            href="/reset-password"
            className="text-xs text-gold hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <SubmitButton />
      </form>
    </AuthCard>
  );
}
