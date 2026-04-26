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

// Wrapper editorial — rail navy + dot-kicker, sin paper-stack porque vive
// dentro de la columna sticky del sidebar.
function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[3px] border border-gz-rule bg-white overflow-hidden">
      <div className="h-[3px] bg-gz-navy" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-gz-navy" />
          <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-navy">
            Colegas sugeridos
          </span>
        </div>
        {children}
      </div>
    </div>
  );
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
      <CardShell>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gz-cream-dark animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-24 rounded bg-gz-cream-dark animate-pulse" />
                <div className="h-2 w-16 rounded bg-gz-cream-dark animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </CardShell>
    );
  }

  if (sugerencias.length === 0) {
    return (
      <CardShell>
        <p className="font-cormorant italic text-[13px] text-gz-ink-light leading-relaxed">
          Sigue estudiando y publicando para descubrir personas afines.
        </p>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <div className="space-y-2.5 -mx-1">
        {sugerencias.map((s, idx) => {
          const initials = `${s.firstName[0]}${s.lastName[0]}`.toUpperCase();
          const isSent = sentRequests.has(s.id);

          return (
            <div
              key={s.id}
              className={`px-1 py-2 ${idx > 0 ? "border-t border-gz-rule/40" : ""}`}
            >
              {/* Avatar + Name */}
              <Link
                href={`/dashboard/perfil/${s.id}`}
                className="flex items-center gap-2.5 group cursor-pointer"
              >
                {s.avatarUrl ? (
                  <img
                    src={s.avatarUrl}
                    alt={`${s.firstName} ${s.lastName}`}
                    className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gz-rule/60"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gz-navy font-ibm-mono text-[10px] font-semibold text-gz-gold-bright ring-1 ring-gz-rule/60">
                    {initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate group-hover:text-gz-navy transition-colors">
                    {s.firstName} {s.lastName}
                  </p>
                  {s.universidad && (
                    <p className="font-ibm-mono text-[9px] text-gz-ink-light truncate uppercase tracking-[0.5px]">
                      {s.universidad}
                    </p>
                  )}
                </div>
              </Link>

              {/* Razon */}
              <p className="mt-1.5 ml-[46px] font-cormorant text-[12px] italic text-gz-ink-mid leading-snug line-clamp-2">
                {s.razon}
              </p>

              {/* Add button */}
              <div className="mt-2 ml-[46px]">
                {isSent ? (
                  <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-sage font-semibold">
                    ✓ Enviada
                  </span>
                ) : (
                  <button
                    onClick={() => handleAddColega(s.id)}
                    className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] font-semibold text-gz-gold border-b border-gz-gold pb-0.5 transition-colors hover:text-gz-ink hover:border-gz-ink cursor-pointer"
                  >
                    + Agregar colega
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </CardShell>
  );
}
