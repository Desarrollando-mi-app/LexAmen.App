"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────

interface PendingReview {
  id: string;
  publicacionId: string;
  publicacionTipo: "analisis" | "ensayo";
  estado: string;
  createdAt: string;
  deadline: string;
  publicacion: {
    titulo: string;
    materia: string;
    tipo?: string;
  } | null;
  autor: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    universidad: string | null;
  } | null;
}

// ─── Helpers ────────────────────────────────────────────────

function daysRemaining(deadline: string): number {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function deadlineLabel(deadline: string): { text: string; color: string } {
  const days = daysRemaining(deadline);
  if (days === 0) return { text: "Vence hoy", color: "text-red-600" };
  if (days === 1) return { text: "Vence manana", color: "text-orange-500" };
  if (days <= 2) return { text: `${days} dias restantes`, color: "text-orange-500" };
  return { text: `${days} dias restantes`, color: "text-green-600" };
}

// ─── Page ──────────────────────────────────────────────────

export default function MisPendientesPage() {
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/diario/peer-review/mis-pendientes", {
          credentials: "include",
        });
        if (!res.ok) {
          throw new Error("Error al cargar reviews pendientes");
        }
        const data = await res.json();
        setReviews(data.reviews ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error desconocido"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gz-cream">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link
          href="/dashboard/diario"
          className="mb-6 inline-flex items-center gap-1 font-archivo text-[12px] text-gz-ink-light hover:text-gz-ink transition-colors"
        >
          &larr; Volver al Diario
        </Link>

        {/* Header */}
        <header className="mb-8">
          <p className="font-ibm-mono text-[9px] uppercase tracking-[2.5px] text-gz-burgundy font-medium mb-2">
            Peer Review
          </p>
          <h1 className="font-cormorant text-[28px] font-bold text-gz-ink mb-1">
            Mis Reviews Pendientes
          </h1>
          <p className="font-archivo text-[14px] text-gz-ink-mid">
            Publicaciones que te han asignado para revisar. +5 XP por cada review completado.
          </p>
          <div className="border-t-2 border-gz-rule mt-4" />
        </header>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[120px] animate-pulse rounded-[4px] bg-gz-cream-dark"
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-[4px] border border-red-300 bg-red-50 p-4">
            <p className="font-archivo text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && reviews.length === 0 && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gz-cream-dark">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-gz-ink-light"
              >
                <path d="M9 12l2 2 4-4" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <p className="font-cormorant text-[20px] text-gz-ink-mid italic">
              No tienes reviews pendientes
            </p>
            <p className="font-archivo text-[13px] text-gz-ink-light mt-2">
              Cuando alguien te solicite una revision, aparecera aqui.
            </p>
          </div>
        )}

        {/* Review list */}
        {!loading && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((review) => {
              const dl = deadlineLabel(review.deadline);
              const initials = review.autor
                ? `${review.autor.firstName[0]}${review.autor.lastName[0]}`.toUpperCase()
                : "??";

              return (
                <div
                  key={review.id}
                  className="rounded-[4px] border border-gz-rule bg-white p-5 transition-colors hover:border-gz-gold"
                >
                  {/* Type badge + deadline */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gz-navy/15 px-3 py-0.5 font-ibm-mono text-[9px] font-semibold uppercase tracking-[1px] text-gz-navy">
                        {review.publicacionTipo === "analisis"
                          ? "Analisis"
                          : "Ensayo"}
                      </span>
                      {review.publicacion?.materia && (
                        <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                          {review.publicacion.materia}
                        </span>
                      )}
                    </div>
                    <span className={`font-ibm-mono text-[10px] font-semibold ${dl.color}`}>
                      {dl.text}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-cormorant text-[20px] font-bold text-gz-ink mb-2">
                    {review.publicacion?.titulo || "Sin titulo"}
                  </h3>

                  {/* Author */}
                  {review.autor && (
                    <div className="flex items-center gap-2 mb-4">
                      {review.autor.avatarUrl ? (
                        <img
                          src={review.autor.avatarUrl}
                          alt=""
                          className="h-7 w-7 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gz-navy/10 font-ibm-mono text-[10px] font-bold text-gz-gold">
                          {initials}
                        </div>
                      )}
                      <span className="font-archivo text-[13px] text-gz-ink">
                        {review.autor.firstName} {review.autor.lastName}
                      </span>
                      {review.autor.universidad && (
                        <span className="font-ibm-mono text-[10px] text-gz-ink-light">
                          {review.autor.universidad}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <Link
                    href={`/dashboard/diario/peer-review/${review.id}`}
                    className="inline-flex items-center gap-1 font-archivo text-[13px] font-semibold text-gz-gold hover:underline transition-colors"
                  >
                    Leer y evaluar &rarr;
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Info box */}
        <div className="mt-10 rounded-[4px] border border-gz-rule bg-gz-cream-dark/30 p-5">
          <h3 className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-mid font-medium mb-2">
            Sobre el Peer Review
          </h3>
          <ul className="space-y-1.5 font-archivo text-[13px] text-gz-ink-mid">
            <li>Evalua claridad, rigor juridico y originalidad (1-5 estrellas)</li>
            <li>Incluye un comentario constructivo y sugerencias</li>
            <li>Gana +5 XP por cada review completado</li>
            <li>Plazo: 5 dias desde la solicitud</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
