"use client";

import { useState, useEffect, useCallback } from "react";

// ─── Tipos ────────────────────────────────────────────────────

interface PostulacionAdmin {
  id: string;
  motivacion: string;
  areasInteres: string | null;
  publicacionMuestra: string | null;
  estado: string;
  resolucionNota: string | null;
  resueltaAt: string | null;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl: string | null;
    grado: number;
    xp: number;
    etapaActual: string | null;
    universidad: string | null;
    isPeerReviewer: boolean;
    publicacionesCount: number;
  };
  resueltoPor: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

type EstadoFilter = "pendiente" | "aprobada" | "rechazada" | "todas";

// ─── Component ────────────────────────────────────────────────

export function PostulacionesAdminClient({ initial }: { initial: PostulacionAdmin[] }) {
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("pendiente");
  const [list, setList] = useState<PostulacionAdmin[]>(initial);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/peer-review/postulaciones?estado=${estadoFilter}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setList(data.postulaciones);
      }
    } finally {
      setLoading(false);
    }
  }, [estadoFilter]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-gz-cream font-archivo">
      {/* Header */}
      <div className="border-b border-gz-rule bg-white">
        <div className="max-w-[1400px] mx-auto px-7 py-6">
          <div className="font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-light mb-2">
            Admin · Peer Review
          </div>
          <h1 className="font-cormorant text-[32px] sm:text-[40px] text-gz-ink leading-tight">
            Postulaciones al cuerpo de revisores
          </h1>
          <p className="font-cormorant italic text-[15px] text-gz-ink-mid mt-2">
            Aprobar o rechazar postulaciones para entrar al pool de Peer Review.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="max-w-[1400px] mx-auto px-7 py-5">
        <div className="inline-flex border border-gz-rule rounded-[3px] overflow-hidden bg-white">
          {(["pendiente", "aprobada", "rechazada", "todas"] as EstadoFilter[]).map((e) => {
            const active = estadoFilter === e;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setEstadoFilter(e)}
                className={`px-4 py-2 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase border-r border-gz-rule last:border-r-0 transition cursor-pointer ${
                  active
                    ? "bg-gz-ink text-gz-cream"
                    : "text-gz-ink-mid hover:bg-gz-cream hover:text-gz-ink"
                }`}
              >
                {e}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      <main className="max-w-[1400px] mx-auto px-7 pb-16">
        {loading && (
          <div className="text-center py-16 font-cormorant italic text-[15px] text-gz-ink-light">
            Cargando…
          </div>
        )}

        {!loading && list.length === 0 && (
          <div className="text-center py-16 border border-dashed border-gz-rule rounded-[4px] bg-white">
            <p className="font-cormorant italic text-[18px] text-gz-ink-mid">
              No hay postulaciones {estadoFilter !== "todas" ? estadoFilter + "s" : ""}.
            </p>
          </div>
        )}

        {!loading && list.length > 0 && (
          <div className="grid gap-0 border-t border-l border-gz-rule bg-white">
            {list.map((p) => (
              <PostulacionRow
                key={p.id}
                postulacion={p}
                expanded={openId === p.id}
                onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                onResolved={refetch}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────

function PostulacionRow({
  postulacion: p,
  expanded,
  onToggle,
  onResolved,
}: {
  postulacion: PostulacionAdmin;
  expanded: boolean;
  onToggle: () => void;
  onResolved: () => void;
}) {
  const fullName = `${p.user.firstName} ${p.user.lastName}`;
  const initials = `${p.user.firstName[0] ?? ""}${p.user.lastName[0] ?? ""}`.toUpperCase();
  const fecha = new Date(p.createdAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const areas: string[] = (() => {
    if (!p.areasInteres) return [];
    try {
      const parsed = JSON.parse(p.areasInteres);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const estadoChip = (() => {
    switch (p.estado) {
      case "aprobada":
        return { label: "Aprobada", color: "text-gz-gold border-gz-gold" };
      case "rechazada":
        return { label: "Rechazada", color: "text-gz-burgundy border-gz-burgundy" };
      default:
        return { label: "Pendiente", color: "text-gz-ink border-gz-rule" };
    }
  })();

  return (
    <div className="border-r border-b border-gz-rule">
      {/* Header (clickable) */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gz-cream/40 transition cursor-pointer"
      >
        {/* Avatar */}
        <div className="shrink-0 w-11 h-11 rounded-full border border-gz-rule bg-gz-cream flex items-center justify-center font-cormorant italic text-[16px] text-gz-ink overflow-hidden">
          {p.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-cormorant text-[18px] text-gz-ink leading-tight m-0">{fullName}</p>
            <span
              className={`inline-flex items-center font-ibm-mono text-[9px] uppercase tracking-[1.5px] border px-2 py-0.5 rounded-[3px] ${estadoChip.color}`}
            >
              {estadoChip.label}
            </span>
            {p.user.isPeerReviewer && (
              <span className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-gold">
                · Reviewer activo
              </span>
            )}
          </div>
          <p className="font-archivo text-[12px] text-gz-ink-light mt-0.5 truncate">
            Grado {p.user.grado} · {p.user.publicacionesCount} publicación
            {p.user.publicacionesCount === 1 ? "" : "es"} ·{" "}
            {p.user.universidad ?? "Universidad no informada"} · {fecha}
          </p>
        </div>

        {/* Chevron */}
        <span
          className={`text-gz-ink-light text-[12px] transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gz-rule p-5 bg-gz-cream/40 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Motivación + áreas + muestra */}
          <div className="lg:col-span-2 space-y-5">
            <DetailField label="Motivación">
              <p className="font-cormorant italic text-[15px] text-gz-ink leading-[1.6] whitespace-pre-line">
                {p.motivacion}
              </p>
            </DetailField>

            {areas.length > 0 && (
              <DetailField label="Áreas de interés">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {areas.map((a) => (
                    <span
                      key={a}
                      className="font-ibm-mono text-[10px] tracking-[1.2px] uppercase border border-gz-rule text-gz-ink-mid px-2 py-1 rounded-[3px]"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </DetailField>
            )}

            {p.publicacionMuestra && (
              <DetailField label="Publicación destacada">
                <p className="font-archivo text-[13px] text-gz-ink break-all">
                  {p.publicacionMuestra}
                </p>
              </DetailField>
            )}

            <DetailField label="Email">
              <p className="font-archivo text-[13px] text-gz-ink-mid">{p.user.email}</p>
            </DetailField>

            {p.estado !== "pendiente" && p.resueltaAt && (
              <DetailField label="Resolución">
                <p className="font-archivo text-[12.5px] text-gz-ink-mid">
                  {new Date(p.resueltaAt).toLocaleString("es-CL")}
                  {p.resueltoPor && ` · por ${p.resueltoPor.firstName} ${p.resueltoPor.lastName}`}
                </p>
                {p.resolucionNota && (
                  <p className="font-cormorant italic text-[14px] text-gz-ink-mid mt-1">
                    “{p.resolucionNota}”
                  </p>
                )}
              </DetailField>
            )}
          </div>

          {/* Acciones */}
          <div>
            {p.estado === "pendiente" ? (
              <ResolverPanel postulacionId={p.id} onResolved={onResolved} />
            ) : (
              <div className="font-cormorant italic text-[14px] text-gz-ink-light">
                Esta postulación ya fue resuelta.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-light mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

// ─── Panel de resolución ────────────────────────────────────

function ResolverPanel({
  postulacionId,
  onResolved,
}: {
  postulacionId: string;
  onResolved: () => void;
}) {
  const [nota, setNota] = useState("");
  const [submitting, setSubmitting] = useState<"aprobar" | "rechazar" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (action: "aprobar" | "rechazar") => {
    if (action === "rechazar" && nota.trim().length < 10) {
      setError("Una nota de al menos 10 caracteres es obligatoria al rechazar.");
      return;
    }
    setSubmitting(action);
    setError(null);
    try {
      const res = await fetch(`/api/admin/peer-review/postulaciones/${postulacionId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, nota: nota.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Error al resolver.");
      }
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error.");
      setSubmitting(null);
    }
  };

  return (
    <div className="border border-gz-ink bg-white p-4 rounded-[3px]">
      <p className="font-ibm-mono text-[9px] uppercase tracking-[1.5px] text-gz-ink-mid mb-2">
        Resolución
      </p>
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        rows={4}
        placeholder="Nota (obligatoria al rechazar, opcional al aprobar)…"
        className="w-full font-archivo text-[12.5px] text-gz-ink bg-white border border-gz-rule rounded-[3px] p-2 outline-none focus:border-gz-ink resize-y placeholder:text-gz-ink-light/60"
        maxLength={1000}
      />
      {error && (
        <p className="font-archivo text-[11px] text-gz-burgundy mt-1.5">{error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => handle("aprobar")}
          disabled={submitting !== null}
          className="flex-1 font-ibm-mono text-[10px] uppercase tracking-[1.4px] bg-gz-gold text-gz-cream px-3 py-2 rounded-[3px] hover:bg-gz-ink transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting === "aprobar" ? "…" : "Aprobar"}
        </button>
        <button
          type="button"
          onClick={() => handle("rechazar")}
          disabled={submitting !== null}
          className="flex-1 font-ibm-mono text-[10px] uppercase tracking-[1.4px] border border-gz-burgundy text-gz-burgundy px-3 py-2 rounded-[3px] hover:bg-gz-burgundy hover:text-gz-cream transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting === "rechazar" ? "…" : "Rechazar"}
        </button>
      </div>
    </div>
  );
}
