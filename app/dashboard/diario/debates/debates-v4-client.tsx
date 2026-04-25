"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MastheadAcademia } from "@/components/academia/masthead-academia";
import {
  FilterShellAcademia,
  SegmentedControlAcademia,
  FilterChipAcademia,
  SortSelectAcademia,
} from "@/components/academia/filter-row-academia";
import { EmptyStateAcademia } from "@/components/academia/empty-state-academia";
import {
  ramaGradient,
  ramaLabel,
  debateEstadoLabel,
  debateEstadoBadgeClass,
  userInitials,
  toRoman,
} from "@/lib/academia-helpers";

// ─── Types ──────────────────────────────────────────────────

interface DebateUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  grado: number | null;
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

// Ramas usadas en debates — lista compacta (no replicar AREAS_PRACTICA
// completa porque la API guarda con esos slugs reducidos).
const RAMAS_DEBATE = [
  { value: "civil", label: "Civil", glyph: "§" },
  { value: "penal", label: "Penal", glyph: "¶" },
  { value: "constitucional", label: "Constitucional", glyph: "‡" },
  { value: "administrativo", label: "Administrativo", glyph: "Ⓞ" },
  { value: "laboral", label: "Laboral", glyph: "⚖" },
  { value: "tributario", label: "Tributario", glyph: "℥" },
  { value: "comercial", label: "Comercial", glyph: "ℛ" },
  { value: "procesal", label: "Procesal", glyph: "†" },
  { value: "internacional", label: "Internacional", glyph: "∴" },
  { value: "ambiental", label: "Ambiental", glyph: "※" },
  { value: "familia", label: "Familia", glyph: "⸸" },
] as const;

type EstadoFilter = "TODOS" | "ACTIVOS" | "VOTACION" | "BUSCANDO" | "CERRADOS";
type Sort = "recientes" | "votos";

// ─── Component ──────────────────────────────────────────────

