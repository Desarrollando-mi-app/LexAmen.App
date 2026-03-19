"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────

interface DebateUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado: string | null;
}

interface Debate {
  id: string;
  titulo: string;
  descripcion: string;
  rama: string;
  materias: string | null;
  autor1Id: string;
  autor1: DebateUser;
  autor1Posicion: string | null;
  autor2Id: string | null;
  autor2: DebateUser | null;
  autor2Posicion: string | null;
  votosAutor1: number;
  votosAutor2: number;
  estado: string;
  fechaLimiteArgumentos: string | null;
  fechaLimiteReplicas: string | null;
  fechaLimiteVotacion: string | null;
  createdAt: string;
}

interface DebateListProps {
  debates: Debate[];
  userId: string;
}

// ─── Helpers ────────────────────────────────────────────────

const RAMA_LABELS: Record<string, string> = {
  civil: "Civil",
  penal: "Penal",
  constitucional: "Constitucional",
  administrativo: "Administrativo",
  laboral: "Laboral",
  tributario: "Tributario",
  comercial: "Comercial",
  procesal: "Procesal",
  internacional: "Internacional",
  ambiental: "Ambiental",
  familia: "Familia",
  otro: "Otro",
};

const ESTADO_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  buscando_oponente: {
    label: "Buscando oponente",
    color: "text-amber-700",
    bg: "bg-amber-50 border-amber-200",
  },
  argumentos: {
    label: "Argumentos",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  replicas: {
    label: "Replicas",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  votacion: {
    label: "En votacion",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  cerrado: {
    label: "Cerrado",
    color: "text-gz-ink-light",
    bg: "bg-gz-cream-dark/50 border-gz-rule",
  },
};

function getCountdown(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Plazo vencido";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h restantes`;
  return `${hours}h restantes`;
}

function getActiveDeadline(debate: Debate): string | null {
  if (debate.estado === "argumentos") return debate.fechaLimiteArgumentos;
  if (debate.estado === "replicas") return debate.fechaLimiteReplicas;
  if (debate.estado === "votacion") return debate.fechaLimiteVotacion;
  return null;
}

function UserAvatar({
  user,
  size = 28,
}: {
  user: DebateUser;
  size?: number;
}) {
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        className="rounded-full border border-gz-gold object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gz-navy font-archivo text-gz-gold-bright"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(8, size * 0.35),
        fontWeight: 600,
      }}
    >
      {initials}
    </div>
  );
}

// ─── Vote Bar ───────────────────────────────────────────────

function VoteBar({ v1, v2 }: { v1: number; v2: number }) {
  const total = v1 + v2;
  if (total === 0) {
    return (
      <div className="flex h-[6px] w-full overflow-hidden rounded-full bg-gz-cream-dark">
        <div className="w-1/2 bg-gz-rule" />
        <div className="w-1/2 bg-gz-rule-dark" />
      </div>
    );
  }

  const p1 = Math.round((v1 / total) * 100);
  const p2 = 100 - p1;

  return (
    <div className="space-y-1">
      <div className="flex h-[6px] w-full overflow-hidden rounded-full">
        <div
          className="bg-gz-navy transition-all"
          style={{ width: `${p1}%` }}
        />
        <div
          className="bg-gz-gold transition-all"
          style={{ width: `${p2}%` }}
        />
      </div>
      <div className="flex justify-between font-ibm-mono text-[9px] text-gz-ink-light">
        <span>{p1}% ({v1})</span>
        <span>({v2}) {p2}%</span>
      </div>
    </div>
  );
}

// ─── Debate Card ────────────────────────────────────────────

