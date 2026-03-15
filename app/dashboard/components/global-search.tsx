"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { TIER_LABELS, TIER_EMOJIS } from "@/lib/league";

interface SearchResult {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  avatarUrl: string | null;
  xp: number;
  tier: string | null;
  colegaStatus: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) return;
      const data = await res.json();
      setResults((data.users ?? []).slice(0, 6));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleOpen() {
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Search icon button */}
      {!open && (
        <button
          onClick={handleOpen}
          className="rounded-[3px] p-1.5 text-navy/60 hover:bg-navy/5 hover:text-navy transition-colors"
          aria-label="Buscar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      )}

      {/* Expanded search bar */}
      {open && (
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Buscar estudiantes..."
              className="w-[200px] sm:w-[280px] rounded-[3px] border border-gz-rule bg-gz-cream-dark py-1.5 pl-9 pr-3 text-sm text-navy placeholder:text-navy/40 focus:border-gold/50 focus:outline-none transition-all animate-in fade-in slide-in-from-right-2 duration-200"
            />
          </div>
          <button
            onClick={() => {
              setOpen(false);
              setQuery("");
              setResults([]);
              setSearched(false);
            }}
            className="rounded-[3px] p-1 text-navy/40 hover:text-navy transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="M6 6 18 18" />
            </svg>
          </button>
        </div>
      )}

      {/* Dropdown results */}
      {open && searched && (
        <div className="absolute right-0 top-full mt-2 w-[320px] rounded-[4px] border border-gz-rule bg-white shadow-sm z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
            </div>
          ) : results.length === 0 ? (
            <div className="py-6 text-center text-sm text-navy/40">
              Sin resultados
            </div>
          ) : (
            <ul className="divide-y divide-gz-rule max-h-[360px] overflow-y-auto">
              {results.map((u) => {
                const initials = `${u.firstName[0]}${u.lastName[0]}`.toUpperCase();
                const tierLabel = u.tier ? TIER_LABELS[u.tier] : null;
                const tierEmoji = u.tier ? TIER_EMOJIS[u.tier] : null;

                return (
                  <li key={u.id}>
                    <Link
                      href={`/dashboard/perfil/${u.id}`}
                      onClick={() => {
                        setOpen(false);
                        setQuery("");
                        setResults([]);
                        setSearched(false);
                      }}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gz-cream-dark"
                    >
                      {/* Avatar */}
                      {u.avatarUrl ? (
                        <img
                          src={u.avatarUrl}
                          alt={`${u.firstName} ${u.lastName}`}
                          className="h-9 w-9 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-xs font-bold text-navy">
                          {initials}
                        </div>
                      )}

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-navy truncate">
                          {u.firstName} {u.lastName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-navy/50">
                          {u.universidad && <span className="truncate">{u.universidad}</span>}
                          {tierLabel && (
                            <span className="shrink-0">
                              {tierEmoji} {tierLabel}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      {u.colegaStatus === "accepted" && (
                        <span className="shrink-0 rounded-full bg-gz-sage/10 px-2 py-0.5 text-[10px] font-semibold text-gz-sage">
                          Colega
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
