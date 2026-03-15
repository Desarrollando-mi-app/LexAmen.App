"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface NotificationItem {
  id: string;
  notificationId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  BADGE_EARNED: "🏅",
  CAUSA_FINISHED: "⚔️",
  LEAGUE_RESULT: "🏆",
  NEW_CONTENT: "📚",
  SYSTEM_BROADCAST: "📢",
  SYSTEM_SEGMENTED: "📢",
  SYSTEM_INDIVIDUAL: "💬",
  CV_REQUEST: "📄",
  CV_REQUEST_ACCEPTED: "✅",
  COLEGA_REQUEST: "🤝",
  COLEGA_ACCEPTED: "🤝",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
  });
}

export function NotificationDrawer({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=30");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setItems((prev) =>
        prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() }))
      );
      toast.success("Notificaciones marcadas como leídas");
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const markOneRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setItems((prev) =>
        prev.map((i) =>
          i.notificationId === notificationId
            ? { ...i, readAt: i.readAt ?? new Date().toISOString() }
            : i
        )
      );
    } catch {
      toast.error("No se pudo actualizar");
    }
  };

  const unreadCount = items.filter((i) => !i.readAt).length;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-sm border-l border-gz-rule animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gz-rule px-5 py-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-navy">Notificaciones</h2>
            {unreadCount > 0 && (
              <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">
                {unreadCount} nueva{unreadCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-gold hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-[3px] p-1 text-navy/50 hover:bg-navy/5 hover:text-navy transition-colors"
              aria-label="Cerrar"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="M6 6 18 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-65px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-navy/40">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="mb-3 opacity-40"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <p className="text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <ul className="divide-y divide-gz-rule">
              {items.map((item) => (
                <li
                  key={item.id}
                  onClick={() => !item.readAt && markOneRead(item.notificationId)}
                  className={`flex gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-gz-cream-dark/50 ${
                    !item.readAt ? "bg-gold/5" : ""
                  }`}
                >
                  {/* Icon */}
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy/5 text-base">
                    {TYPE_ICONS[item.type] ?? "🔔"}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-navy leading-tight">
                        {item.title}
                      </p>
                      {!item.readAt && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-navy/70 leading-snug">
                      {item.body}
                    </p>

                    {/* CV Request inline actions */}
                    {item.type === "CV_REQUEST" &&
                      !!item.metadata?.cvRequestId &&
                      !item.metadata?.responded && (
                        <CvRequestActions
                          cvRequestId={item.metadata.cvRequestId as string}
                          onResponded={(action) => {
                            setItems((prev) =>
                              prev.map((i) =>
                                i.id === item.id
                                  ? {
                                      ...i,
                                      metadata: {
                                        ...i.metadata,
                                        responded: action,
                                      },
                                    }
                                  : i
                              )
                            );
                          }}
                        />
                      )}

                    <p className="mt-1 text-xs text-navy/40">
                      {timeAgo(item.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

// ─── CV Request Actions ─────────────────────────────────

function CvRequestActions({
  cvRequestId,
  onResponded,
}: {
  cvRequestId: string;
  onResponded: (action: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "accept" | "decline") {
    setLoading(true);
    try {
      const res = await fetch(`/api/cv-requests/${cvRequestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        onResponded(action);
        toast.success(
          action === "accept" ? "Solicitud aceptada" : "Solicitud rechazada"
        );
      } else {
        const data = await res.json();
        toast.error(data.error ?? "Error al responder");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAction("accept");
        }}
        disabled={loading}
        className="rounded-[3px] bg-gz-sage px-3 py-1 text-xs font-semibold text-white hover:bg-gz-sage/90 disabled:opacity-50"
      >
        Aceptar
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAction("decline");
        }}
        disabled={loading}
        className="rounded-[3px] border border-gz-rule px-3 py-1 text-xs font-semibold text-navy/60 hover:bg-gz-cream-dark disabled:opacity-50"
      >
        Rechazar
      </button>
    </div>
  );
}
