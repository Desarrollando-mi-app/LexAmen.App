"use client";

import { useState } from "react";
import Link from "next/link";
import type { ObiterData } from "../../types/obiter";
import { ObiterCard } from "../../components/obiter-card";
import { ObiterThreadView } from "../../components/obiter-thread-view";
import { ObiterCiteChain } from "../../components/obiter-cite-chain";

// ─── Types ──────────────────────────────────────────────────

type CitationItem = {
  id: string;
  content: string;
  createdAt: string;
  apoyosCount: number;
  citasCount: number;
  user: {
    id?: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
  };
};

type ObiterDetailClientProps = {
  obiter: ObiterData;
  threadParts: ObiterData[] | null;
  citations: CitationItem[];
  currentUserId: string | null;
};

// ─── Component ──────────────────────────────────────────────

export function ObiterDetailClient({
  obiter: initialObiter,
  threadParts: initialThreadParts,
  citations,
  currentUserId,
}: ObiterDetailClientProps) {
  const [obiter, setObiter] = useState(initialObiter);
  const [threadParts, setThreadParts] = useState(initialThreadParts);

  // ─── Optimistic toggle helpers ──────────────────────────

  function updateObiter(id: string, updater: (o: ObiterData) => ObiterData) {
    if (obiter.id === id) {
      setObiter(updater(obiter));
    }
    if (threadParts) {
      setThreadParts(
        threadParts.map((o) => (o.id === id ? updater(o) : o))
      );
    }
  }

  async function handleApoyar(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id);
    if (!target) return;

    const wasApoyado = target.hasApoyado;

    updateObiter(id, (o) => ({
      ...o,
      hasApoyado: !wasApoyado,
      apoyosCount: o.apoyosCount + (wasApoyado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/apoyar`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasApoyado: wasApoyado,
          apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasApoyado: wasApoyado,
        apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
      }));
    }
  }

  async function handleGuardar(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id);
    if (!target) return;

    const wasGuardado = target.hasGuardado;

    updateObiter(id, (o) => ({
      ...o,
      hasGuardado: !wasGuardado,
      guardadosCount: o.guardadosCount + (wasGuardado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/guardar`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasGuardado: wasGuardado,
          guardadosCount: o.guardadosCount + (wasGuardado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasGuardado: wasGuardado,
        guardadosCount: o.guardadosCount + (wasGuardado ? 1 : -1),
      }));
    }
  }

  async function handleComuniquese(id: string) {
    if (!currentUserId) return;

    const target =
      obiter.id === id
        ? obiter
        : threadParts?.find((o) => o.id === id);
    if (!target) return;

    const wasComunicado = target.hasComunicado;

    updateObiter(id, (o) => ({
      ...o,
      hasComunicado: !wasComunicado,
      comuniqueseCount: o.comuniqueseCount + (wasComunicado ? -1 : 1),
    }));

    try {
      const res = await fetch(`/api/obiter/${id}/comuniquese`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        updateObiter(id, (o) => ({
          ...o,
          hasComunicado: wasComunicado,
          comuniqueseCount: o.comuniqueseCount + (wasComunicado ? 1 : -1),
        }));
      }
    } catch {
      updateObiter(id, (o) => ({
        ...o,
        hasComunicado: wasComunicado,
        comuniqueseCount: o.comuniqueseCount + (wasComunicado ? 1 : -1),
      }));
    }
  }

  function handleCitar() {
    // Navigate to the diario page for citing
    window.location.href = "/dashboard/diario";
  }

  const isThread = threadParts && threadParts.length > 1;

  return (
    <div>
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/dashboard/diario"
          className="inline-flex items-center gap-1.5 font-archivo text-[12px] text-gz-ink-light transition-colors hover:text-gz-gold"
        >
          ← Volver al Diario
        </Link>
      </div>

      {/* Thread view or single card */}
      {isThread ? (
        <ObiterThreadView
          threadObiters={threadParts}
          currentUserId={currentUserId}
          onApoyar={handleApoyar}
          onGuardar={handleGuardar}
          onComuniquese={handleComuniquese}
          onCitar={handleCitar}
          onClose={() => {
            window.location.href = "/dashboard/diario";
          }}
        />
      ) : (
        <ObiterCard
          obiter={obiter}
          currentUserId={currentUserId}
          onApoyar={handleApoyar}
          onGuardar={handleGuardar}
          onComuniquese={handleComuniquese}
          onCitar={handleCitar}
        />
      )}

      {/* Citation chain */}
      <ObiterCiteChain
        originalObiter={obiter}
        citations={citations}
        currentUserId={currentUserId}
        onApoyar={handleApoyar}
        onCitar={handleCitar}
      />
    </div>
  );
}
