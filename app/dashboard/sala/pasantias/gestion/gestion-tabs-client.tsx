"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { PasantiasClient } from "./gestion-client";
import {
  areaLabel,
  estadoPostulacionLabel,
  ESTADO_POSTULACION,
  formatDateShort,
  type PostulacionEstado,
} from "@/lib/pasantias-helpers";

// ─── Types ───────────────────────────────────────────────────────────────

interface FeedUser {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
}

interface FeedPasantia {
  id: string;
  userId: string;
  empresa: string;
  areaPractica: string;
  titulo: string;
  descripcion: string;
  ciudad: string;
  formato: string;
  duracion: string | null;
  remuneracion: string;
  montoRemu: string | null;
  requisitos: string | null;
  metodoPostulacion: string;
  contactoPostulacion: string | null;
  createdAt: string;
  user: FeedUser;
}

interface EnviadaItem {
  id: string;
  estado: string;
  createdAt: string;
  fechaInicio: string | null;
  fechaCompletada: string | null;
  mensaje: string | null;
  cvUrl: string | null;
  cartaUrl: string | null;
  pasantia: {
    id: string;
    titulo: string;
    empresa: string;
    areaPractica: string;
    ciudad: string;
    fechaLimite: string | null;
    estudio: { id: string; slug: string; nombre: string } | null;
  };
  review: { id: string; rating: number } | null;
}

interface RecibidaItem {
  id: string;
  estado: string;
  createdAt: string;
  fechaInicio: string | null;
  fechaCompletada: string | null;
  mensaje: string | null;
  cvUrl: string | null;
  cartaUrl: string | null;
  pasantia: {
    id: string;
    titulo: string;
    areaPractica: string;
    ciudad: string;
  };
  postulante: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad: string | null;
    etapaActual: string | null;
    universityYear: number | null;
    email: string;
  };
  review: { id: string; rating: number; estudioResponse: string | null } | null;
}

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  isAnonymous: boolean;
  authorDisplay: string | null;
  createdAt: string;
  reported: boolean;
  postulacion: {
    id: string;
    pasantia: { id: string; titulo: string; areaPractica: string };
    postulante: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      universidad: string | null;
    };
  };
}

interface Props {
  userId: string;
  feed: FeedPasantia[];
  enviadas: EnviadaItem[];
  recibidas: RecibidaItem[];
  reviews: ReviewItem[];
}

// ─── Component ───────────────────────────────────────────────────────────

type TabKey = "feed" | "enviadas" | "recibidas" | "reviews";

const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: "feed", label: "Feed", subtitle: "Todas las pasantías" },
  { key: "enviadas", label: "Enviadas", subtitle: "Mis postulaciones" },
  { key: "recibidas", label: "Recibidas", subtitle: "A mis publicaciones" },
  { key: "reviews", label: "Reseñas", subtitle: "Pendientes de respuesta" },
];

