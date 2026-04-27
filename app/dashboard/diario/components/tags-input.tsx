"use client";

// ─── TagsInput — free-form #tags con chips eliminables ─────────
//
// Reemplaza el chooser de tags pre-definidos. El usuario escribe
// libremente — los tags se confirman al presionar:
//   - Espacio
//   - Enter
//   - Coma
//
// Cada tag se normaliza: lowercase, sin espacios, sin caracteres
// raros, prefijo `#` removido (se muestra siempre con `#` en la UI).
// Duplicados ignorados. Max 8 tags por publicación.
//
// Compatible con el almacenamiento existente: serializa como string
// separado por comas (mismo formato que el sistema actual usaba).

import { useState, useRef, useEffect } from "react";

type TagsInputProps = {
  /** String separado por comas (formato de almacenamiento) */
  value: string;
  onChange: (csv: string) => void;
  placeholder?: string;
  max?: number;
  accent?: "burgundy" | "sage" | "gold" | "navy";
};

const MAX_TAGS_DEFAULT = 8;

function normalizeTag(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw
    .trim()
    .replace(/^#+/, "") // quita # iniciales
    .toLowerCase()
    .replace(/[^a-z0-9_áéíóúñü]/gi, "") // permite letras, números, _ y acentos
    .slice(0, 30);
  if (cleaned.length < 2) return null;
  return cleaned;
}

function csvToTags(csv: string): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((t) => normalizeTag(t))
    .filter((t): t is string => !!t);
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Escribe un tag y presiona espacio o enter...",
  max = MAX_TAGS_DEFAULT,
  accent = "burgundy",
}: TagsInputProps) {
  const [draft, setDraft] = useState("");
  const [tags, setTags] = useState<string[]>(() => csvToTags(value));
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync con value externo (si el padre lo cambia)
  useEffect(() => {
    const fromValue = csvToTags(value);
    // Solo sincronizamos si difieren — evita ciclos
    if (fromValue.join(",") !== tags.join(",")) {
      setTags(fromValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(tag: string | null) {
    if (!tag) return;
    setTags((prev) => {
      if (prev.includes(tag)) return prev;
      if (prev.length >= max) return prev;
      const next = [...prev, tag];
      onChange(next.join(","));
      return next;
    });
    setDraft("");
  }

  function removeTag(idx: number) {
    setTags((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      onChange(next.join(","));
      return next;
    });
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Espacio, enter o coma confirman el tag
    if (e.key === " " || e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(normalizeTag(draft));
      return;
    }
    // Backspace en input vacío elimina el último tag
    if (e.key === "Backspace" && draft === "" && tags.length > 0) {
      e.preventDefault();
      removeTag(tags.length - 1);
      return;
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text");
    if (pasted.includes(",") || pasted.includes(" ") || pasted.includes("\n")) {
      e.preventDefault();
      const incoming = pasted
        .split(/[,\s\n]+/)
        .map(normalizeTag)
        .filter((t): t is string => !!t);
      if (incoming.length > 0) {
        setTags((prev) => {
          const next = [...prev];
          for (const t of incoming) {
            if (next.length >= max) break;
            if (!next.includes(t)) next.push(t);
          }
          onChange(next.join(","));
          return next;
        });
        setDraft("");
      }
    }
  }

  const accentClasses = {
    burgundy: { chipBg: "bg-gz-burgundy/[0.08]", chipBorder: "border-gz-burgundy/25", chipText: "text-gz-burgundy", focus: "focus-within:border-gz-burgundy" },
    sage:     { chipBg: "bg-gz-sage/[0.08]",     chipBorder: "border-gz-sage/25",     chipText: "text-gz-sage",     focus: "focus-within:border-gz-sage" },
    gold:     { chipBg: "bg-gz-gold/[0.10]",     chipBorder: "border-gz-gold/30",     chipText: "text-gz-gold",     focus: "focus-within:border-gz-gold" },
    navy:     { chipBg: "bg-gz-navy/[0.08]",     chipBorder: "border-gz-navy/25",     chipText: "text-gz-navy",     focus: "focus-within:border-gz-navy" },
  }[accent];

  const limitReached = tags.length >= max;

  return (
    <div>
      <div
        className={`flex flex-wrap items-center gap-1.5 rounded-[4px] border border-gz-rule bg-white px-3 py-2 transition-colors ${accentClasses.focus} focus-within:ring-1 focus-within:ring-gz-burgundy/20`}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, idx) => (
          <span
            key={`${tag}-${idx}`}
            className={`inline-flex items-center gap-1 rounded-full ${accentClasses.chipBg} border ${accentClasses.chipBorder} px-2.5 py-0.5 font-ibm-mono text-[11px] font-semibold ${accentClasses.chipText}`}
          >
            #{tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(idx);
              }}
              className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-gz-ink/10 transition-colors cursor-pointer"
              aria-label={`Remover ${tag}`}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            // Commit el draft pendiente al perder foco
            const t = normalizeTag(draft);
            if (t) commit(t);
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={limitReached}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none font-archivo text-[13px] text-gz-ink placeholder:text-gz-ink-light/60 focus:ring-0 disabled:cursor-not-allowed"
        />
      </div>
      <p className="mt-1.5 font-ibm-mono text-[10px] uppercase tracking-[1px] text-gz-ink-light flex items-center justify-between">
        <span>
          Espacio, enter o coma para confirmar · <span className="text-gz-ink-mid">{tags.length}/{max}</span>
        </span>
        {limitReached && (
          <span className="text-gz-burgundy font-semibold">Máximo alcanzado</span>
        )}
      </p>
    </div>
  );
}
