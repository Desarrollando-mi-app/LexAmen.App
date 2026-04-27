"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────

type SearchHashtag = { tag: string; uses: number };
type SearchUser = {
  id: string;
  firstName: string;
  lastName: string;
  handle: string | null;
  avatarUrl: string | null;
  universidad: string | null;
};
type SearchObiter = {
  id: string;
  content: string;
  createdAt: string;
  apoyosCount: number;
  replyCount: number;
  user: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
};

type SearchResults = {
  hashtags: SearchHashtag[];
  users: SearchUser[];
  obiters: SearchObiter[];
};

// ─── Component ──────────────────────────────────────────────

export function DiarioSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fetchSeq = useRef(0);

  // Atajo: Cmd+K / Ctrl+K abre el buscador
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus al abrir
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      // Reset al cerrar
      setQ("");
      setResults(null);
    }
  }, [open]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const seq = ++fetchSeq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/diario/search?q=${encodeURIComponent(q.trim())}`,
          { credentials: "include" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (seq !== fetchSeq.current) return;
        setResults(data);
      } catch {
        /* silent */
      } finally {
        if (seq === fetchSeq.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  const close = useCallback(() => setOpen(false), []);

  const totalResults =
    (results?.hashtags.length ?? 0) +
    (results?.users.length ?? 0) +
    (results?.obiters.length ?? 0);

  function handleObiterClick(id: string) {
    close();
    router.push(`/dashboard/diario/obiter/${id}`);
  }
  function handleHashtagClick(tag: string) {
    close();
    router.push(`/dashboard/diario?hashtag=${encodeURIComponent(tag)}`);
  }
  function handleUserClick(id: string) {
    close();
    router.push(`/dashboard/perfil/${id}`);
  }

  return (
    <>
      {/* Trigger — botón compacto editorial */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-gz-rule bg-white/80 px-3 py-1.5 font-archivo text-[12px] text-gz-ink-light hover:border-gz-gold hover:text-gz-ink transition-colors cursor-pointer group"
        aria-label="Buscar en el diario"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-gz-ink-light group-hover:text-gz-gold transition-colors">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.4" />
          <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="hidden sm:inline">Buscar</span>
        <kbd className="hidden md:inline-flex items-center font-ibm-mono text-[9px] uppercase tracking-[1px] text-gz-ink-light/70 border border-gz-rule rounded px-1 ml-1">
          ⌘K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-gz-ink/40 backdrop-blur-sm cal-anim-backdrop"
            onClick={close}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="Buscar"
            className="fixed left-1/2 top-[12vh] z-50 w-[92vw] max-w-[640px] -translate-x-1/2 rounded-[6px] border border-gz-rule bg-white shadow-2xl cal-anim-modal overflow-hidden"
          >
            {/* Rail editorial superior */}
            <div className="h-[3px] bg-gradient-to-r from-gz-gold via-gz-burgundy to-gz-navy" />

            {/* Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-gz-rule">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-gz-ink-light shrink-0">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21l-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar en el Diario… (#etiqueta, @usuario, o texto)"
                className="flex-1 bg-transparent border-none outline-none font-cormorant text-[18px] text-gz-ink placeholder:text-gz-ink-light/50 focus:ring-0"
              />
              <button
                onClick={close}
                className="text-gz-ink-light hover:text-gz-ink transition-colors cursor-pointer shrink-0"
                aria-label="Cerrar"
              >
                <kbd className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light border border-gz-rule rounded px-1.5 py-0.5">
                  ESC
                </kbd>
              </button>
            </div>

            {/* Body */}
            <div className="max-h-[60vh] overflow-y-auto">
              {q.trim().length < 2 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-cormorant italic text-[15px] text-gz-ink-mid mb-1">
                    Escribe al menos 2 caracteres para empezar.
                  </p>
                  <p className="font-ibm-mono text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
                    Usa <span className="text-gz-burgundy">#etiqueta</span> ·{" "}
                    <span className="text-gz-navy">@usuario</span> ·{" "}
                    <span className="text-gz-gold">tema: ...</span>
                  </p>
                </div>
              ) : loading && !results ? (
                <div className="px-5 py-10 text-center">
                  <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gz-gold border-t-transparent" />
                </div>
              ) : totalResults === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-cormorant italic text-[15px] text-gz-ink-light">
                    Sin resultados para &ldquo;{q}&rdquo;.
                  </p>
                </div>
              ) : (
                <div>
                  {/* Hashtags */}
                  {results && results.hashtags.length > 0 && (
                    <SearchSection title="Etiquetas" railColor="bg-gz-burgundy">
                      {results.hashtags.map((h) => (
                        <button
                          key={h.tag}
                          onClick={() => handleHashtagClick(h.tag)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors hover:bg-gz-cream-dark/50 cursor-pointer"
                        >
                          <span className="font-archivo text-[14px] font-bold text-gz-burgundy group-hover:text-gz-gold">
                            #{h.tag}
                          </span>
                          <span className="font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light shrink-0">
                            {h.uses} {h.uses === 1 ? "obiter" : "obiters"}
                          </span>
                        </button>
                      ))}
                    </SearchSection>
                  )}

                  {/* Users */}
                  {results && results.users.length > 0 && (
                    <SearchSection title="Personas" railColor="bg-gz-navy">
                      {results.users.map((u) => {
                        const initials = `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
                        return (
                          <button
                            key={u.id}
                            onClick={() => handleUserClick(u.id)}
                            className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-gz-cream-dark/50 cursor-pointer"
                          >
                            {u.avatarUrl ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={u.avatarUrl}
                                alt=""
                                className="h-9 w-9 rounded-full object-cover ring-1 ring-gz-rule/50 shrink-0"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gz-navy font-archivo text-[11px] font-bold text-gz-gold-bright ring-1 ring-gz-rule/50 shrink-0">
                                {initials}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-archivo text-[13px] font-semibold text-gz-ink truncate leading-tight">
                                {u.firstName} {u.lastName}
                              </p>
                              <p className="font-ibm-mono text-[10px] text-gz-ink-light truncate">
                                @{u.handle ?? u.firstName.toLowerCase()}
                                {u.universidad && (
                                  <>
                                    <span className="mx-1 text-gz-ink-light/40">·</span>
                                    {u.universidad}
                                  </>
                                )}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </SearchSection>
                  )}

                  {/* Obiters */}
                  {results && results.obiters.length > 0 && (
                    <SearchSection title="Obiter Dictum" railColor="bg-gz-gold">
                      {results.obiters.map((o) => (
                        <button
                          key={o.id}
                          onClick={() => handleObiterClick(o.id)}
                          className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-gz-cream-dark/50 cursor-pointer"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 font-cormorant text-[14px] leading-snug text-gz-ink mb-1">
                              {o.content}
                            </p>
                            <p className="font-ibm-mono text-[10px] uppercase tracking-[0.5px] text-gz-ink-light">
                              — {o.user.firstName} {o.user.lastName[0]}.
                              {o.apoyosCount > 0 && (
                                <>
                                  <span className="mx-1 text-gz-ink-light/40">·</span>
                                  ♥ {o.apoyosCount}
                                </>
                              )}
                              {o.replyCount > 0 && (
                                <>
                                  <span className="mx-1 text-gz-ink-light/40">·</span>
                                  ↩ {o.replyCount}
                                </>
                              )}
                            </p>
                          </div>
                        </button>
                      ))}
                    </SearchSection>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ─── SearchSection — bloque con header editorial ──────────────

function SearchSection({
  title,
  railColor,
  children,
}: {
  title: string;
  railColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-gz-rule last:border-b-0">
      <div className="flex items-center gap-2 px-5 py-2 bg-gz-cream-dark/30">
        <span className={`h-1.5 w-1.5 rounded-full ${railColor}`} />
        <span className="font-ibm-mono text-[9px] uppercase tracking-[2px] font-semibold text-gz-ink-mid">
          {title}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
