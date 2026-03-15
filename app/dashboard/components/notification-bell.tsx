"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { NotificationDrawer } from "./notification-drawer";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=1");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  // Refrescar conteo cuando se cierra el drawer
  const handleClose = useCallback(() => {
    setOpen(false);
    fetchCount();
  }, [fetchCount]);

  return (
    <>
      <button
        ref={bellRef}
        onClick={() => setOpen(!open)}
        className="relative rounded-[3px] p-1.5 text-navy/60 hover:bg-navy/5 hover:text-navy transition-colors"
        aria-label="Notificaciones"
      >
        {/* Bell SVG */}
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
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationDrawer onClose={handleClose} />}
    </>
  );
}
