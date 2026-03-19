"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { playAchievement } from "@/lib/sounds";
import { useXpFloat } from "@/app/dashboard/components/xp-float-provider";
import { useBadgeModal } from "@/app/dashboard/components/badge-modal-provider";

// ─── Constants ──────────────────────────────────────────────

const VOTING_MIN_GRADO = 3;

const CODIGOS = [
  "Codigo Civil",
  "Codigo de Procedimiento Civil",
  "Codigo Organico de Tribunales",
  "Ley de Matrimonio Civil",
  "Ley 19.947",
  "Ley 20.830",
  "Otro",
];

// ─── Types ──────────────────────────────────────────────────

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado?: number;
}

interface Comentario {
  id: string;
  contenido: string;
  createdAt: string;
  userId: string;
  user: Omit<UserInfo, "grado">;
}

interface ArgumentoData {
  id: string;
  bando: string;
  posicion: string;
  fundamentoNormativo: string;
  argumento: string;
  jurisprudencia: string | null;
  normativa: string | null;
  votos: number;
  parentId: string | null;
  createdAt: string;
  userId: string;
  user: UserInfo;
  hasVoted: boolean;
  comentarios: Comentario[];
  contraArgumentos: ArgumentoData[];
}

interface ExpedienteData {
  id: string;
  numero: number;
  titulo: string;
  hechos: string;
  pregunta: string;
  rama: string;
  materias: string | null;
  dificultad: number;
  bandoDemandante: string;
  bandoDemandado: string;
  fechaApertura: string;
  fechaCierre: string;
  estado: string;
  cierreEditorial: string | null;
  mejorArgumentoId: string | null;
  argumentos: ArgumentoData[];
  stats: {
    totalArgumentos: number;
    participantes: number;
    totalVotos: number;
    demandanteCount: number;
    demandadoCount: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

const RAMA_LABELS: Record<string, string> = {
  DERECHO_CIVIL: "Derecho Civil",
  DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil",
  DERECHO_ORGANICO: "Derecho Organico",
};

// ─── Countdown ──────────────────────────────────────────────

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState(() =>
    getTimeLeft(new Date(targetDate))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(new Date(targetDate)));
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function getTimeLeft(target: Date) {
  const diff = target.getTime() - Date.now();
  if (diff <= 0)
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function CountdownInline({ fechaCierre }: { fechaCierre: string }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(fechaCierre);
  if (expired) return null;
  return (
    <span className="font-ibm-mono text-[11px] text-gz-ink-light">
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
      {String(seconds).padStart(2, "0")}
    </span>
  );
}

// ─── Bando Split Bar ────────────────────────────────────────

function BandoSplitBar({
  demandanteCount,
  demandadoCount,
  bandoDemandante,
  bandoDemandado,
}: {
  demandanteCount: number;
  demandadoCount: number;
  bandoDemandante: string;
  bandoDemandado: string;
}) {
  const total = demandanteCount + demandadoCount;
  const demPct = total > 0 ? Math.round((demandanteCount / total) * 100) : 50;
  const defPct = total > 0 ? 100 - demPct : 50;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-ibm-mono text-[9px] tracking-[0.5px]">
        <span className="text-gz-gold">
          {bandoDemandante} ({demPct}%)
        </span>
        <span className="text-gz-burgundy">
          {bandoDemandado} ({defPct}%)
        </span>
      </div>
      <div className="flex h-[6px] overflow-hidden rounded-full bg-gz-cream-dark">
        <div
          className="bg-gz-gold transition-all duration-500"
          style={{ width: `${demPct}%` }}
        />
        <div
          className="bg-gz-burgundy transition-all duration-500"
          style={{ width: `${defPct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Jurisprudencia Row ─────────────────────────────────────

interface JurispRow {
  tribunal: string;
  rol: string;
  fecha: string;
  extracto: string;
}

function JurisprudenciaEditor({
  rows,
  setRows,
}: {
  rows: JurispRow[];
  setRows: (rows: JurispRow[]) => void;
}) {
  function addRow() {
    setRows([...rows, { tribunal: "", rol: "", fecha: "", extracto: "" }]);
  }

  function updateRow(idx: number, field: keyof JurispRow, value: string) {
    const copy = [...rows];
    copy[idx] = { ...copy[idx], [field]: value };
    setRows(copy);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
        Jurisprudencia (opcional)
      </label>
      {rows.map((row, idx) => (
        <div
          key={idx}
          className="mb-2 rounded-[3px] border border-gz-rule bg-gz-cream-dark/20 p-3"
        >
          <div className="mb-2 grid grid-cols-3 gap-2">
            <input
              placeholder="Tribunal"
              value={row.tribunal}
              onChange={(e) => updateRow(idx, "tribunal", e.target.value)}
              className="rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
            <input
              placeholder="Rol"
              value={row.rol}
              onChange={(e) => updateRow(idx, "rol", e.target.value)}
              className="rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
            <input
              type="date"
              value={row.fecha}
              onChange={(e) => updateRow(idx, "fecha", e.target.value)}
              className="rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
            />
          </div>
          <textarea
            placeholder="Extracto relevante"
            value={row.extracto}
            onChange={(e) => updateRow(idx, "extracto", e.target.value)}
            rows={2}
            className="w-full rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
          />
          <button
            onClick={() => removeRow(idx)}
            className="mt-1 font-archivo text-[11px] text-gz-red hover:underline"
          >
            Eliminar
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="font-archivo text-[12px] font-semibold text-gz-gold hover:underline"
      >
        + Agregar fallo
      </button>
    </div>
  );
}

// ─── Normativa Row ──────────────────────────────────────────

interface NormRow {
  codigo: string;
  articulo: string;
}

function NormativaEditor({
  rows,
  setRows,
}: {
  rows: NormRow[];
  setRows: (rows: NormRow[]) => void;
}) {
  function addRow() {
    setRows([...rows, { codigo: CODIGOS[0], articulo: "" }]);
  }

  function updateRow(idx: number, field: keyof NormRow, value: string) {
    const copy = [...rows];
    copy[idx] = { ...copy[idx], [field]: value };
    setRows(copy);
  }

  function removeRow(idx: number) {
    setRows(rows.filter((_, i) => i !== idx));
  }

  return (
    <div>
      <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
        Normativa Citada (opcional)
      </label>
      {rows.map((row, idx) => (
        <div key={idx} className="mb-2 flex items-center gap-2">
          <select
            value={row.codigo}
            onChange={(e) => updateRow(idx, "codigo", e.target.value)}
            className="flex-1 rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink focus:border-gz-gold focus:outline-none"
          >
            {CODIGOS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            placeholder="Art. 1545"
            value={row.articulo}
            onChange={(e) => updateRow(idx, "articulo", e.target.value)}
            className="w-[120px] rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
          />
          <button
            onClick={() => removeRow(idx)}
            className="font-archivo text-[11px] text-gz-red hover:underline"
          >
            X
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="font-archivo text-[12px] font-semibold text-gz-gold hover:underline"
      >
        + Agregar articulo
      </button>
    </div>
  );
}

// ─── Argument Editor ────────────────────────────────────────

function ArgumentEditor({
  expedienteId,
  bando,
  bandoLabel,
  parentId,
  onSuccess,
  onCancel,
}: {
  expedienteId: string;
  bando: string;
  bandoLabel: string;
  parentId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [posicion, setPosicion] = useState("");
  const [fundamentoNormativo, setFundamentoNormativo] = useState("");
  const [argumento, setArgumento] = useState("");
  const [jurisp, setJurisp] = useState<JurispRow[]>([]);
  const [normas, setNormas] = useState<NormRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { showXpFloat } = useXpFloat();
  const { showBadgeModal } = useBadgeModal();

  const isContra = !!parentId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (posicion.length === 0 || posicion.length > 200) {
      setError("La posicion debe tener entre 1 y 200 caracteres.");
      return;
    }
    if (fundamentoNormativo.length === 0 || fundamentoNormativo.length > 500) {
      setError(
        "El fundamento normativo debe tener entre 1 y 500 caracteres."
      );
      return;
    }
    if (argumento.length < 100 || argumento.length > 5000) {
      setError("El argumento debe tener entre 100 y 5000 caracteres.");
      return;
    }

    setSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        bando,
        posicion,
        fundamentoNormativo,
        argumento,
      };

      if (parentId) body.parentId = parentId;

      if (jurisp.length > 0) {
        body.jurisprudencia = JSON.stringify(
          jurisp.filter((j) => j.tribunal || j.rol)
        );
      }
      if (normas.length > 0) {
        body.normativa = JSON.stringify(
          normas.filter((n) => n.articulo)
        );
      }

      const res = await fetch(
        `/api/expediente/${expedienteId}/argumentar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al enviar el argumento.");
      }

      const data = await res.json();

      // XP float
      if (data.xpGanado) {
        showXpFloat(data.xpGanado);
      }

      // Badge check
      if (data.badges && data.badges.length > 0) {
        for (const badge of data.badges) {
          showBadgeModal(badge);
        }
      }

      playAchievement();
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al enviar el argumento."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[4px] border border-gz-rule bg-white p-5"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
          {isContra ? "Contra-argumento" : `Argumentando: ${bandoLabel}`}
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink"
        >
          Cancelar
        </button>
      </div>

      {/* Posicion */}
      <div className="mb-4">
        <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
          Posicion
        </label>
        <textarea
          value={posicion}
          onChange={(e) => setPosicion(e.target.value)}
          maxLength={200}
          rows={2}
          placeholder="Resume tu posicion en una frase..."
          className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
        />
        <p className="mt-0.5 text-right font-ibm-mono text-[9px] text-gz-ink-light">
          {posicion.length}/200
        </p>
      </div>

      {/* Fundamento Normativo */}
      <div className="mb-4">
        <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
          Fundamento Normativo
        </label>
        <textarea
          value={fundamentoNormativo}
          onChange={(e) => setFundamentoNormativo(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="Indica las normas en que se funda tu argumento..."
          className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
        />
        <p className="mt-0.5 text-right font-ibm-mono text-[9px] text-gz-ink-light">
          {fundamentoNormativo.length}/500
        </p>
      </div>

      {/* Argumento */}
      <div className="mb-4">
        <label className="mb-1 block font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
          Argumento
        </label>
        <textarea
          value={argumento}
          onChange={(e) => setArgumento(e.target.value)}
          maxLength={5000}
          rows={8}
          placeholder="Desarrolla tu argumento juridico (min. 100 caracteres)..."
          className="w-full rounded-[3px] border border-gz-rule bg-white px-3 py-2 font-archivo text-[13px] leading-relaxed text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
        />
        <p
          className={`mt-0.5 text-right font-ibm-mono text-[9px] ${
            argumento.length < 100 ? "text-gz-red" : "text-gz-ink-light"
          }`}
        >
          {argumento.length}/5000{" "}
          {argumento.length < 100 && `(min. 100)`}
        </p>
      </div>

      {/* Jurisprudencia (optional) */}
      {!isContra && (
        <div className="mb-4">
          <JurisprudenciaEditor rows={jurisp} setRows={setJurisp} />
        </div>
      )}

      {/* Normativa (optional) */}
      {!isContra && (
        <div className="mb-4">
          <NormativaEditor rows={normas} setRows={setNormas} />
        </div>
      )}

      {/* Disclaimer */}
      <div className="mb-4 rounded-[3px] bg-gz-gold/[0.06] px-3 py-2">
        <p className="font-archivo text-[11px] text-gz-ink-mid">
          Tu argumento sera publico y visible para toda la comunidad.
          Asegurate de fundamentar correctamente.
        </p>
      </div>

      {error && (
        <p className="mb-3 font-archivo text-[12px] text-gz-red">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-[3px] bg-gz-navy px-4 py-3 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
      >
        {submitting
          ? "Enviando..."
          : isContra
            ? "Publicar contra-argumento"
            : "Publicar argumento"}
      </button>
    </form>
  );
}

// ─── Comment Section ────────────────────────────────────────

function CommentSection({
  argumentoId,
  expedienteId,
  comentarios,
  onRefresh,
}: {
  argumentoId: string;
  expedienteId: string;
  comentarios: Comentario[];
  onRefresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [contenido, setContenido] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim() || contenido.length > 500) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/expediente/${expedienteId}/comentar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ argumentoId, contenido: contenido.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      setContenido("");
      onRefresh();
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="font-archivo text-[11px] text-gz-ink-light hover:text-gz-ink"
      >
        Comentarios ({comentarios.length})
      </button>

      {open && (
        <div className="mt-2 space-y-2 border-l-2 border-gz-rule pl-3">
          {comentarios.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-1.5">
                {c.user.avatarUrl ? (
                  <img
                    src={c.user.avatarUrl}
                    alt=""
                    className="h-5 w-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[8px] font-bold text-gz-gold">
                    {c.user.firstName[0]}
                    {c.user.lastName[0]}
                  </div>
                )}
                <span className="font-archivo text-[11px] font-semibold text-gz-ink">
                  {c.user.firstName} {c.user.lastName}
                </span>
                <span className="font-ibm-mono text-[9px] text-gz-ink-light">
                  {timeAgo(c.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 pl-[26px] font-archivo text-[12px] text-gz-ink-mid">
                {c.contenido}
              </p>
            </div>
          ))}

          {/* Comment form */}
          <form onSubmit={handleSubmit} className="flex gap-2 pt-1">
            <input
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              maxLength={500}
              placeholder="Escribe un comentario..."
              className="flex-1 rounded-[3px] border border-gz-rule bg-white px-2 py-1.5 font-archivo text-[12px] text-gz-ink placeholder:text-gz-ink-light/50 focus:border-gz-gold focus:outline-none"
            />
            <button
              type="submit"
              disabled={submitting || !contenido.trim()}
              className="rounded-[3px] bg-gz-navy px-3 py-1.5 font-archivo text-[11px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Argument Card ──────────────────────────────────────────

function ArgumentCard({
  arg,
  expediente,
  currentUserId,
  currentUserGrado,
  onRefresh,
  isContra,
}: {
  arg: ArgumentoData;
  expediente: ExpedienteData;
  currentUserId: string;
  currentUserGrado: number;
  onRefresh: () => void;
  isContra?: boolean;
}) {
  const [voting, setVoting] = useState(false);
  const [localVotos, setLocalVotos] = useState(arg.votos);
  const [localHasVoted, setLocalHasVoted] = useState(arg.hasVoted);
  const [showContraForm, setShowContraForm] = useState(false);
  const { showXpFloat } = useXpFloat();

  const isOpen = expediente.estado === "abierto";
  const isOwnArg = arg.userId === currentUserId;
  const canVote =
    isOpen &&
    !isOwnArg &&
    !localHasVoted &&
    currentUserGrado >= VOTING_MIN_GRADO;
  const isBest = expediente.mejorArgumentoId === arg.id;

  const bandoColor =
    arg.bando === expediente.bandoDemandante
      ? "text-gz-gold"
      : "text-gz-burgundy";
  const bandoBg =
    arg.bando === expediente.bandoDemandante
      ? "bg-gz-gold/[0.08]"
      : "bg-gz-burgundy/[0.08]";

  async function handleVote() {
    if (!canVote || voting) return;
    setVoting(true);
    try {
      const res = await fetch(
        `/api/expediente/${expediente.id}/votar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ argumentoId: arg.id }),
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalVotos((v) => v + 1);
      setLocalHasVoted(true);
      if (data.xpGanado) showXpFloat(data.xpGanado);
    } catch {
      /* silent */
    } finally {
      setVoting(false);
    }
  }

  // Parse jurisprudencia
  let jurispItems: JurispRow[] = [];
  if (arg.jurisprudencia) {
    try {
      jurispItems = JSON.parse(arg.jurisprudencia);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`rounded-[4px] border bg-white p-5 ${
        isBest
          ? "border-gz-gold shadow-sm"
          : "border-gz-rule"
      } ${isContra ? "ml-6 border-l-2 border-l-gz-rule" : ""}`}
    >
      {/* Author header */}
      <div className="mb-3 flex items-center gap-2.5">
        {arg.user.avatarUrl ? (
          <img
            src={arg.user.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full border border-gz-gold object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-semibold text-gz-gold-bright">
            {arg.user.firstName[0]}
            {arg.user.lastName[0]}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/perfil/${arg.userId}`}
              className="font-archivo text-[13px] font-semibold text-gz-ink hover:underline"
            >
              {arg.user.firstName} {arg.user.lastName}
            </Link>
            {arg.user.grado && (
              <span className="rounded-sm bg-gz-navy/10 px-1.5 py-0.5 font-ibm-mono text-[8px] font-bold text-gz-navy">
                Grado {arg.user.grado}
              </span>
            )}
            {isBest && (
              <span className="rounded-sm bg-gz-gold/20 px-1.5 py-0.5 font-ibm-mono text-[8px] font-bold text-gz-gold">
                MEJOR ALEGATO
              </span>
            )}
          </div>
          <span className="font-ibm-mono text-[10px] text-gz-ink-light">
            {timeAgo(arg.createdAt)}
          </span>
        </div>

        {/* Bando label */}
        <span
          className={`rounded-sm px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] ${bandoColor} ${bandoBg}`}
        >
          {arg.bando}
        </span>
      </div>

      {/* Posicion */}
      <div className="mb-3">
        <p className="mb-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
          Posicion
        </p>
        <p className="font-cormorant text-[16px] font-semibold italic leading-snug text-gz-ink">
          {arg.posicion}
        </p>
      </div>

      {/* Fundamento Normativo */}
      <div className="mb-3">
        <p className="mb-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
          Fundamento Normativo
        </p>
        <p className="font-archivo text-[13px] leading-relaxed text-gz-ink-mid">
          {arg.fundamentoNormativo}
        </p>
      </div>

      {/* Argumento */}
      <div className="mb-3">
        <p className="mb-0.5 font-ibm-mono text-[8px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
          Argumento
        </p>
        <p
          className="font-cormorant text-[15px] leading-[1.7] text-gz-ink"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {arg.argumento}
        </p>
      </div>

      {/* Jurisprudencia */}
      {jurispItems.length > 0 && (
        <div className="mb-3">
          <p className="mb-1 font-ibm-mono text-[8px] font-semibold uppercase tracking-[1.5px] text-gz-ink-light">
            Jurisprudencia Citada
          </p>
          <div className="space-y-1.5">
            {jurispItems.map((j, i) => (
              <div
                key={i}
                className="rounded-[3px] bg-gz-cream-dark/40 px-3 py-2"
              >
                <p className="font-ibm-mono text-[10px] font-semibold text-gz-ink">
                  {j.tribunal} - Rol {j.rol}
                  {j.fecha && ` (${j.fecha})`}
                </p>
                {j.extracto && (
                  <p className="mt-0.5 font-cormorant text-[13px] italic text-gz-ink-mid">
                    {j.extracto}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-4 border-t border-gz-rule pt-3">
        {/* Vote */}
        <button
          onClick={handleVote}
          disabled={!canVote || voting}
          title={
            !isOpen
              ? "Expediente cerrado"
              : isOwnArg
                ? "No puedes votar tu propio argumento"
                : localHasVoted
                  ? "Ya votaste"
                  : currentUserGrado < VOTING_MIN_GRADO
                    ? `Necesitas Grado ${VOTING_MIN_GRADO} para votar`
                    : "Votar"
          }
          className={`flex items-center gap-1 rounded-[3px] px-2 py-1 font-ibm-mono text-[11px] transition-colors ${
            localHasVoted
              ? "bg-gz-gold/10 text-gz-gold"
              : canVote
                ? "text-gz-ink-light hover:bg-gz-gold/10 hover:text-gz-gold"
                : "cursor-not-allowed text-gz-ink-light/40"
          }`}
        >
          <span>{localHasVoted ? "+" : "^"}</span>
          <span>{localVotos}</span>
        </button>

        {/* Contra-argumentar */}
        {isOpen && !isContra && (
          <button
            onClick={() => setShowContraForm(!showContraForm)}
            className="flex items-center gap-1 font-archivo text-[11px] text-gz-ink-light transition-colors hover:text-gz-ink"
          >
            <span>Contra-argumentar</span>
          </button>
        )}

        {/* Comments */}
        <CommentSection
          argumentoId={arg.id}
          expedienteId={expediente.id}
          comentarios={arg.comentarios}
          onRefresh={onRefresh}
        />
      </div>

      {/* Contra-argument form */}
      {showContraForm && (
        <div className="mt-4">
          <ArgumentEditor
            expedienteId={expediente.id}
            bando={arg.bando}
            bandoLabel={arg.bando}
            parentId={arg.id}
            onSuccess={() => {
              setShowContraForm(false);
              onRefresh();
            }}
            onCancel={() => setShowContraForm(false)}
          />
        </div>
      )}

      {/* Nested contra-arguments */}
      {arg.contraArgumentos.length > 0 && (
        <div className="mt-4 space-y-3">
          {arg.contraArgumentos.map((contra) => (
            <ArgumentCard
              key={contra.id}
              arg={contra}
              expediente={expediente}
              currentUserId={currentUserId}
              currentUserGrado={currentUserGrado}
              onRefresh={onRefresh}
              isContra
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Podium ─────────────────────────────────────────────────

function Podium({ argumentos }: { argumentos: ArgumentoData[] }) {
  const sorted = [...argumentos]
    .filter((a) => a.parentId === null)
    .sort((a, b) => b.votos - a.votos)
    .slice(0, 3);

  if (sorted.length === 0) return null;

  const medals = ["1ro", "2do", "3ro"];
  const medalColors = [
    "text-gz-gold font-bold",
    "text-gz-ink-mid",
    "text-gz-burgundy",
  ];

  return (
    <div className="mb-6 rounded-[4px] border border-gz-gold/30 bg-gz-gold/[0.04] p-5">
      <p className="mb-3 font-ibm-mono text-[10px] font-semibold uppercase tracking-[2px] text-gz-gold">
        Podio
      </p>
      <div className="space-y-2">
        {sorted.map((a, i) => (
          <div key={a.id} className="flex items-center gap-3">
            <span
              className={`w-[40px] font-ibm-mono text-[13px] font-bold ${medalColors[i]}`}
            >
              {medals[i]}
            </span>
            <div className="flex items-center gap-2">
              {a.user.avatarUrl ? (
                <img
                  src={a.user.avatarUrl}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy font-archivo text-[10px] font-semibold text-gz-gold-bright">
                  {a.user.firstName[0]}
                  {a.user.lastName[0]}
                </div>
              )}
              <span className="font-archivo text-[13px] font-semibold text-gz-ink">
                {a.user.firstName} {a.user.lastName}
              </span>
            </div>
            <span className="ml-auto font-ibm-mono text-[11px] text-gz-ink-light">
              {a.votos} votos
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────

type FilterTab = "todos" | "demandante" | "demandado" | "masVotados";

export function ExpedienteDetail({
  expediente,
  currentUserId,
  currentUserGrado,
  userBandos,
}: {
  expediente: ExpedienteData;
  currentUserId: string;
  currentUserGrado: number;
  userBandos: string[];
}) {
  const router = useRouter();
  const [filterTab, setFilterTab] = useState<FilterTab>("todos");
  const [selectedBando, setSelectedBando] = useState<string | null>(null);

  const isOpen = expediente.estado === "abierto";
  const canArgDemandante =
    isOpen && !userBandos.includes(expediente.bandoDemandante);
  const canArgDemandado =
    isOpen && !userBandos.includes(expediente.bandoDemandado);

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  // Filter arguments
  let filteredArgs = expediente.argumentos;
  if (filterTab === "demandante") {
    filteredArgs = filteredArgs.filter(
      (a) => a.bando === expediente.bandoDemandante
    );
  } else if (filterTab === "demandado") {
    filteredArgs = filteredArgs.filter(
      (a) => a.bando === expediente.bandoDemandado
    );
  } else if (filterTab === "masVotados") {
    filteredArgs = [...filteredArgs].sort((a, b) => b.votos - a.votos);
  }

  const FILTER_TABS: { key: FilterTab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "demandante", label: expediente.bandoDemandante },
    { key: "demandado", label: expediente.bandoDemandado },
    { key: "masVotados", label: "Mas votados" },
  ];

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard/diario/expediente"
        className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light transition-colors hover:text-gz-ink"
      >
        &larr; Volver a Expedientes
      </Link>

      {/* ── Case Card ────────────────────────────────────────── */}
      <div className="mb-6 rounded-[4px] border border-gz-rule bg-white p-6 shadow-sm">
        {/* Top bar */}
        <div className="mb-3 flex items-center justify-between">
          <p className="font-ibm-mono text-[9px] font-semibold uppercase tracking-[2.5px] text-gz-gold">
            Expediente N&deg; {expediente.numero}
          </p>
          <div className="flex items-center gap-2">
            {isOpen ? (
              <>
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-green-700">
                  Abierto
                </span>
                <CountdownInline fechaCierre={expediente.fechaCierre} />
              </>
            ) : (
              <span className="rounded-full bg-gz-burgundy/10 px-2 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-burgundy">
                Cerrado
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h1 className="mb-4 font-cormorant text-[30px] font-bold leading-tight text-gz-ink">
          {expediente.titulo}
        </h1>

        {/* Rama + materias */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-sm bg-gz-navy/10 px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-navy">
            {RAMA_LABELS[expediente.rama] ?? expediente.rama}
          </span>
          {expediente.materias &&
            expediente.materias.split(",").map((m) => (
              <span
                key={m.trim()}
                className="rounded-sm bg-gz-gold/[0.08] px-2 py-0.5 font-ibm-mono text-[9px] font-medium text-gz-gold"
              >
                {m.trim()}
              </span>
            ))}
        </div>

        {/* Hechos */}
        <div className="mb-4 rounded-[3px] border border-gz-rule bg-gz-cream-dark/20 p-4">
          <p className="mb-1 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Hechos
          </p>
          <p
            className="font-cormorant text-[16px] italic leading-[1.8] text-gz-ink"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {expediente.hechos}
          </p>
        </div>

        {/* Pregunta */}
        <div className="rounded-[3px] border-l-[3px] border-l-gz-gold bg-gz-gold/[0.04] px-4 py-3">
          <p className="mb-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1.5px] text-gz-gold">
            Pregunta
          </p>
          <p className="font-cormorant text-[17px] font-semibold leading-snug text-gz-ink">
            {expediente.pregunta}
          </p>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <div className="mb-6 rounded-[4px] border border-gz-rule bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center gap-4 font-ibm-mono text-[11px] text-gz-ink-light">
          <span>{expediente.stats.totalArgumentos} argumentos</span>
          <span className="text-gz-rule-dark">|</span>
          <span>{expediente.stats.participantes} participantes</span>
          <span className="text-gz-rule-dark">|</span>
          <span>{expediente.stats.totalVotos} votos</span>
        </div>
        <BandoSplitBar
          demandanteCount={expediente.stats.demandanteCount}
          demandadoCount={expediente.stats.demandadoCount}
          bandoDemandante={expediente.bandoDemandante}
          bandoDemandado={expediente.bandoDemandado}
        />
      </div>

      {/* ── Closed: Podium + Editorial ───────────────────────── */}
      {!isOpen && (
        <>
          <Podium argumentos={expediente.argumentos} />

          {expediente.cierreEditorial && (
            <div className="mb-6 rounded-[4px] border border-gz-rule bg-white p-5">
              <p className="mb-2 font-ibm-mono text-[10px] font-semibold uppercase tracking-[2px] text-gz-burgundy">
                Cierre Editorial
              </p>
              <p
                className="font-cormorant text-[16px] leading-[1.8] text-gz-ink"
                style={{ whiteSpace: "pre-wrap" }}
              >
                {expediente.cierreEditorial}
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Argumentar Section ───────────────────────────────── */}
      {isOpen && (canArgDemandante || canArgDemandado) && !selectedBando && (
        <div className="mb-6 rounded-[4px] border border-dashed border-gz-gold bg-gz-gold/[0.03] p-5">
          <p className="mb-3 font-ibm-mono text-[10px] font-semibold uppercase tracking-[1.5px] text-gz-ink-mid">
            Toma una posicion
          </p>
          <div className="flex flex-wrap gap-3">
            {canArgDemandante && (
              <button
                onClick={() =>
                  setSelectedBando(expediente.bandoDemandante)
                }
                className="flex-1 rounded-[3px] border-2 border-gz-gold bg-gz-gold/[0.06] px-4 py-3 font-archivo text-[13px] font-semibold text-gz-gold transition-colors hover:bg-gz-gold hover:text-white"
              >
                Defiendo a {expediente.bandoDemandante}
              </button>
            )}
            {canArgDemandado && (
              <button
                onClick={() =>
                  setSelectedBando(expediente.bandoDemandado)
                }
                className="flex-1 rounded-[3px] border-2 border-gz-burgundy bg-gz-burgundy/[0.06] px-4 py-3 font-archivo text-[13px] font-semibold text-gz-burgundy transition-colors hover:bg-gz-burgundy hover:text-white"
              >
                Defiendo a {expediente.bandoDemandado}
              </button>
            )}
          </div>
          {userBandos.length > 0 && (
            <p className="mt-2 font-archivo text-[11px] text-gz-ink-light">
              Ya argumentaste por: {userBandos.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Argument editor (when bando selected) */}
      {isOpen && selectedBando && (
        <div className="mb-6">
          <ArgumentEditor
            expedienteId={expediente.id}
            bando={selectedBando}
            bandoLabel={selectedBando}
            onSuccess={() => {
              setSelectedBando(null);
              handleRefresh();
            }}
            onCancel={() => setSelectedBando(null)}
          />
        </div>
      )}

      {/* ── Filter Tabs ──────────────────────────────────────── */}
      <div className="mb-4 flex gap-1 rounded-[4px] border border-gz-rule p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterTab(tab.key)}
            className={`flex-1 rounded-[3px] px-3 py-1.5 font-ibm-mono text-[11px] font-semibold transition-colors ${
              filterTab === tab.key
                ? "border border-gz-gold bg-gz-gold/[0.08] text-gz-ink"
                : "text-gz-ink-mid hover:text-gz-ink"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Arguments List ───────────────────────────────────── */}
      <div className="space-y-4">
        {filteredArgs.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-cormorant text-[17px] italic text-gz-ink-light">
              {filterTab === "todos"
                ? "Aun no hay argumentos. Se el primero en argumentar."
                : "No hay argumentos en esta categoria."}
            </p>
          </div>
        ) : (
          filteredArgs.map((arg) => (
            <ArgumentCard
              key={arg.id}
              arg={arg}
              expediente={expediente}
              currentUserId={currentUserId}
              currentUserGrado={currentUserGrado}
              onRefresh={handleRefresh}
            />
          ))
        )}
      </div>
    </div>
  );
}
