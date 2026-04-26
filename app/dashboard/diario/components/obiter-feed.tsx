"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  ObiterData,
  FeedItem,
  AnalisisPreview,
  EnsayoPreview,
} from "../types/obiter";
import { ObiterCard } from "./obiter-card";
import { ObiterEditor } from "./obiter-editor";
import { AnalisisPreviewCard } from "./analisis-preview-card";
import { EnsayoPreviewCard } from "./ensayo-preview-card";

// ─── Types ──────────────────────────────────────────────────

type ObiterFeedProps = {
  userId: string | null;
  userFirstName?: string;
  userAvatarUrl?: string | null;
  prefillText?: string;
};

type Tab = "recientes" | "destacados" | "colegas" | "guardados";

const TABS: { key: Tab; label: string; requiresAuth: boolean }[] = [
  { key: "recientes", label: "Recientes", requiresAuth: false },
  { key: "destacados", label: "Destacados", requiresAuth: false },
  { key: "colegas", label: "Colegas", requiresAuth: true },
  { key: "guardados", label: "Guardados", requiresAuth: true },
];

// ─── Component ──────────────────────────────────────────────

export function ObiterFeed({
  userId,
  userFirstName,
  userAvatarUrl,
  prefillText,
}: ObiterFeedProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("recientes");
  const [obiters, setObiters] = useState<ObiterData[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [citingObiter, setCitingObiter] = useState<ObiterData | null>(null);

  // ─── Fetch feed ───────────────────────────────────────────

  const fetchFeed = useCallback(
    async (tab: Tab, cursor?: string | null) => {
      const params = new URLSearchParams();
      params.set("feed", tab);
      params.set("limit", "20");
      if (cursor) params.set("cursor", cursor);

      try {
        const res = await fetch(`/api/obiter?${params.toString()}`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            return { obiters: [], feedItems: [], nextCursor: null, hasMore: false };
          }
          throw new Error("Fetch failed");
        }

        const data = await res.json();
        return {
          obiters: data.obiters ?? [],
          feedItems: (data.feedItems ?? []) as FeedItem[],
          nextCursor: data.nextCursor ?? null,
          hasMore: data.hasMore ?? false,
        };
      } catch {
        return { obiters: [], feedItems: [], nextCursor: null, hasMore: false };
      }
    },
    []
  );

  // Initial load + tab change
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setObiters([]);
      setFeedItems([]);
      setNextCursor(null);

      const data = await fetchFeed(activeTab);
      if (!cancelled) {
        setObiters(data.obiters);
        setFeedItems(data.feedItems);
        setNextCursor(data.nextCursor);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, fetchFeed]);

  // ─── Load more ────────────────────────────────────────────

  async function handleLoadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);

    const data = await fetchFeed(activeTab, nextCursor);
    setObiters((prev) => [...prev, ...data.obiters]);
    // On load more, only append obiter items (previews are only on first page)
    setFeedItems((prev) => [
      ...prev,
      ...data.obiters.map((o: ObiterData) => ({ type: "obiter" as const, data: o })),
    ]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  }

  // ─── Optimistic toggles ───────────────────────────────────

  function updateObiter(id: string, updater: (o: ObiterData) => ObiterData) {
    setObiters((prev) => prev.map((o) => (o.id === id ? updater(o) : o)));
    // Also update in feedItems
    setFeedItems((prev) =>
      prev.map((item) =>
        item.type === "obiter" && item.data.id === id
          ? { ...item, data: updater(item.data as ObiterData) }
          : item
      )
    );
  }

  async function handleApoyar(id: string) {
    if (!userId) return;

    const obiter = obiters.find((o) => o.id === id);
    if (!obiter) return;

    const wasApoyado = obiter.hasApoyado;

    // Optimistic
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
        // Revert
        updateObiter(id, (o) => ({
          ...o,
          hasApoyado: wasApoyado,
          apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
        }));
      }
    } catch {
      // Revert
      updateObiter(id, (o) => ({
        ...o,
        hasApoyado: wasApoyado,
        apoyosCount: o.apoyosCount + (wasApoyado ? 1 : -1),
      }));
    }
  }

  async function handleGuardar(id: string) {
    if (!userId) return;

    const obiter = obiters.find((o) => o.id === id);
    if (!obiter) return;

    const wasGuardado = obiter.hasGuardado;

    // Optimistic
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
    if (!userId) return;

    const obiter = obiters.find((o) => o.id === id);
    if (!obiter) return;

    const wasComunicado = obiter.hasComunicado;

    // Optimistic
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

  function handleCitar(obiter: ObiterData) {
    setCitingObiter(obiter);
    // Scroll to top where editor is
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleThreadClick(threadId: string) {
    // Navigate to the first obiter in the thread
    // The threadId IS the id of the first obiter (threadOrder=1)
    router.push(`/dashboard/diario/obiter/${threadId}`);
  }

  async function handleManage(id: string, action: string, content?: string) {
    if (!userId) return;
    try {
      if (action === "delete") {
        await fetch(`/api/obiter/${id}`, { method: "DELETE" });
        setFeedItems((prev) => prev.filter((item) => !(item.type === "obiter" && (item.data as ObiterData).id === id)));
      } else {
        await fetch(`/api/obiter/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(content ? { content } : {}) }),
        });
        if (action === "archive") {
          setFeedItems((prev) => prev.filter((item) => !(item.type === "obiter" && (item.data as ObiterData).id === id)));
        } else if (action === "edit" && content) {
          setFeedItems((prev) => prev.map((item) => {
            if (item.type === "obiter" && (item.data as ObiterData).id === id) {
              return { ...item, data: { ...item.data as ObiterData, content } };
            }
            return item;
          }));
        } else {
          // Refresh for pin/unpin/comments toggle
          router.refresh();
        }
      }
    } catch { /* silent */ }
  }

  // ─── Preview interaction handlers ──────────────────────────

  async function handlePreviewApoyar(id: string, type: "analisis" | "ensayo") {
    if (!userId) return;
    const endpoint = type === "analisis" ? "analisis" : "ensayos";
    try {
      const res = await fetch(`/api/diario/${endpoint}/${id}/apoyar`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        setFeedItems((prev) =>
          prev.map((item) => {
            if (
              (item.type === "analisis_preview" || item.type === "ensayo_preview") &&
              item.data.id === id
            ) {
              return {
                ...item,
                data: {
                  ...item.data,
                  hasApoyado: result.apoyado,
                  apoyosCount:
                    item.data.apoyosCount + (result.apoyado ? 1 : -1),
                },
              } as FeedItem;
            }
            return item;
          })
        );
      }
    } catch { /* silent */ }
  }

  async function handlePreviewGuardar(id: string, type: "analisis" | "ensayo") {
    if (!userId) return;
    const endpoint = type === "analisis" ? "analisis" : "ensayos";
    try {
      const res = await fetch(`/api/diario/${endpoint}/${id}/guardar`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        setFeedItems((prev) =>
          prev.map((item) => {
            if (
              (item.type === "analisis_preview" || item.type === "ensayo_preview") &&
              item.data.id === id
            ) {
              return {
                ...item,
                data: {
                  ...item.data,
                  hasGuardado: result.guardado,
                  guardadosCount:
                    item.data.guardadosCount + (result.guardado ? 1 : -1),
                },
              } as FeedItem;
            }
            return item;
          })
        );
      }
    } catch { /* silent */ }
  }

  async function handlePreviewComuniquese(id: string, type: "analisis" | "ensayo") {
    if (!userId) return;
    const endpoint = type === "analisis" ? "analisis" : "ensayos";
    try {
      const res = await fetch(`/api/diario/${endpoint}/${id}/comuniquese`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const result = await res.json();
        setFeedItems((prev) =>
          prev.map((item) => {
            if (
              (item.type === "analisis_preview" || item.type === "ensayo_preview") &&
              item.data.id === id
            ) {
              return {
                ...item,
                data: {
                  ...item.data,
                  hasComunicado: result.comunicado,
                  comuniqueseCount:
                    item.data.comuniqueseCount + (result.comunicado ? 1 : -1),
                },
              } as FeedItem;
            }
            return item;
          })
        );
      }
    } catch { /* silent */ }
  }

  function handlePublished(newObiter: ObiterData) {
    // Prepend to feed (only in recientes tab)
    if (activeTab === "recientes") {
      setObiters((prev) => [newObiter, ...prev]);
      setFeedItems((prev) => [{ type: "obiter", data: newObiter }, ...prev]);
    }
    setCitingObiter(null);
  }

  // ─── Render ───────────────────────────────────────────────

  // Container estilo X — feed con bordes sutiles, sin shadow, divisores
  // entre cards. El ancho lo manda la columna padre (no más lg:w-3/5).
  return (
    <div className="rounded-[4px] border border-gz-rule bg-white overflow-hidden shadow-[0_1px_0_rgba(15,15,15,0.04)]">
      {/* ── Sticky tab bar — estilo X "Para ti / Siguiendo" ─── */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/85 border-b border-gz-rule">
        <div className="flex overflow-x-auto gz-scrollbar-hide">
          {TABS.filter((t) => !t.requiresAuth || userId).map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`group relative flex-1 min-w-[110px] flex items-center justify-center px-4 py-3.5 transition-colors cursor-pointer ${
                  active ? "" : "hover:bg-gz-cream-dark/40"
                }`}
              >
                <span
                  className={`font-archivo text-[14px] font-semibold transition-colors ${
                    active ? "text-gz-ink" : "text-gz-ink-light group-hover:text-gz-ink"
                  }`}
                >
                  {tab.label}
                </span>
                {/* Indicador inferior estilo X — píldora corta debajo */}
                <span
                  className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[3px] rounded-t-full bg-gz-gold transition-all duration-200 ${
                    active ? "w-[60%] opacity-100" : "w-0 opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Editor (solo si autenticado) — full width ── */}
      {userId && userFirstName && (
        <div className="border-b border-gz-rule">
          <ObiterEditor
            userId={userId}
            userFirstName={userFirstName}
            userAvatarUrl={userAvatarUrl ?? null}
            onPublished={handlePublished}
            citingObiter={citingObiter}
            onCancelCite={() => setCitingObiter(null)}
            initialText={prefillText}
          />
        </div>
      )}

      {/* ── Loading skeleton ─── */}
      {loading && (
        <div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-b border-gz-rule px-4 sm:px-5 py-4 flex gap-3">
              <div className="h-11 w-11 shrink-0 rounded-full bg-gz-cream-dark animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-40 rounded bg-gz-cream-dark animate-pulse" />
                <div className="h-3 w-full rounded bg-gz-cream-dark animate-pulse" />
                <div className="h-3 w-4/5 rounded bg-gz-cream-dark animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Unified feed (obiters + previews) ── */}
      {!loading && feedItems.length > 0 && (
        <div>
          {feedItems.map((item) => {
            if (item.type === "obiter") {
              const obiter = item.data as ObiterData;
              return (
                <ObiterCard
                  key={`od-${obiter.id}`}
                  obiter={obiter}
                  currentUserId={userId}
                  onApoyar={handleApoyar}
                  onGuardar={handleGuardar}
                  onComuniquese={handleComuniquese}
                  onCitar={handleCitar}
                  onThreadClick={handleThreadClick}
                  onManage={handleManage}
                  showComuniquesePor={!!obiter.comuniquesePor}
                />
              );
            }
            if (item.type === "analisis_preview") {
              const analisis = item.data as AnalisisPreview;
              return (
                <div key={`an-${analisis.id}`} className="border-b border-gz-rule px-4 sm:px-5 py-3.5">
                  <AnalisisPreviewCard
                    analisis={analisis}
                    currentUserId={userId}
                    onApoyar={(id) => handlePreviewApoyar(id, "analisis")}
                    onGuardar={(id) => handlePreviewGuardar(id, "analisis")}
                    onComuniquese={(id) => handlePreviewComuniquese(id, "analisis")}
                  />
                </div>
              );
            }
            if (item.type === "ensayo_preview") {
              const ensayo = item.data as EnsayoPreview;
              return (
                <div key={`en-${ensayo.id}`} className="border-b border-gz-rule px-4 sm:px-5 py-3.5">
                  <EnsayoPreviewCard
                    ensayo={ensayo}
                    currentUserId={userId}
                    onApoyar={(id) => handlePreviewApoyar(id, "ensayo")}
                    onGuardar={(id) => handlePreviewGuardar(id, "ensayo")}
                    onComuniquese={(id) => handlePreviewComuniquese(id, "ensayo")}
                  />
                </div>
              );
            }
            return null;
          })}

          {/* Load more — botón inline al final del feed */}
          {nextCursor && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full px-4 py-4 text-center font-archivo text-[13px] font-semibold text-gz-gold transition-colors hover:bg-gz-gold/[0.06] cursor-pointer disabled:cursor-wait"
            >
              {loadingMore ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Cargando…
                </span>
              ) : (
                "Cargar más Obiters →"
              )}
            </button>
          )}
        </div>
      )}

      {/* ── Empty state — centrado editorial ── */}
      {!loading && feedItems.length === 0 && (
        <div className="py-20 text-center px-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gz-cream-dark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-gz-gold">
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mb-5 font-cormorant text-[18px] italic text-gz-ink-mid max-w-[360px] mx-auto leading-snug">
            {activeTab === "guardados"
              ? "Aún no has guardado ningún Obiter."
              : activeTab === "colegas"
                ? "Tus colegas aún no han publicado nada."
                : "Aún no hay Obiters. Sé el primero en compartir una reflexión jurídica."}
          </p>
          {userId && activeTab === "recientes" && (
            <button
              onClick={() => {
                const el = document.querySelector("textarea");
                if (el) {
                  el.focus();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="rounded-full bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy cursor-pointer"
            >
              Publicar primer Obiter
            </button>
          )}
          {!userId && (
            <a
              href="/register"
              className="inline-block rounded-full bg-gz-navy px-6 py-2.5 font-archivo text-[13px] font-semibold text-white transition-colors hover:bg-gz-gold hover:text-gz-navy"
            >
              Regístrate para publicar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