function DebateCard({
  debate,
  userId,
}: {
  debate: Debate;
  userId: string;
}) {
  const [accepting, setAccepting] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [miPosicion, setMiPosicion] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const cfg = ESTADO_CONFIG[debate.estado] ?? ESTADO_CONFIG.cerrado;
  const deadline = getActiveDeadline(debate);
  const countdown = getCountdown(deadline);
  const isOwner = debate.autor1Id === userId;
  const canAccept =
    debate.estado === "buscando_oponente" && !isOwner;

  async function handleAccept() {
    if (!miPosicion || miPosicion.length < 10) {
      setError("La posicion debe tener al menos 10 caracteres");
      return;
    }
    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/diario/debates/${debate.id}/aceptar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ miPosicion }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aceptar");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setAccepting(false);
    }
  }

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5 transition-colors hover:border-gz-gold/40">
      {/* Top row: estado badge + rama + countdown */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[0.5px] ${cfg.color} ${cfg.bg}`}
        >
          {cfg.label}
        </span>
        <span className="rounded-full bg-gz-gold/10 px-2 py-0.5 font-ibm-mono text-[9px] font-medium uppercase tracking-[0.5px] text-gz-gold">
          {RAMA_LABELS[debate.rama] ?? debate.rama}
        </span>
        {countdown && (
          <span className="ml-auto font-ibm-mono text-[10px] text-gz-ink-light">
            {countdown}
          </span>
        )}
      </div>

      {/* Title */}
      <Link href={`/dashboard/diario/debates/${debate.id}`}>
        <h3 className="font-cormorant text-[18px] font-bold leading-snug text-gz-ink transition-colors hover:text-gz-gold">
          {debate.titulo}
        </h3>
      </Link>

      {/* Authors row */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar user={debate.autor1} size={24} />
          <div>
            <span className="font-archivo text-[12px] font-semibold text-gz-ink">
              {debate.autor1.firstName} {debate.autor1.lastName}
            </span>
            {debate.autor1.grado && (
              <span className="ml-1 font-ibm-mono text-[9px] text-gz-ink-light">
                {debate.autor1.grado}
              </span>
            )}
          </div>
        </div>

        <span className="font-ibm-mono text-[11px] font-bold text-gz-burgundy">
          VS
        </span>

        {debate.autor2 ? (
          <div className="flex items-center gap-2">
            <UserAvatar user={debate.autor2} size={24} />
            <div>
              <span className="font-archivo text-[12px] font-semibold text-gz-ink">
                {debate.autor2.firstName} {debate.autor2.lastName}
              </span>
              {debate.autor2.grado && (
                <span className="ml-1 font-ibm-mono text-[9px] text-gz-ink-light">
                  {debate.autor2.grado}
                </span>
              )}
            </div>
          </div>
        ) : (
          <span className="font-archivo text-[12px] italic text-gz-ink-light">
            Esperando oponente...
          </span>
        )}
      </div>

      {/* Vote bar (votacion or cerrado) */}
      {(debate.estado === "votacion" || debate.estado === "cerrado") && (
        <div className="mt-3">
          <VoteBar v1={debate.votosAutor1} v2={debate.votosAutor2} />
        </div>
      )}

      {/* Accept button for buscando_oponente */}
      {canAccept && !showAcceptForm && (
        <button
          onClick={() => setShowAcceptForm(true)}
          className="mt-3 inline-flex h-8 items-center gap-1 rounded-[3px] bg-gz-navy px-4 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          Aceptar y debatir &rarr;
        </button>
      )}

      {/* Accept form */}
      {canAccept && showAcceptForm && (
        <div className="mt-3 space-y-2 rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-3">
          <label className="block font-ibm-mono text-[10px] font-semibold uppercase tracking-[1px] text-gz-ink-mid">
            Tu posicion contraria
          </label>
          <textarea
            value={miPosicion}
            onChange={(e) => setMiPosicion(e.target.value)}
            placeholder="Declara tu posicion opuesta..."
            rows={2}
            className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-cormorant text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none"
          />
          {error && (
            <p className="font-archivo text-[11px] text-red-600">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="inline-flex h-8 items-center rounded-[3px] bg-gz-navy px-4 font-archivo text-[11px] font-semibold text-white hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              {accepting ? "Aceptando..." : "Confirmar"}
            </button>
            <button
              onClick={() => {
                setShowAcceptForm(false);
                setMiPosicion("");
                setError("");
              }}
              className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* View link */}
      <div className="mt-3 text-right">
        <Link
          href={`/dashboard/diario/debates/${debate.id}`}
          className="font-archivo text-[12px] font-semibold text-gz-gold hover:underline"
        >
          Ver debate &rarr;
        </Link>
      </div>
    </div>
  );
}

// ─── Main List ──────────────────────────────────────────────

export function DebateList({ debates, userId }: DebateListProps) {
  const votacion = debates.filter((d) => d.estado === "votacion");
  const enProgreso = debates.filter(
    (d) => d.estado === "argumentos" || d.estado === "replicas"
  );
  const buscando = debates.filter((d) => d.estado === "buscando_oponente");
  const cerrados = debates.filter((d) => d.estado === "cerrado");

  const sections = [
    { title: "En Votacion", debates: votacion, emoji: "🗳️" },
    { title: "En Progreso", debates: enProgreso, emoji: "⚔️" },
    { title: "Buscando Oponente", debates: buscando, emoji: "🔎" },
    { title: "Cerrados", debates: cerrados, emoji: "📕" },
  ];

  return (
    <div>
      {/* Action bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-mid">
          {debates.length} debate{debates.length !== 1 ? "s" : ""}
        </p>
        <Link
          href="/dashboard/diario/debates/proponer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[3px] bg-gz-navy px-4 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
        >
          + Proponer un debate
        </Link>
      </div>

      {/* Sections */}
      {sections.map((section) => {
        if (section.debates.length === 0) return null;
        return (
          <div key={section.title} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 font-ibm-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
              <span>{section.emoji}</span>
              {section.title}
              <span className="ml-1 text-gz-ink-light">
                ({section.debates.length})
              </span>
            </h2>
            <div className="space-y-3">
              {section.debates.map((d) => (
                <DebateCard key={d.id} debate={d} userId={userId} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {debates.length === 0 && (
        <div className="py-16 text-center">
          <p className="mb-2 font-cormorant text-[20px] italic text-gz-ink-light">
            Aun no hay debates juridicos.
          </p>
          <p className="mb-4 font-archivo text-[13px] text-gz-ink-light">
            Se el primero en proponer un debate.
          </p>
          <Link
            href="/dashboard/diario/debates/proponer"
            className="inline-flex h-9 items-center gap-1.5 rounded-[3px] bg-gz-navy px-4 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
          >
            + Proponer un debate
          </Link>
        </div>
      )}
    </div>
  );
}
