"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { login, resendConfirmation } from "../actions";
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

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-flex items-center gap-1.5 font-archivo text-[12px] font-semibold text-gz-gold hover:underline disabled:opacity-50"
    >
      {pending ? "Reenviando..." : "→ Reenviar correo de confirmación"}
    </button>
  );
}

export default function LoginPage() {
  const [loginState, loginAction] = useFormState(login, {});
  const [resendState, resendAction] = useFormState(resendConfirmation, {});
  const [email, setEmail] = useState("");

  const showResend = loginState?.errorCode === "email_not_confirmed";

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
      <form action={loginAction} className="space-y-4">
        {loginState?.error && (
          <div className="rounded-[3px] border border-gz-burgundy/20 bg-gz-burgundy/[0.06] p-3 font-archivo text-[13px] text-gz-burgundy">
            {loginState.error}
          </div>
        )}

        {resendState?.success && (
          <div className="rounded-[3px] border border-gz-sage/30 bg-gz-sage/[0.08] p-3 font-archivo text-[13px] text-gz-sage">
            Te enviamos un nuevo correo de confirmación. Revisa tu bandeja (y la carpeta de spam).
          </div>
        )}

        {resendState?.error && (
          <div className="rounded-[3px] border border-gz-burgundy/20 bg-gz-burgundy/[0.06] p-3 font-archivo text-[13px] text-gz-burgundy">
            {resendState.error}
          </div>
        )}

        <Input
          label="Correo electrónico"
          name="email"
          type="email"
          placeholder="tu@correo.cl"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <PasswordInput
          label="Contraseña"
          name="password"
          placeholder="Tu contraseña"
          autoComplete="current-password"
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

      {showResend && (
        <form action={resendAction} className="mt-3 border-t border-gz-rule pt-3">
          <input type="hidden" name="email" value={email} />
          <p className="font-archivo text-[12px] text-gz-ink-mid">
            ¿No te llegó el correo o pasó demasiado tiempo?
          </p>
          <ResendButton />
        </form>
      )}
    </AuthCard>
  );
}
