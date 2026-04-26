"use client";

import { useEffect, useState } from "react";
import type { LinkPreview } from "../types/obiter";

const URL_RE = /https?:\/\/[^\s<>"'\)]+/i;

// Cache en memoria por sesión: obiterId → previews. Evita refetch cuando
// el card aparece varias veces (feed scroll, navegación, etc.).
const cache = new Map<string, LinkPreview[]>();

/**
 * Hook que asegura tener linkPreviews para un obiter.
 *
 * Si el obiter ya viene con previews del server (no vacío), los usa.
 * Si está vacío PERO el contenido tiene URLs, dispara fetch
 * server-side a /api/og-preview que también persiste en DB. La próxima
 * vez vendrá ya poblado del server.
 */
export function useLinkPreviews(
  obiterId: string,
  content: string,
  initial: LinkPreview[] | undefined,
): LinkPreview[] {
  const initialList = initial ?? [];
  const cached = cache.get(obiterId);
  const [previews, setPreviews] = useState<LinkPreview[]>(
    initialList.length > 0 ? initialList : cached ?? [],
  );

  useEffect(() => {
    // Si ya tenemos previews, no hacemos nada.
    if (previews.length > 0) return;
    // Si no hay URL en el content, no hay nada que fetch.
    if (!URL_RE.test(content)) return;
    // Si ya está cacheado en memoria, usarlo.
    const c = cache.get(obiterId);
    if (c && c.length > 0) {
      setPreviews(c);
      return;
    }
    // Fetch lazy.
    let cancelled = false;
    fetch("/api/og-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ obiterId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        const arr: LinkPreview[] = Array.isArray(data.previews) ? data.previews : [];
        cache.set(obiterId, arr);
        if (arr.length > 0) setPreviews(arr);
      })
      .catch(() => {
        // Silent
      });
    return () => {
      cancelled = true;
    };
  }, [obiterId, content, previews.length]);

  return previews;
}
