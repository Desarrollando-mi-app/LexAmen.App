"use client";

import { useState } from "react";
import Link from "next/link";

interface ShareSessionProps {
  modulo: string;       // "Flashcards", "MCQ", etc.
  materia?: string;     // "Derecho Civil", etc.
  titulo?: string;      // "De la Ley", etc.
  total: number;
  correctas: number;
  xp: number;
}

export function ShareSession({
  modulo,
  materia,
  titulo,
  total,
  correctas,
  xp,
}: ShareSessionProps) {
  const [copied, setCopied] = useState(false);

  const materiaText = materia ? ` de ${materia}` : "";
  const tituloText = titulo ? ` · ${titulo}` : "";

  const shareText = `📚 Acabo de completar una sesión de estudio en Studio Iuris:\n${total} ${modulo.toLowerCase()}${materiaText}${tituloText} · ${correctas} correctas · +${xp} XP\n#StudioIuris`;

  const obiterPrefill = encodeURIComponent(shareText);

  const shareUrl = "https://studioiuris.cl";
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;

  function handleCopy() {
    navigator.clipboard.writeText(shareText + "\n" + shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-6 border-t border-gz-rule pt-5">
      <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-3">
        Compartir
      </p>

      <div className="flex flex-col gap-2">
        {/* Share to Obiter Dictum */}
        <Link
          href={`/dashboard/diario/obiter/nuevo?prefill=${obiterPrefill}`}
          className="flex items-center gap-2 rounded-[3px] border border-gz-rule px-4 py-2.5 font-archivo text-[13px] font-medium text-gz-ink transition-colors hover:border-gz-gold hover:text-gz-gold"
        >
          <span>📝</span>
          <span>Compartir en Obiter Dictum</span>
        </Link>

        {/* Social share buttons */}
        <div className="flex gap-2">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-ink"
          >
            𝕏
          </a>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-ink"
          >
            WhatsApp
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-ink"
          >
            Facebook
          </a>
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-[3px] border border-gz-rule px-3 py-2 font-archivo text-[12px] text-gz-ink-mid transition-colors hover:border-gz-gold hover:text-gz-ink"
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