export function DebatesV4Client({
  debates,
  userId,
}: {
  debates: Debate[];
  userId: string;
}) {
  const [query, setQuery] = useState("");
  const [rama, setRama] = useState<string | null>(null);
  const [estado, setEstado] = useState<EstadoFilter>("TODOS");
  const [sort, setSort] = useState<Sort>("recientes");

  const counts = useMemo(() => {
    const activos = debates.filter(
      (d) => d.estado === "argumentos" || d.estado === "replicas",
    ).length;
    const votacion = debates.filter((d) => d.estado === "votacion").length;
    const buscando = debates.filter((d) => d.estado === "buscando_oponente").length;
    const cerrados = debates.filter((d) => d.estado === "cerrado").length;
    return { todos: debates.length, activos, votacion, buscando, cerrados };
  }, [debates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = debates.filter((d) => {
      if (rama && d.rama !== rama) return false;
      if (estado === "ACTIVOS" && d.estado !== "argumentos" && d.estado !== "replicas") return false;
      if (estado === "VOTACION" && d.estado !== "votacion") return false;
      if (estado === "BUSCANDO" && d.estado !== "buscando_oponente") return false;
      if (estado === "CERRADOS" && d.estado !== "cerrado") return false;
      if (q) {
        const hay = `${d.titulo} ${d.descripcion} ${d.autor1.firstName} ${d.autor1.lastName} ${d.autor2?.firstName ?? ""} ${d.autor2?.lastName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sort === "votos") {
      list = [...list].sort(
        (a, b) => b.votosAutor1 + b.votosAutor2 - (a.votosAutor1 + a.votosAutor2),
      );
    } else {
      list = [...list].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [debates, query, rama, estado, sort]);

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      <div className="pt-3.5 px-7 font-archivo text-[12px] text-gz-ink-light flex justify-between items-center gap-4">
        <Link href="/dashboard/diario" className="hover:text-gz-gold transition-colors">
          ← Publicaciones
        </Link>
        <Link
          href="/dashboard/diario/debates/proponer"
          className="px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer"
        >
          Proponer debate →
        </Link>
      </div>

      <MastheadAcademia
        seccion="Debates Jurídicos"
        glyph="‡"
        subtitulo="Argumentos, réplicas y votación de la comunidad"
        resultCount={filtered.length}
        resultLabel="debates"
      />

      <FilterShellAcademia
        searchLabel="Buscar por título, autor o materia"
        searchPlaceholder="ej. responsabilidad extracontractual, Ana Pinto…"
        query={query}
        onQueryChange={setQuery}
        segmentedSlot={
          <SegmentedControlAcademia<EstadoFilter>
            value={estado}
            onChange={setEstado}
            options={[
              { value: "TODOS", label: "Todos", count: counts.todos },
              { value: "ACTIVOS", label: "En curso", count: counts.activos },
              { value: "VOTACION", label: "Votación", count: counts.votacion },
              { value: "BUSCANDO", label: "Sin oponente", count: counts.buscando },
              { value: "CERRADOS", label: "Cerrados", count: counts.cerrados },
            ]}
          />
        }
        chipsSlot={
          <>
            <FilterChipAcademia
              active={rama === null}
              onClick={() => setRama(null)}
              label="Toda rama"
            />
            {RAMAS_DEBATE.map((r) => (
              <FilterChipAcademia
                key={r.value}
                active={rama === r.value}
                onClick={() => setRama(r.value)}
                label={r.label}
                glyph={r.glyph}
              />
            ))}
          </>
        }
        sortSlot={
          <SortSelectAcademia<Sort>
            value={sort}
            onChange={setSort}
            options={[
              { value: "recientes", label: "Más recientes" },
              { value: "votos", label: "Más votados" },
            ]}
          />
        }
      />

      <main className="max-w-[1400px] mx-auto px-7 py-8">
        {filtered.length === 0 ? (
          debates.length === 0 ? (
            <EmptyStateAcademia
              glyph="‡"
              titulo="Aún no hay debates jurídicos."
              descripcion="Sé la primera persona en proponer un debate. Otra persona podrá tomar la posición contraria y la comunidad votará."
              ctaLabel="Proponer un debate"
              ctaHref="/dashboard/diario/debates/proponer"
            />
          ) : (
            <EmptyStateAcademia
              glyph="‡"
              titulo="No hay debates que coincidan con esos filtros."
              descripcion="Prueba quitando algún filtro o cambiando la rama."
            />
          )
        ) : (
          <div
            className="grid gap-0 border-t border-l border-gz-rule bg-white"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
          >
            {filtered.map((d) => (
              <DebateTile key={d.id} debate={d} userId={userId} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Tile editorial ────────────────────────────────────────

function DebateTile({ debate, userId }: { debate: Debate; userId: string }) {
  const [accepting, setAccepting] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [miPosicion, setMiPosicion] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const gradient = ramaGradient(debate.rama);
  const isOwner = debate.autor1Id === userId;
  const canAccept = debate.estado === "buscando_oponente" && !isOwner;
  const showVotes = debate.estado === "votacion" || debate.estado === "cerrado";
  const totalVotos = debate.votosAutor1 + debate.votosAutor2;
  const p1 = totalVotos > 0 ? Math.round((debate.votosAutor1 / totalVotos) * 100) : 50;

  const deadline = activeDeadline(debate);
  const countdown = humanCountdown(deadline);

  async function handleAccept() {
    if (!miPosicion || miPosicion.length < 10) {
      setError("La posición debe tener al menos 10 caracteres");
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
    <article
      className="relative flex flex-col bg-white
                 border-r border-b border-gz-rule
                 transition-[background,box-shadow] duration-200
                 hover:bg-gz-cream hover:shadow-[inset_0_0_0_2px_var(--gz-gold)] hover:z-[2]
                 group"
    >
      {/* Cover */}
      <div
        className="relative aspect-[16/9] flex items-center justify-center overflow-hidden border-b border-gz-rule"
        style={{ background: gradient }}
      >
        <span
          className={`absolute top-3 left-3 z-[2] px-2.5 py-1 rounded-[3px] font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium ${debateEstadoBadgeClass(debate.estado)}`}
        >
          {debateEstadoLabel(debate.estado)}
        </span>

        {countdown && (
          <span className="absolute top-3 right-3 z-[2] px-2.5 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink font-ibm-mono text-[9px] tracking-[1.5px] uppercase font-medium">
            {countdown}
          </span>
        )}

        {/* VS layout */}
        <div className="relative z-[1] flex items-center gap-5">
          <DebateAvatar user={debate.autor1} side="left" />
          <span
            className="font-cormorant font-bold italic text-[44px] leading-none text-gz-cream/95"
            style={{ textShadow: "0 2px 12px rgba(28,24,20,0.3)" }}
          >
            vs
          </span>
          {debate.autor2 ? (
            <DebateAvatar user={debate.autor2} side="right" />
          ) : (
            <div className="w-[64px] h-[64px] rounded-full border-[2px] border-dashed border-gz-cream/55 flex items-center justify-center text-gz-cream/65 font-cormorant text-[28px] italic">
              ?
            </div>
          )}
        </div>

        <span className="absolute bottom-2.5 left-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-cream/88">
          {ramaLabel(debate.rama)}
        </span>
        {showVotes && totalVotos > 0 && (
          <span className="absolute bottom-2.5 right-3 z-[2] font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase px-2 py-1 rounded-[3px] bg-gz-cream/90 text-gz-ink">
            {totalVotos} voto{totalVotos === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-[18px_20px_20px] flex flex-col gap-[10px] flex-1">
        <div className="flex items-center justify-between font-ibm-mono text-[10px] tracking-[1.5px] uppercase font-medium text-gz-ink-mid">
          <span>{debate.autor1.firstName} {debate.autor1.lastName}</span>
          {debate.autor2 && (
            <span>
              vs {debate.autor2.firstName} {debate.autor2.lastName}
            </span>
          )}
        </div>

        <Link href={`/dashboard/diario/debates/${debate.id}`} className="block">
          <h3 className="font-cormorant font-semibold text-[20px] leading-[1.18] text-gz-ink m-0 hover:text-gz-gold transition-colors">
            {debate.titulo}
          </h3>
        </Link>

        <div className="h-px w-10 bg-gz-gold mb-1" />

        {debate.autor1Posicion && (
          <div className="space-y-1.5">
            <p className="font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
              Posición
            </p>
            <p className="font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.4] m-0 line-clamp-2">
              &ldquo;{debate.autor1Posicion}&rdquo;
            </p>
          </div>
        )}

        {showVotes && totalVotos > 0 && (
          <div className="mt-1 space-y-1">
            <div className="flex h-[6px] w-full overflow-hidden rounded-full">
              <div className="bg-gz-ink transition-all" style={{ width: `${p1}%` }} />
              <div className="bg-gz-gold transition-all" style={{ width: `${100 - p1}%` }} />
            </div>
            <div className="flex justify-between font-ibm-mono text-[9px] text-gz-ink-light">
              <span>{p1}% ({debate.votosAutor1})</span>
              <span>({debate.votosAutor2}) {100 - p1}%</span>
            </div>
          </div>
        )}

        {/* Accept inline */}
        {canAccept && !showAcceptForm && (
          <button
            type="button"
            onClick={() => setShowAcceptForm(true)}
            className="mt-2 inline-block px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] hover:bg-gz-ink hover:text-gz-cream transition cursor-pointer self-start"
          >
            Tomar posición opuesta →
          </button>
        )}

        {canAccept && showAcceptForm && (
          <div className="mt-2 space-y-2 border border-gz-rule bg-gz-cream/60 p-3 rounded-[3px]">
            <label className="block font-ibm-mono text-[9px] tracking-[1.4px] uppercase text-gz-ink-light">
              Tu posición contraria
            </label>
            <textarea
              value={miPosicion}
              onChange={(e) => setMiPosicion(e.target.value)}
              placeholder="Declara tu posición opuesta…"
              rows={2}
              className="w-full border border-gz-rule bg-white px-2.5 py-2 font-cormorant text-[14px] text-gz-ink placeholder:text-gz-ink-light/60 focus:border-gz-gold focus:outline-none rounded-[3px]"
            />
            {error && (
              <p className="font-archivo text-[11px] text-gz-burgundy">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="px-3 py-1.5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase bg-gz-ink text-gz-cream rounded-[3px] hover:bg-gz-gold hover:text-gz-ink disabled:opacity-50 transition cursor-pointer"
              >
                {accepting ? "Aceptando…" : "Confirmar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAcceptForm(false);
                  setMiPosicion("");
                  setError("");
                }}
                className="px-3 py-1.5 font-archivo text-[11px] text-gz-ink-light hover:text-gz-ink cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gz-rule/60">
          <span className="font-cormorant italic text-[13px] text-gz-ink-mid">
            {ramaLabel(debate.rama)}
          </span>
          <Link
            href={`/dashboard/diario/debates/${debate.id}`}
            className="px-3 py-[7px] font-ibm-mono text-[10px] tracking-[1.5px] uppercase border border-gz-ink text-gz-ink rounded-[3px] group-hover:bg-gz-ink group-hover:text-gz-cream transition cursor-pointer"
          >
            Ver debate →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── Avatar editorial pequeño para el cover VS ─────────────

function DebateAvatar({
  user,
  side,
}: {
  user: DebateUser;
  side: "left" | "right";
}) {
  const initials = userInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const ringClass = side === "left" ? "border-gz-cream/85" : "border-gz-gold/90";
  return (
    <div className="relative">
      {user.avatarUrl ? (
        <div className={`relative w-[72px] h-[72px] rounded-full overflow-hidden border-[3px] ${ringClass} shadow-[0_2px_12px_rgba(28,24,20,0.22)]`}>
          <Image src={user.avatarUrl} alt={fullName} fill sizes="72px" className="object-cover" />
        </div>
      ) : (
        <div
          className={`w-[72px] h-[72px] rounded-full border-[3px] ${ringClass} flex items-center justify-center bg-gz-ink/30 font-cormorant font-bold text-[28px] text-gz-cream/95 shadow-[0_2px_12px_rgba(28,24,20,0.22)]`}
        >
          {initials}
        </div>
      )}
      {user.grado && user.grado > 1 && (
        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-[3px] bg-gz-cream text-gz-ink font-ibm-mono text-[8.5px] tracking-[1px] uppercase">
          {toRoman(user.grado) || user.grado}
        </span>
      )}
    </div>
  );
}

// ─── Helpers locales ───────────────────────────────────────

function activeDeadline(d: Debate): string | null {
  if (d.estado === "argumentos") return d.fechaLimiteArgumentos;
  if (d.estado === "replicas") return d.fechaLimiteReplicas;
  if (d.estado === "votacion") return d.fechaLimiteVotacion;
  return null;
}

function humanCountdown(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "Plazo vencido";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h`;
}