export function GestionTabsClient({
  userId,
  feed,
  enviadas,
  recibidas,
  reviews,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = mapQueryToTab(searchParams.get("tab"));
  const [tab, setTab] = useState<TabKey>(initialTab);

  // Toasts de éxito tras flujos externos al panel.
  useEffect(() => {
    const sp = new URLSearchParams(searchParams.toString());
    let dirty = false;
    if (sp.get("postulacionEnviada") === "1") {
      toast.success("Postulación enviada", {
        description: "El publicador recibió una notificación.",
      });
      sp.delete("postulacionEnviada");
      dirty = true;
    }
    if (sp.get("resenaPublicada") === "1") {
      toast.success("Reseña publicada", {
        description: "Tu reseña queda visible. El estudio podrá responder una vez.",
      });
      sp.delete("resenaPublicada");
      dirty = true;
    }
    if (dirty) {
      const qs = sp.toString();
      router.replace(`/dashboard/sala/pasantias/gestion${qs ? `?${qs}` : ""}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mantener URL sincronizada con la tab actual
  function changeTab(next: TabKey) {
    setTab(next);
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("tab", next);
    router.replace(`/dashboard/sala/pasantias/gestion?${sp.toString()}`, {
      scroll: false,
    });
  }

  const counts = useMemo(
    () => ({
      feed: feed.length,
      enviadas: enviadas.length,
      recibidas: recibidas.length,
      reviews: reviews.length,
    }),
    [feed, enviadas, recibidas, reviews],
  );

  return (
    <div className="min-h-screen bg-gz-cream text-gz-ink font-archivo">
      {/* Folio editorial */}
      <header className="max-w-[1200px] mx-auto pt-4 px-7 pb-3.5 border-b border-gz-ink flex justify-between items-baseline font-ibm-mono text-[10px] tracking-[2px] uppercase text-gz-ink-mid">
        <span>Studio Iuris · Profesión · Gestión de pasantías</span>
        <Link
          href="/dashboard/sala/pasantias"
          className="hover:text-gz-gold transition-colors"
        >
          Volver al feed público →
        </Link>
      </header>

      {/* Tabs */}
      <nav
        className="max-w-[1200px] mx-auto px-7 mt-5 flex gap-0 border-b border-gz-rule overflow-x-auto"
        role="tablist"
        aria-label="Vistas de gestión"
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => changeTab(t.key)}
              className={`px-5 py-3.5 -mb-px border-b-2 transition-colors text-left cursor-pointer
                ${
                  active
                    ? "border-gz-gold text-gz-ink"
                    : "border-transparent text-gz-ink-mid hover:text-gz-ink"
                }`}
            >
              <div className="font-cormorant font-semibold text-[19px] leading-none tracking-[-0.3px] flex items-center gap-2">
                {t.label}
                {count > 0 && (
                  <span
                    className={`font-ibm-mono text-[10px] tracking-[1px] uppercase font-medium px-1.5 py-0.5 rounded-[3px]
                      ${
                        active
                          ? "bg-gz-gold/20 text-gz-ink"
                          : "bg-gz-ink-light/15 text-gz-ink-mid"
                      }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <div className="font-ibm-mono text-[9.5px] tracking-[1.4px] uppercase text-gz-ink-light mt-1">
                {t.subtitle}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Contenido */}
      <div className="max-w-[1200px] mx-auto px-7 py-7">
        {tab === "feed" && (
          <div role="tabpanel">
            <PasantiasClient userId={userId} initialPasantias={feed} />
          </div>
        )}
        {tab === "enviadas" && (
          <div role="tabpanel">
            <EnviadasPanel items={enviadas} />
          </div>
        )}
        {tab === "recibidas" && (
          <div role="tabpanel">
            <RecibidasPanel items={recibidas} onChange={() => router.refresh()} />
          </div>
        )}
        {tab === "reviews" && (
          <div role="tabpanel">
            <ReviewsPanel items={reviews} onChange={() => router.refresh()} />
          </div>
        )}
      </div>
    </div>
  );
}

function mapQueryToTab(raw: string | null): TabKey {
  if (raw === "enviadas" || raw === "postulaciones") return "enviadas";
  if (raw === "recibidas") return "recibidas";
  if (raw === "reviews" || raw === "resenas") return "reviews";
  return "feed";
}

// ─── Tab: Enviadas ───────────────────────────────────────────────────────

function EnviadasPanel({ items }: { items: EnviadaItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Aún no postulaste a ninguna oferta"
        body="Cuando envíes una postulación aparecerá acá con su estado y un acceso directo a la oferta original."
        ctaHref="/dashboard/sala/pasantias"
        ctaLabel="Explorar pasantías"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="bg-white border border-gz-rule p-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start"
        >
          <div className="min-w-0">
            <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light">
              {areaLabel(item.pasantia.areaPractica)} · {item.pasantia.ciudad}
            </div>
            <Link
              href={`/dashboard/sala/pasantias/oferta/${item.pasantia.id}`}
              className="block mt-0.5 font-cormorant font-semibold text-[22px] leading-tight text-gz-ink hover:text-gz-gold transition-colors"
            >
              {item.pasantia.titulo}
            </Link>
            <div className="mt-1 font-cormorant italic text-[14px] text-gz-ink-mid">
              {item.pasantia.estudio ? (
                <>
                  Publicada por{" "}
                  <Link
                    href={`/dashboard/sala/pasantias/estudio/${item.pasantia.estudio.slug}`}
                    className="not-italic font-semibold text-gz-ink hover:text-gz-gold"
                  >
                    {item.pasantia.estudio.nombre}
                  </Link>
                </>
              ) : (
                <>
                  Publicada por{" "}
                  <span className="not-italic font-semibold text-gz-ink">
                    {item.pasantia.empresa}
                  </span>
                </>
              )}
              <span className="text-gz-ink-light"> · enviada el {formatDateShort(item.createdAt)}</span>
            </div>

            {item.mensaje && (
              <p className="mt-3 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.5] line-clamp-3 m-0">
                «{item.mensaje}»
              </p>
            )}

            {(item.cvUrl || item.cartaUrl) && (
              <div className="mt-3 flex flex-wrap gap-2 font-ibm-mono text-[10px] tracking-[1.3px] uppercase">
                {item.cvUrl && (
                  <a
                    href={item.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition rounded-[3px]"
                  >
                    Mi CV
                  </a>
                )}
                {item.cartaUrl && (
                  <a
                    href={item.cartaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition rounded-[3px]"
                  >
                    Mi carta
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <EstadoBadge estado={item.estado} />
            {item.fechaCompletada && (
              <span className="font-ibm-mono text-[10px] tracking-[1.3px] uppercase text-gz-ink-light">
                Completada {formatDateShort(item.fechaCompletada)}
              </span>
            )}
            {item.estado === "COMPLETADA" && !item.review && (
              <Link
                href={`/dashboard/sala/pasantias/postulaciones/${item.id}/resenar`}
                className="px-3 py-2 bg-gz-gold text-gz-ink font-ibm-mono text-[10px] tracking-[1.5px] uppercase hover:bg-gz-ink hover:text-gz-cream transition"
              >
                Dejar reseña →
              </Link>
            )}
            {item.review && (
              <span className="font-ibm-mono text-[10px] tracking-[1.3px] uppercase text-gz-gold">
                Tu reseña: {"★".repeat(item.review.rating)}
                {"☆".repeat(5 - item.review.rating)}
              </span>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ─── Tab: Recibidas ──────────────────────────────────────────────────────

function RecibidasPanel({
  items,
  onChange,
}: {
  items: RecibidaItem[];
  onChange: () => void;
}) {
  // Agrupar por pasantía para que se lea como un dashboard.
  // useMemo va antes de cualquier early-return para no romper la regla
  // de hooks.
  const byPasantia = useMemo(() => {
    const map = new Map<string, { titulo: string; area: string; ciudad: string; items: RecibidaItem[] }>();
    for (const it of items) {
      const k = it.pasantia.id;
      if (!map.has(k)) {
        map.set(k, {
          titulo: it.pasantia.titulo,
          area: it.pasantia.areaPractica,
          ciudad: it.pasantia.ciudad,
          items: [],
        });
      }
      map.get(k)!.items.push(it);
    }
    return Array.from(map.entries());
  }, [items]);

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin postulaciones recibidas"
        body="Cuando alguien postule a una de tus publicaciones internas, aparecerá acá agrupada por pasantía. Recibirás también una notificación."
        ctaHref="/dashboard/sala/pasantias?tipo=ofrezco"
        ctaLabel="Ver mis publicaciones"
      />
    );
  }

  return (
    <div className="flex flex-col gap-7">
      {byPasantia.map(([pasantiaId, group]) => (
        <section key={pasantiaId}>
          <header className="flex items-baseline justify-between border-b border-gz-rule pb-2 mb-3">
            <div>
              <Link
                href={`/dashboard/sala/pasantias/oferta/${pasantiaId}`}
                className="font-cormorant font-semibold text-[22px] leading-tight text-gz-ink hover:text-gz-gold"
              >
                {group.titulo}
              </Link>
              <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light mt-0.5">
                {areaLabel(group.area)} · {group.ciudad}
              </div>
            </div>
            <span className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-mid">
              {group.items.length} postulación{group.items.length === 1 ? "" : "es"}
            </span>
          </header>

          <div className="flex flex-col gap-3">
            {group.items.map((p) => (
              <RecibidaCard key={p.id} item={p} onChange={onChange} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RecibidaCard({
  item,
  onChange,
}: {
  item: RecibidaItem;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function setEstado(next: PostulacionEstado) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/sala/pasantias/postulaciones/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: next }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "No pudimos actualizar el estado");
      } else {
        toast.success(`Postulación → ${estadoPostulacionLabel(next).toLowerCase()}`);
        onChange();
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setBusy(false);
    }
  }

  const next = nextEstadosFor(item.estado as PostulacionEstado);
  const fullName = `${item.postulante.firstName} ${item.postulante.lastName}`.trim();

  return (
    <article className="bg-white border border-gz-rule p-5 grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-4 items-start">
      {/* Avatar / iniciales */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-gz-cream font-cormorant font-semibold text-[20px] shrink-0"
        style={{ background: "var(--gz-ink)" }}
        aria-hidden
      >
        {(item.postulante.firstName?.[0] ?? "?").toUpperCase()}
        {(item.postulante.lastName?.[0] ?? "").toUpperCase()}
      </div>

      <div className="min-w-0">
        <div className="font-cormorant font-semibold text-[19px] leading-tight text-gz-ink">
          {fullName}
        </div>
        <div className="font-archivo text-[12.5px] text-gz-ink-mid mt-0.5">
          {[
            item.postulante.etapaActual && capitalize(item.postulante.etapaActual),
            item.postulante.universidad,
            item.postulante.universityYear ? `${item.postulante.universityYear}° año` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </div>
        {item.mensaje && (
          <p className="mt-2 font-cormorant italic text-[14px] text-gz-ink-mid leading-[1.5] line-clamp-4 m-0">
            «{item.mensaje}»
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2 font-ibm-mono text-[10px] tracking-[1.3px] uppercase">
          {item.cvUrl && (
            <a
              href={item.cvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition rounded-[3px]"
            >
              CV
            </a>
          )}
          {item.cartaUrl && (
            <a
              href={item.cartaUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition rounded-[3px]"
            >
              Carta
            </a>
          )}
          <a
            href={`mailto:${item.postulante.email}`}
            className="px-2.5 py-1 border border-gz-rule text-gz-ink-mid hover:border-gz-gold hover:text-gz-gold transition rounded-[3px]"
          >
            Email
          </a>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 min-w-[160px]">
        <EstadoBadge estado={item.estado} />
        <span className="font-ibm-mono text-[10px] tracking-[1.3px] uppercase text-gz-ink-light">
          {formatDateShort(item.createdAt)}
        </span>

        {next.length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end">
            {next.map((n) => (
              <button
                key={n}
                disabled={busy}
                onClick={() => setEstado(n)}
                className="px-2.5 py-1.5 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
              >
                → {estadoPostulacionLabel(n)}
              </button>
            ))}
          </div>
        )}

        {item.review && !item.review.estudioResponse && (
          <Link
            href="/dashboard/sala/pasantias/gestion?tab=reviews"
            className="font-ibm-mono text-[10px] tracking-[1.3px] uppercase text-gz-gold hover:text-gz-ink transition"
          >
            Responder reseña →
          </Link>
        )}
        {item.review?.estudioResponse && (
          <span className="font-ibm-mono text-[10px] tracking-[1.3px] uppercase text-gz-ink-light">
            Reseña respondida
          </span>
        )}
      </div>
    </article>
  );
}

function nextEstadosFor(estado: PostulacionEstado): PostulacionEstado[] {
  switch (estado) {
    case "ENVIADA":
      return ["REVISADA", "ACEPTADA", "RECHAZADA"];
    case "REVISADA":
      return ["ACEPTADA", "RECHAZADA"];
    case "ACEPTADA":
      return ["COMPLETADA"];
    default:
      return [];
  }
}

// ─── Tab: Reviews pendientes ─────────────────────────────────────────────

function ReviewsPanel({
  items,
  onChange,
}: {
  items: ReviewItem[];
  onChange: () => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin reseñas pendientes"
        body="Cuando un ex-pasante deje una reseña, aparecerá acá para que puedas responder públicamente. Sólo se permite UNA respuesta por reseña, así que tómate tu tiempo."
        ctaHref="/dashboard/sala/pasantias"
        ctaLabel="Volver al feed"
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((r) => (
        <ReviewCard key={r.id} item={r} onChange={onChange} />
      ))}
    </div>
  );
}

function ReviewCard({
  item,
  onChange,
}: {
  item: ReviewItem;
  onChange: () => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const MAX = 1500;

  async function enviar() {
    if (!text.trim()) {
      toast.error("Escribe una respuesta antes de enviar");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/sala/pasantias/postulaciones/${item.postulacion.id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estudioResponse: text.trim() }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "No pudimos publicar la respuesta");
      } else {
        toast.success("Respuesta publicada");
        setOpen(false);
        setText("");
        onChange();
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setBusy(false);
    }
  }

  const display = item.isAnonymous
    ? item.authorDisplay ?? "Reseña anónima"
    : `${item.postulacion.postulante.firstName} ${item.postulacion.postulante.lastName}`.trim();

  return (
    <article className="bg-white border border-gz-rule border-l-[3px] border-l-gz-gold p-5">
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <Link
            href={`/dashboard/sala/pasantias/oferta/${item.postulacion.pasantia.id}`}
            className="font-cormorant font-semibold text-[20px] leading-tight text-gz-ink hover:text-gz-gold"
          >
            {item.postulacion.pasantia.titulo}
          </Link>
          <div className="font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light mt-0.5">
            {areaLabel(item.postulacion.pasantia.areaPractica)} · {formatDateShort(item.createdAt)}
          </div>
        </div>
        <span className="font-cormorant font-semibold text-[20px] text-gz-gold tracking-[1px]">
          {"★".repeat(item.rating)}
          <span className="text-gz-ink-light/40">{"☆".repeat(5 - item.rating)}</span>
        </span>
      </header>

      <p className="mt-3 font-cormorant italic text-[15.5px] text-gz-ink leading-[1.55] m-0">
        «{item.comment ?? "(Sin comentario adicional)"}»
      </p>
      <p className="mt-2 font-archivo text-[12px] text-gz-ink-light">
        — {display}
        {item.reported && (
          <span className="ml-2 font-ibm-mono text-[9.5px] tracking-[1.2px] uppercase text-gz-burgundy">
            · reportada
          </span>
        )}
      </p>

      {!open ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 bg-gz-ink text-gz-cream font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
          >
            Responder públicamente →
          </button>
          <span className="font-archivo text-[11.5px] text-gz-ink-light italic self-center">
            Sólo se permite una respuesta y no podrás editarla.
          </span>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          <textarea
            rows={4}
            placeholder="Tu respuesta queda visible junto a la reseña. Sé profesional, breve y constructivo."
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            disabled={busy}
            maxLength={MAX}
            className="px-3.5 py-3 border border-gz-rule rounded-[3px] bg-gz-cream/40 font-cormorant text-[15px] leading-[1.5] text-gz-ink placeholder:text-gz-ink-light/70 placeholder:italic focus:outline-none focus:border-gz-gold focus:bg-white transition-colors resize-y"
          />
          <div className="flex justify-between items-center">
            <span
              className={`font-ibm-mono text-[10px] tracking-[1.2px] uppercase ${
                MAX - text.length < 100 ? "text-gz-burgundy" : "text-gz-ink-light"
              }`}
            >
              {MAX - text.length} restantes
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setText("");
                }}
                disabled={busy}
                className="px-3.5 py-2 border border-gz-rule text-gz-ink-mid font-ibm-mono text-[10px] tracking-[1.5px] uppercase hover:border-gz-ink hover:text-gz-ink transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={busy || !text.trim()}
                className="px-4 py-2 bg-gz-ink text-gz-cream font-ibm-mono text-[10.5px] tracking-[1.6px] uppercase hover:bg-gz-gold hover:text-gz-ink transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy ? "Publicando…" : "Publicar respuesta →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_POSTULACION[estado as PostulacionEstado];
  const tone = cfg?.tone ?? "neutral";
  const color =
    tone === "success"
      ? "bg-gz-sage/15 text-gz-sage border-gz-sage/40"
      : tone === "danger"
      ? "bg-gz-burgundy/10 text-gz-burgundy border-gz-burgundy/40"
      : tone === "info"
      ? "bg-gz-ink/8 text-gz-ink border-gz-ink/30"
      : tone === "accent"
      ? "bg-gz-gold/15 text-gz-ink border-gz-gold/50"
      : "bg-gz-ink-light/15 text-gz-ink-mid border-gz-rule";
  return (
    <span
      className={`font-ibm-mono text-[10px] tracking-[1.5px] uppercase font-medium px-2.5 py-1 rounded-[3px] border ${color}`}
    >
      {estadoPostulacionLabel(estado)}
    </span>
  );
}

function EmptyState({
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="bg-white border border-gz-rule p-12 text-center max-w-[640px] mx-auto">
      <h2 className="font-cormorant font-semibold text-[28px] tracking-[-0.3px] text-gz-ink m-0">
        {title}
      </h2>
      <div className="mt-2 mx-auto w-12 h-px bg-gz-gold" />
      <p className="mt-4 font-cormorant italic text-[15.5px] text-gz-ink-mid leading-[1.55] m-0">
        {body}
      </p>
      <Link
        href={ctaHref}
        className="mt-6 inline-block px-5 py-3 bg-gz-ink text-gz-cream font-ibm-mono text-[11px] tracking-[1.8px] uppercase hover:bg-gz-gold hover:text-gz-ink transition"
      >
        {ctaLabel} →
      </Link>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
