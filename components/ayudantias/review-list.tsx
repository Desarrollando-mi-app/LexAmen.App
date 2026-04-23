"use client";

import { useMemo, useState } from "react";
import { initials } from "@/lib/ayudantias-v4-helpers";

export interface Review {
  id: string;
  author: {
    firstName: string;
    lastName: string;
    avatarColor?: string; // CSS color, opcional
  };
  rating: number; // 0-5, obligatorio
  comment: string | null; // opcional
  createdAt: string; // ISO
}

interface ReviewListProps {
  reviews: Review[];
  tutorFirstName: string;
}

export function ReviewList({ reviews, tutorFirstName }: ReviewListProps) {
  const [filter, setFilter] = useState<"todas" | "conComentario" | 5 | 4>("todas");
  const [sort, setSort] = useState<"recientes" | "antiguas" | "mejores" | "peores">("recientes");

  const avg = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  const distribution = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]; // index 0 = 1 star, 4 = 5 stars
    reviews.forEach((r) => {
      const idx = Math.max(0, Math.min(4, r.rating - 1));
      dist[idx]++;
    });
    return dist;
  }, [reviews]);

  const conComentario = reviews.filter((r) => r.comment && r.comment.trim()).length;

  const filtered = useMemo(() => {
    let list = reviews;
    if (filter === "conComentario") list = list.filter((r) => r.comment && r.comment.trim());
    if (filter === 5) list = list.filter((r) => r.rating === 5);
    if (filter === 4) list = list.filter((r) => r.rating === 4);

    switch (sort) {
      case "antiguas":
        return [...list].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      case "mejores":
        return [...list].sort((a, b) => b.rating - a.rating);
      case "peores":
        return [...list].sort((a, b) => a.rating - b.rating);
      default:
        return [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
    }
  }, [reviews, filter, sort]);

  return (
    <div>
      {/* Invite banner */}
      <div className="flex justify-between items-center gap-5 p-4 mb-5 border-l-[3px] border-gz-gold bg-gradient-to-r from-gz-gold/8 to-transparent">
        <span className="font-cormorant italic text-[17px] text-gz-ink-mid">
          ¿Tuviste sesión con <strong className="not-italic font-semibold text-gz-ink">{tutorFirstName}</strong>?
          Tu reseña ayuda a otros estudiantes a decidir.
        </span>
        <button className="px-4 py-2.5 border border-gz-ink text-gz-ink font-ibm-mono text-[10.5px] tracking-[1.5px] uppercase whitespace-nowrap hover:bg-gz-ink hover:text-gz-cream transition">
          Escribir reseña
        </button>
      </div>

      {/* Aggregate */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 p-5 border border-gz-rule bg-white">
        <div className="flex flex-col items-center justify-center md:border-r md:border-gz-rule/60 md:pr-4">
          <div className="font-cormorant font-bold text-[56px] leading-none text-gz-ink">
            {avg.toFixed(1)}
          </div>
          <Stars value={Math.round(avg)} className="mt-2 text-[16px]" />
          <div className="mt-1.5 font-ibm-mono text-[10px] tracking-[1.5px] uppercase text-gz-ink-light">
            {reviews.length} valoraciones
          </div>
        </div>
        <div className="flex flex-col gap-1.5 justify-center">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = distribution[star - 1];
            const pct = reviews.length ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="grid grid-cols-[44px_1fr_32px] items-center gap-3 text-[12px]">
                <span className="font-ibm-mono text-gz-gold font-medium">{star} ★</span>
                <div className="h-[6px] bg-gz-rule/40 overflow-hidden rounded-[1px]">
                  <div className="h-full bg-gz-gold" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-right font-ibm-mono text-gz-ink-light">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center gap-3 mt-5 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <FilterBtn active={filter === "todas"} onClick={() => setFilter("todas")}>
            Todas <span className="opacity-70 ml-1">{reviews.length}</span>
          </FilterBtn>
          <FilterBtn active={filter === "conComentario"} onClick={() => setFilter("conComentario")}>
            Con comentario <span className="opacity-70 ml-1">{conComentario}</span>
          </FilterBtn>
          <FilterBtn active={filter === 5} onClick={() => setFilter(5)}>
            5 ★ <span className="opacity-70 ml-1">{distribution[4]}</span>
          </FilterBtn>
          {distribution[3] > 0 && (
            <FilterBtn active={filter === 4} onClick={() => setFilter(4)}>
              4 ★ <span className="opacity-70 ml-1">{distribution[3]}</span>
            </FilterBtn>
          )}
        </div>
        <div className="flex items-center gap-2 font-cormorant italic text-[14px] text-gz-ink-mid">
          <span>Ordenar por</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="font-ibm-mono text-[11px] tracking-[1px] uppercase text-gz-ink border-b border-gz-rule bg-transparent py-0.5 px-1 outline-none"
          >
            <option value="recientes">Más recientes</option>
            <option value="antiguas">Más antiguas</option>
            <option value="mejores">Mejor valoradas</option>
            <option value="peores">Peor valoradas</option>
          </select>
        </div>
      </div>

      {/* Grid of reviews with shared borders */}
      {filtered.length === 0 ? (
        <div className="py-14 text-center border border-gz-rule bg-white">
          <p className="font-cormorant italic text-[18px] text-gz-ink-mid">
            Sin reseñas que coincidan con el filtro.
          </p>
        </div>
      ) : (
        <div
          className="grid gap-0 border-t border-l border-gz-rule bg-white"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))" }}
        >
          {filtered.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  const hasComment = !!review.comment && review.comment.trim().length > 0;
  const relDate = (() => {
    const d = new Date(review.createdAt);
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    const days = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    const rel = days === 0 ? "hoy" : days === 1 ? "ayer" : days < 14 ? `hace ${days} días` : days < 60 ? `hace ${Math.floor(days / 7)} semanas` : `hace ${Math.floor(days / 30)} meses`;
    return `${d.getDate()} ${months[d.getMonth()]} · ${rel}`;
  })();

  return (
    <article
      className={`relative p-5 border-r border-b border-gz-rule transition
                  hover:border-gz-gold hover:shadow-[inset_2px_0_0_var(--gz-gold)] hover:z-[2]
                  ${!hasComment ? "bg-gz-cream hover:bg-[#efe7d5]" : ""}`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-gz-cream font-ibm-mono text-[11px] tracking-[1px] font-semibold shrink-0"
          style={{ background: review.author.avatarColor || "var(--gz-ink)" }}
        >
          {initials(review.author.firstName, review.author.lastName)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-cormorant font-semibold text-[17px] text-gz-ink leading-tight">
            {review.author.firstName} {review.author.lastName}
          </div>
          <div className="mt-0.5 font-ibm-mono text-[9.5px] tracking-[1.3px] uppercase text-gz-ink-light">
            {relDate}
          </div>
        </div>
        <Stars value={review.rating} />
      </div>
      {hasComment ? (
        <p
          className="text-[14px] leading-[1.65] text-gz-ink-mid m-0
                     [&::first-letter]:font-cormorant [&::first-letter]:font-bold
                     [&::first-letter]:text-gz-gold [&::first-letter]:text-[40px]
                     [&::first-letter]:leading-[0.8] [&::first-letter]:float-left
                     [&::first-letter]:mr-2 [&::first-letter]:mt-1"
        >
          {review.comment}
        </p>
      ) : (
        <p className="font-cormorant italic text-[13px] text-gz-ink-light m-0">— Sin comentario —</p>
      )}
    </article>
  );
}

function Stars({ value, className }: { value: number; className?: string }) {
  // Value 0-5, render 5 stars with filled up to value.
  const clamped = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`whitespace-nowrap ${className ?? ""}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= clamped ? "text-gz-gold" : "text-gz-rule"}>
          ★
        </span>
      ))}
    </span>
  );
}

function FilterBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 font-ibm-mono text-[10.5px] tracking-[1.4px] uppercase rounded-[3px] border transition
                 ${active
                   ? "bg-gz-ink text-gz-cream border-gz-ink"
                   : "border-gz-rule text-gz-ink-mid hover:border-gz-ink hover:text-gz-ink"}`}
    >
      {children}
    </button>
  );
}
