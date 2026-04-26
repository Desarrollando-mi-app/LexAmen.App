"use client";

import Link from "next/link";
import type { LinkPreview } from "../types/obiter";

interface LinkPreviewCardProps {
  preview: LinkPreview;
  compact?: boolean;
}

/**
 * Tarjeta de previsualización para una URL en un Obiter Dictum.
 * Estilo Open Graph: imagen + título + descripción + sitio.
 *
 * Para noticias internas (kind="noticia"), navega con <Link> para
 * mantener SPA. Para externas, abre en nueva pestaña.
 */
export function LinkPreviewCard({ preview, compact }: LinkPreviewCardProps) {
  const isInternal = preview.kind === "noticia";
  const accent = isInternal ? "var(--gz-burgundy)" : "var(--gz-gold)";

  // Si no tenemos title ni image, mostramos solo el URL como fallback compacto
  if (!preview.title && !preview.image) {
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 rounded-[3px] border border-gz-rule bg-white px-3 py-2 hover:border-gz-gold/60 hover:bg-gz-cream-dark/30 transition-colors text-[12px] font-archivo text-gz-ink-mid hover:text-gz-gold"
        title={preview.url}
      >
        <span className="text-gz-gold">↗</span>
        <span className="truncate max-w-[280px]">{preview.url}</span>
      </a>
    );
  }

  // Wrap unificado: Link para internas (SPA), <a> para externas.
  function Wrap({ children, className }: { children: React.ReactNode; className: string }) {
    if (isInternal) {
      return (
        <Link href={preview.url} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={preview.url}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  // Compact = horizontal con imagen pequeña a la izquierda
  // Default = vertical con imagen arriba (para feeds)

  if (compact) {
    return (
      <Wrap
        className="group flex items-stretch rounded-[4px] border border-gz-rule bg-white overflow-hidden hover:border-gz-gold/60 hover:shadow-sm transition-all"
      >
        {preview.image && (
          <div
            className="w-[100px] shrink-0 bg-gz-cream-dark bg-cover bg-center"
            style={{ backgroundImage: `url(${preview.image})` }}
          />
        )}
        <div className="flex-1 min-w-0 p-3 relative">
          <div
            className="absolute top-0 left-0 h-full w-[3px]"
            style={{ backgroundColor: accent }}
          />
          {preview.siteName && (
            <p
              className="font-ibm-mono text-[8px] uppercase tracking-[1.5px] mb-1"
              style={{ color: accent }}
            >
              {isInternal ? "📰 " : ""}{preview.siteName}
            </p>
          )}
          <h4 className="font-cormorant text-[15px] font-bold text-gz-ink leading-tight line-clamp-2 group-hover:text-gz-gold transition-colors">
            {preview.title}
          </h4>
          {preview.description && (
            <p className="font-archivo text-[11px] text-gz-ink-mid line-clamp-2 mt-1">
              {preview.description}
            </p>
          )}
        </div>
      </Wrap>
    );
  }

  return (
    <Wrap
      className="group block rounded-[4px] border border-gz-rule bg-white overflow-hidden hover:border-gz-gold/60 hover:shadow-md transition-all"
    >
      {preview.image && (
        <div className="relative">
          <div
            className="w-full aspect-[1200/630] bg-gz-cream-dark bg-cover bg-center"
            style={{ backgroundImage: `url(${preview.image})` }}
          />
          {isInternal && (
            <span
              className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-ibm-mono text-[8px] uppercase tracking-[1.5px] bg-gz-burgundy text-white shadow-sm"
            >
              📰 La Gaceta
            </span>
          )}
        </div>
      )}
      <div className="relative p-4">
        <div
          className="absolute top-0 left-0 h-full w-[3px]"
          style={{ backgroundColor: accent }}
        />
        {preview.siteName && (
          <p
            className="font-ibm-mono text-[9px] uppercase tracking-[2px] mb-1.5 flex items-center gap-1.5"
            style={{ color: accent }}
          >
            {!preview.image && isInternal && <span>📰</span>}
            {preview.siteName}
          </p>
        )}
        <h4 className="font-cormorant text-[18px] font-bold text-gz-ink leading-tight line-clamp-3 group-hover:text-gz-gold transition-colors">
          {preview.title}
        </h4>
        {preview.description && (
          <p className="font-archivo text-[12px] text-gz-ink-mid line-clamp-3 mt-2">
            {preview.description}
          </p>
        )}
        <p className="font-ibm-mono text-[9px] text-gz-ink-light mt-2 truncate flex items-center gap-1">
          <span style={{ color: accent }}>↗</span>
          {(() => {
            try {
              return new URL(preview.url).hostname.replace(/^www\./, "");
            } catch {
              return preview.url;
            }
          })()}
        </p>
      </div>
    </Wrap>
  );
}

/**
 * Lista de tarjetas con espaciado consistente.
 */
export function LinkPreviewList({
  previews,
  compact,
}: {
  previews: LinkPreview[];
  compact?: boolean;
}) {
  if (!previews || previews.length === 0) return null;
  return (
    <div className="space-y-2 mt-3">
      {previews.map((p, i) => (
        <LinkPreviewCard key={`${p.url}-${i}`} preview={p} compact={compact} />
      ))}
    </div>
  );
}
