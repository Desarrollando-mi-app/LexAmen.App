"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface Sugerencia {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
  razon: string;
  stats: { xp: number };
}

export function ContactSuggestions() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  const fetchSugerencias = useCallback(async () => {
    try {
      const res = await fetch("/api/sugerencias-contacto?limit=5");
      const data = await res.json();
      if (data.sugerencias) {
        setSugerencias(data.sugerencias);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSugerencias();
  }, [fetchSugerencias]);

  async function handleAddColega(userId: string) {
    if (sentRequests.has(userId)) return;

    try {
      const res = await fetch("/api/colegas/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Error al enviar solicitud");
        return;
      }

      setSentRequests((prev) => new Set(prev).add(userId));

      if (data.autoAccepted) {
        toast.success("¡Son colegas ahora!");
      } else {
        toast.success("Solicitud enviada");
      }

      // Remove from suggestions after a delay
      setTimeout(() => {
        setSugerencias((prev) => prev.filter((s) => s.id !== userId));
      }, 2000);
    } catch {
      toast.error("Error de conexión");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <span className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          Personas que te pueden interesar
        </span>
        <div className="h-px bg-gz-rule/50" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-[4px] border border-gz-rule/50 bg-white/40 p-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gz-rule/30" />
              <div className="h-3 w-24 rounded bg-gz-rule/30" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (sugerencias.length === 0) {
    return (
      <div className="space-y-3">
        <span className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
          Personas que te pueden interesar
        </span>
        <div className="h-px bg-gz-rule/50" />
        <p className="font-archivo text-[12px] italic text-gz-ink-light">
          A&uacute;n no hay sugerencias. Sigue estudiando y publicando para
          descubrir personas afines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <span className="block font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold">
        Personas que te pueden interesar
      </span>
      <div className="h-px bg-gz-rule/50" />

      {sugerencias.map((s) => {
        const initials = `${s.firstName[0]}${s.lastName[0]}`.toUpperCase();
        const isSent = sentRequests.has(s.id);

        return (
          <div
            key={s.id}
            className="rounded-[4px] border border-gz-rule bg-white p-3 transition-colors hover:border-gz-gold"
          >
            {/* Avatar + Name */}
            <Link
              href={`/dashboard/perfil/${s.id}`}
              className="flex items-center gap-2"
            >
              {s.avatarUrl ? (
                <img
                  src={s.avatarUrl}
                  alt={`${s.firstName} ${s.lastName}`}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gz-navy font-ibm-mono text-[10px] font-semibold text-gz-gold-bright">
                  {initials}
                </div>
              )}
              <span className="font-archivo text-[13px] font-semibold text-gz-ink truncate">
                {s.firstName} {s.lastName}
              </span>
            </Link>

            {/* Universidad */}
            {s.universidad && (
              <p className="mt-1 font-ibm-mono text-[10px] text-gz-ink-light truncate pl-10">
                {s.universidad}
              </p>
            )}

            {/* Razon */}
            <p className="mt-1 font-archivo text-[11px] italic text-gz-ink-mid pl-10">
              {s.razon}
            </p>

            {/* Add button */}
            <div className="mt-2 pl-10">
              {isSent ? (
                <span className="font-ibm-mono text-[10px] text-gz-sage">
                  Solicitud enviada ✓
                </span>
              ) : (
                <button
                  onClick={() => handleAddColega(s.id)}
                  className="font-ibm-mono text-[10px] text-gz-gold transition-colors hover:text-gz-ink cursor-pointer"
                >
                  Agregar colega
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
