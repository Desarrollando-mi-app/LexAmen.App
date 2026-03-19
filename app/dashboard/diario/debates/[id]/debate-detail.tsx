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
  autor1Argumento: string | null;
  autor1Replica: string | null;
  autor2Id: string | null;
  autor2: DebateUser | null;
  autor2Posicion: string | null;
  autor2Argumento: string | null;
  autor2Replica: string | null;
  votosAutor1: number;
  votosAutor2: number;
  estado: string;
  fechaLimiteArgumentos: string | null;
  fechaLimiteReplicas: string | null;
  fechaLimiteVotacion: string | null;
  createdAt: string;
}

interface DebateDetailProps {
  debate: Debate;
  userId: string;
  yaVotado: boolean;
  votoPara: string | null;
}

// ─── Constants ──────────────────────────────────────────────

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
    label: "Fase de argumentos",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  replicas: {
    label: "Fase de replicas",
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

// ─── Avatar ─────────────────────────────────────────────────

function UserAvatar({
  user,
  size = 40,
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
        className="rounded-full border-2 border-gz-gold object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full bg-gz-navy font-archivo font-bold text-gz-gold-bright"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.35),
      }}
    >
      {initials}
    </div>
  );
}

// ─── Author Card ────────────────────────────────────────────

function AuthorCard({
  user,
  posicion,
  argumento,
  replica,
  side,
}: {
  user: DebateUser;
  posicion: string | null;
  argumento: string | null;
  replica: string | null;
  side: "left" | "right";
}) {
  return (
    <div
      className={`flex-1 space-y-4 ${side === "right" ? "text-right" : ""}`}
    >
      {/* Author info */}
      <div
        className={`flex items-center gap-3 ${side === "right" ? "flex-row-reverse" : ""}`}
      >
        <UserAvatar user={user} size={48} />
        <div>
          <p className="font-archivo text-[14px] font-semibold text-gz-ink">
            {user.firstName} {user.lastName}
          </p>
          {user.grado && (
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {user.grado}
            </p>
          )}
        </div>
      </div>

      {/* Posicion */}
      {posicion && (
        <div
          className={`rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-4 ${side === "right" ? "text-left" : ""}`}
        >
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Posicion
          </p>
          <p className="font-cormorant text-[15px] leading-relaxed text-gz-ink">
            {posicion}
          </p>
        </div>
      )}

      {/* Argumento */}
      {argumento && (
        <div
          className={`rounded-[4px] border border-gz-rule bg-white p-4 ${side === "right" ? "text-left" : ""}`}
        >
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-blue-600">
            Argumento
          </p>
          <p
            className="font-cormorant text-[15px] leading-relaxed text-gz-ink"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {argumento}
          </p>
        </div>
      )}

      {/* Replica */}
      {replica && (
        <div
          className={`rounded-[4px] border border-gz-rule bg-white p-4 ${side === "right" ? "text-left" : ""}`}
        >
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-purple-600">
            Replica
          </p>
          <p
            className="font-cormorant text-[15px] leading-relaxed text-gz-ink"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {replica}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Vote Bar ───────────────────────────────────────────────

function VoteBar({
  v1,
  v2,
  autor1Name,
  autor2Name,
}: {
  v1: number;
  v2: number;
  autor1Name: string;
  autor2Name: string;
}) {
  const total = v1 + v2;
  const p1 = total > 0 ? Math.round((v1 / total) * 100) : 50;
  const p2 = total > 0 ? 100 - p1 : 50;

  return (
    <div className="space-y-2">
      <div className="flex justify-between font-ibm-mono text-[10px] font-semibold">
        <span className="text-gz-navy">
          {autor1Name} &middot; {p1}%
        </span>
        <span className="text-gz-gold">
          {p2}% &middot; {autor2Name}
        </span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-gz-navy transition-all duration-500"
          style={{ width: `${p1}%` }}
        />
        <div
          className="bg-gz-gold transition-all duration-500"
          style={{ width: `${p2}%` }}
        />
      </div>
      <p className="text-center font-ibm-mono text-[10px] text-gz-ink-light">
        {total} voto{total !== 1 ? "s" : ""} total{total !== 1 ? "es" : ""}
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

export function DebateDetail({
  debate,
  userId,
  yaVotado: initialYaVotado,
  votoPara: initialVotoPara,
}: DebateDetailProps) {
  const router = useRouter();
  const [yaVotado, setYaVotado] = useState(initialYaVotado);
  const [votoPara, setVotoPara] = useState(initialVotoPara);
  const [voting, setVoting] = useState(false);
  const [voteError, setVoteError] = useState("");

  // Argumento/replica submission
  const [texto, setTexto] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const isAutor1 = debate.autor1Id === userId;
  const isAutor2 = debate.autor2Id === userId;
  const isParticipant = isAutor1 || isAutor2;
  const isOwnDebate = isAutor1 || isAutor2;

  const cfg = ESTADO_CONFIG[debate.estado] ?? ESTADO_CONFIG.cerrado;

  // Determine deadline for current phase
  let deadline = "";
  if (debate.estado === "argumentos")
    deadline = getCountdown(debate.fechaLimiteArgumentos);
  else if (debate.estado === "replicas")
    deadline = getCountdown(debate.fechaLimiteReplicas);
  else if (debate.estado === "votacion")
    deadline = getCountdown(debate.fechaLimiteVotacion);

  // Can submit argumento/replica?
  let canSubmit = false;
  let submitTipo: "argumento" | "replica" = "argumento";

  if (isParticipant && debate.estado === "argumentos") {
    const myArgumento = isAutor1
      ? debate.autor1Argumento
      : debate.autor2Argumento;
    if (!myArgumento) {
      canSubmit = true;
      submitTipo = "argumento";
    }
  }

  if (isParticipant && debate.estado === "replicas") {
    const myReplica = isAutor1
      ? debate.autor1Replica
      : debate.autor2Replica;
    if (!myReplica) {
      canSubmit = true;
      submitTipo = "replica";
    }
  }

  // Can vote?
  const canVote =
    debate.estado === "votacion" && !isOwnDebate && !yaVotado;

  // Determine winner
  const isCerrado = debate.estado === "cerrado";
  let winnerId: string | null = null;
  if (isCerrado) {
    winnerId =
      debate.votosAutor1 >= debate.votosAutor2
        ? debate.autor1Id
        : debate.autor2Id;
  }

  async function handleVote(para: "autor1" | "autor2") {
    setVoting(true);
    setVoteError("");
    try {
      const res = await fetch(`/api/diario/debates/${debate.id}/votar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ votoPara: para }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al votar");
      }

      setYaVotado(true);
      setVotoPara(para);
      router.refresh();
    } catch (err) {
      setVoteError(err instanceof Error ? err.message : "Error");
    } finally {
      setVoting(false);
    }
  }

  async function handleSubmitTexto() {
    if (texto.length < 200) {
      setSubmitError("El texto debe tener al menos 200 caracteres");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(
        `/api/diario/debates/${debate.id}/argumento`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ texto, tipo: submitTipo }),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al publicar");
      }

      router.refresh();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error");
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/diario/debates"
        className="inline-block font-archivo text-[12px] text-gz-gold hover:underline"
      >
        &larr; Volver a debates
      </Link>

      {/* Header */}
      <div className="mt-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[0.5px] ${cfg.color} ${cfg.bg}`}
          >
            {cfg.label}
          </span>
          <span className="rounded-full bg-gz-gold/10 px-2 py-0.5 font-ibm-mono text-[9px] font-medium uppercase tracking-[0.5px] text-gz-gold">
            {RAMA_LABELS[debate.rama] ?? debate.rama}
          </span>
          {debate.materias && (
            <span className="font-ibm-mono text-[10px] text-gz-ink-light">
              {debate.materias}
            </span>
          )}
          {deadline && (
            <span className="ml-auto font-ibm-mono text-[10px] text-gz-ink-light">
              {deadline}
            </span>
          )}
        </div>

        <h1 className="font-cormorant text-[28px] font-bold leading-snug text-gz-ink lg:text-[34px]">
          {debate.titulo}
        </h1>

        <p className="mt-2 font-cormorant text-[16px] leading-relaxed text-gz-ink-mid">
          {debate.descripcion}
        </p>

        <div className="mt-3 h-[1px] bg-gz-rule" />
      </div>

      {/* Winner announcement */}
      {isCerrado && winnerId && (
        <div className="mt-6 rounded-[4px] border-2 border-gz-gold bg-gz-gold/5 p-5 text-center">
          <p className="mb-1 text-[28px]">🏆</p>
          <p className="font-ibm-mono text-[10px] font-semibold uppercase tracking-[2px] text-gz-gold">
            Ganador del debate
          </p>
          <p className="mt-1 font-cormorant text-[22px] font-bold text-gz-ink">
            {winnerId === debate.autor1Id
              ? `${debate.autor1.firstName} ${debate.autor1.lastName}`
              : `${debate.autor2?.firstName} ${debate.autor2?.lastName}`}
          </p>
          <p className="mt-1 font-ibm-mono text-[11px] text-gz-ink-light">
            {debate.votosAutor1} vs {debate.votosAutor2} votos
          </p>
        </div>
      )}

      {/* Vote Bar */}
      {(debate.estado === "votacion" || isCerrado) && debate.autor2 && (
        <div className="mt-6">
          <VoteBar
            v1={debate.votosAutor1}
            v2={debate.votosAutor2}
            autor1Name={`${debate.autor1.firstName} ${debate.autor1.lastName}`}
            autor2Name={`${debate.autor2.firstName} ${debate.autor2.lastName}`}
          />
        </div>
      )}

      {/* Vote buttons */}
      {canVote && debate.autor2 && (
        <div className="mt-4">
          <p className="mb-2 text-center font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Tu voto
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleVote("autor1")}
              disabled={voting}
              className="inline-flex h-9 items-center rounded-[3px] bg-gz-navy px-5 font-archivo text-[12px] font-semibold text-white transition-colors hover:bg-gz-navy/80 disabled:opacity-50"
            >
              {debate.autor1.firstName} {debate.autor1.lastName}
            </button>
            <span className="font-ibm-mono text-[11px] text-gz-ink-light">
              o
            </span>
            <button
              onClick={() => handleVote("autor2")}
              disabled={voting}
              className="inline-flex h-9 items-center rounded-[3px] bg-gz-gold px-5 font-archivo text-[12px] font-semibold text-gz-navy transition-colors hover:bg-gz-gold/80 disabled:opacity-50"
            >
              {debate.autor2.firstName} {debate.autor2.lastName}
            </button>
          </div>
          {voteError && (
            <p className="mt-2 text-center font-archivo text-[11px] text-red-600">
              {voteError}
            </p>
          )}
        </div>
      )}

      {yaVotado && (
        <p className="mt-4 text-center font-ibm-mono text-[10px] text-gz-ink-light">
          Ya votaste por{" "}
          <span className="font-semibold text-gz-ink">
            {votoPara === "autor1"
              ? `${debate.autor1.firstName} ${debate.autor1.lastName}`
              : `${debate.autor2?.firstName} ${debate.autor2?.lastName}`}
          </span>
        </p>
      )}

      {/* Two columns: Autor1 VS Autor2 */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto_1fr]">
        {/* Autor 1 */}
        <AuthorCard
          user={debate.autor1}
          posicion={debate.autor1Posicion}
          argumento={debate.autor1Argumento}
          replica={debate.autor1Replica}
          side="left"
        />

        {/* VS divider */}
        <div className="hidden items-center justify-center md:flex">
          <div className="flex h-full flex-col items-center">
            <div className="flex-1 w-[1px] bg-gz-rule" />
            <div className="my-3 flex h-12 w-12 items-center justify-center rounded-full border-2 border-gz-burgundy bg-white">
              <span className="font-ibm-mono text-[14px] font-bold text-gz-burgundy">
                VS
              </span>
            </div>
            <div className="flex-1 w-[1px] bg-gz-rule" />
          </div>
        </div>

        {/* Mobile VS divider */}
        <div className="flex items-center justify-center md:hidden">
          <div className="h-[1px] flex-1 bg-gz-rule" />
          <span className="mx-4 font-ibm-mono text-[14px] font-bold text-gz-burgundy">
            VS
          </span>
          <div className="h-[1px] flex-1 bg-gz-rule" />
        </div>

        {/* Autor 2 */}
        {debate.autor2 ? (
          <AuthorCard
            user={debate.autor2}
            posicion={debate.autor2Posicion}
            argumento={debate.autor2Argumento}
            replica={debate.autor2Replica}
            side="right"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="font-cormorant text-[17px] italic text-gz-ink-light">
              Esperando a que alguien acepte el debate...
            </p>
          </div>
        )}
      </div>

      {/* Submit argumento/replica form */}
      {canSubmit && (
        <div className="mt-8 rounded-[4px] border-2 border-gz-gold bg-white p-5">
          <h3 className="mb-3 font-ibm-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Publicar tu{" "}
            {submitTipo === "argumento" ? "argumento" : "replica"}
          </h3>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              submitTipo === "argumento"
                ? "Desarrolla tu argumento juridico con fundamentos, doctrina y/o jurisprudencia..."
                : "Replica al argumento de tu oponente, rebate sus puntos y refuerza tu posicion..."
            }
            rows={10}
            className="w-full rounded-[3px] border border-gz-rule bg-white px-4 py-3 font-cormorant text-[15px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none focus:ring-1 focus:ring-gz-gold/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="font-ibm-mono text-[10px] text-gz-ink-light">
              {texto.length}/5000 caracteres (min. 200)
            </p>
            <div className="flex items-center gap-3">
              {submitError && (
                <p className="font-archivo text-[11px] text-red-600">
                  {submitError}
                </p>
              )}
              <button
                onClick={handleSubmitTexto}
                disabled={submitting || texto.length < 200}
                className="inline-flex h-9 items-center rounded-[3px] bg-gz-navy px-5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
              >
                {submitting
                  ? "Publicando..."
                  : `Publicar ${submitTipo}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-8 border-t border-gz-rule pt-3">
        <p className="font-ibm-mono text-[10px] text-gz-ink-light">
          Debate creado el{" "}
          {new Date(debate.createdAt).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}
