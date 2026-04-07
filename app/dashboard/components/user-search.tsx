"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  avatarUrl: string | null;
  tier: string | null;
}

const TIER_EMOJI: Record<string, string> = {
  CARTON: "📄",
  HIERRO: "🔩",
  BRONCE: "🥉",
  COBRE: "🟫",
  PLATA: "🥈",
  ORO: "🥇",
  DIAMANTE: "💎",
  PLATINO: "🪙",
  JURISCONSULTO: "⚖️",
};

export function UserSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opening
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.users ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function handleSelect(userId: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(`/dashboard/perfil/${userId}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Buscar usuarios"
        title="Buscar usuarios"
        className="flex h-8 w-8 items-center justify-center rounded-full text-gz-ink-mid transition-colors hover:text-gz-gold"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.1 6.1a7.5 7.5 0 0 0 10.55 10.55z"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-[4px] border border-gz-rule bg-white shadow-lg">
          <div className="border-b border-gz-rule p-3">
            <div className="flex items-center gap-2 rounded-[3px] border border-gz-rule bg-gz-cream/40 px-3 py-2">
              <svg
                className="h-4 w-4 text-gz-ink-light"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1 0 6.1 6.1a7.5 7.5 0 0 0 10.55 10.55z"
                />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar usuarios..."
                className="w-full bg-transparent font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light focus:outline-none"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="p-4 text-center font-archivo text-[12px] text-gz-ink-light">
                Buscando...
              </p>
            )}

            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="p-4 text-center font-archivo text-[12px] text-gz-ink-light">
                No se encontraron usuarios
              </p>
            )}

            {!loading && query.length < 2 && (
              <p className="p-4 text-center font-archivo text-[12px] text-gz-ink-light">
                Escribe al menos 2 letras para buscar
              </p>
            )}

            {!loading &&
              results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelect(u.id)}
                  className="flex w-full items-center gap-3 border-b border-gz-rule/30 px-4 py-2.5 text-left transition-colors hover:bg-gz-cream/60 last:border-b-0"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gz-gold/10 font-archivo text-[12px] font-bold text-gz-gold">
                    {u.avatarUrl ? (
                      <Image
                        src={u.avatarUrl}
                        alt={`${u.firstName}`}
                        width={36}
                        height={36}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span>
                        {u.firstName[0]}
                        {u.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-archivo text-[13px] font-medium text-gz-ink">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="truncate font-ibm-mono text-[10px] text-gz-ink-light">
                      {u.universidad ?? "—"}
                      {u.tier ? ` · ${TIER_EMOJI[u.tier] ?? ""} ${u.tier}` : ""}
                    </p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
