"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DiarioPost {
  id: string;
  titulo: string;
  formato: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

const FORMATO_LABELS: Record<string, string> = {
  OBITER_DICTUM: "Obiter",
  ANALISIS_FALLOS: "Fallo",
};

const FORMATO_COLORS: Record<string, string> = {
  OBITER_DICTUM: "bg-gold/15 text-gold",
  ANALISIS_FALLOS: "bg-navy/10 text-navy",
};

export function DiarioCard() {
  const [posts, setPosts] = useState<DiarioPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/diario?limit=3")
      .then((r) => r.ok ? r.json() : { posts: [] })
      .then((data) => setPosts(data.posts ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-[4px] border border-gz-rule bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-navy font-cormorant flex items-center gap-1.5">
          <span>📰</span> El Diario
        </h3>
        <Link href="/dashboard/diario"
          className="text-[10px] font-semibold text-gold hover:text-gold/80 transition-colors">
          Ver todo &rarr;
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-[4px] bg-navy/5" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-xs text-navy/40 text-center py-4">
          Aún no hay publicaciones
        </p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/dashboard/diario/${post.id}`}
              className="block rounded-[4px] px-3 py-2 transition-colors hover:bg-navy/5"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-navy truncate">
                    {post.titulo}
                  </p>
                  <p className="mt-0.5 text-[10px] text-navy/40">
                    {post.user.firstName} {post.user.lastName?.charAt(0)}.
                    {" · "}
                    {new Date(post.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                  FORMATO_COLORS[post.formato] ?? "bg-navy/10 text-navy"
                }`}>
                  {FORMATO_LABELS[post.formato] ?? post.formato}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-3 border-t border-gz-rule pt-3">
        <Link href="/dashboard/diario"
          className="block text-center rounded-[3px] bg-navy/5 px-3 py-2 text-xs font-semibold text-navy hover:bg-navy/10 transition-colors">
          Publicar en El Diario
        </Link>
      </div>
    </div>
  );
}
