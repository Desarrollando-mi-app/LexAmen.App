"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type MentionUser = {
  id: string;
  firstName: string;
  lastName: string;
  handle: string | null;
  avatarUrl: string | null;
  universidad: string | null;
};

type AutocompleteState = {
  open: boolean;
  query: string;
  users: MentionUser[];
  selectedIndex: number;
  /** Inicio de la coincidencia "@..." en el textarea (para reemplazar al elegir) */
  startIndex: number;
  /** Fin (cursor actual) */
  endIndex: number;
};

const initialState: AutocompleteState = {
  open: false,
  query: "",
  users: [],
  selectedIndex: 0,
  startIndex: -1,
  endIndex: -1,
};

/**
 * Hook que detecta cuando el usuario está escribiendo `@palabra` en un
 * textarea y abre un dropdown con sugerencias. Devuelve el estado del
 * dropdown + handlers para insertar la mención al elegir.
 */
export function useMentionAutocomplete(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  content: string,
  setContent: (s: string) => void,
) {
  const [state, setState] = useState<AutocompleteState>(initialState);
  const fetchSeq = useRef(0);

  // Detecta si el cursor está en una mención activa "@xxx" (sin espacio
  // hasta el cursor). Si sí, devuelve {start, end, query}.
  const detectMention = useCallback(
    (text: string, cursor: number): { start: number; end: number; query: string } | null => {
      // Escanea hacia atrás desde el cursor
      let i = cursor - 1;
      while (i >= 0 && /[a-zA-Z0-9_]/.test(text[i])) i--;
      if (i < 0 || text[i] !== "@") return null;
      // Verificar que el @ está al inicio de palabra (precedido por espacio,
      // newline o inicio de string).
      if (i > 0 && !/[\s.,;:!?(]/.test(text[i - 1])) return null;
      const query = text.slice(i + 1, cursor);
      if (query.length === 0) {
        // Aún no escribió nada después del @ — no abrimos
        return null;
      }
      return { start: i, end: cursor, query };
    },
    [],
  );

  // Llamar este handler en el onChange/onSelect del textarea
  const handleSelectionChange = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart ?? 0;
    const mention = detectMention(content, cursor);
    if (!mention) {
      setState((prev) => (prev.open ? initialState : prev));
      return;
    }
    // Abre/actualiza dropdown
    setState((prev) => ({
      ...prev,
      open: true,
      query: mention.query,
      startIndex: mention.start,
      endIndex: mention.end,
      selectedIndex: 0,
    }));
  }, [content, detectMention, textareaRef]);

  // Cuando cambia query, fetch debounced
  useEffect(() => {
    if (!state.open || state.query.length < 1) {
      return;
    }
    const seq = ++fetchSeq.current;
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/autocomplete?q=${encodeURIComponent(state.query)}&limit=6`,
          { credentials: "include" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (seq !== fetchSeq.current) return; // stale
        setState((prev) =>
          prev.open
            ? { ...prev, users: data.users ?? [], selectedIndex: 0 }
            : prev,
        );
      } catch {
        /* silent */
      }
    }, 150);
    return () => clearTimeout(handle);
  }, [state.open, state.query]);

  // Insertar mención seleccionada
  const insertMention = useCallback(
    (user: MentionUser) => {
      if (state.startIndex < 0) return;
      const handle = user.handle ?? user.firstName.toLowerCase();
      const before = content.slice(0, state.startIndex);
      const after = content.slice(state.endIndex);
      const newContent = `${before}@${handle} ${after}`;
      setContent(newContent);
      setState(initialState);
      // Reposicionar cursor justo después del handle insertado
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          const cursor = state.startIndex + handle.length + 2; // @ + handle + " "
          ta.focus();
          ta.setSelectionRange(cursor, cursor);
        }
      });
    },
    [content, setContent, state.startIndex, state.endIndex, textareaRef],
  );

  // Navegación con flechas + enter/escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!state.open || state.users.length === 0) return false;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedIndex: (prev.selectedIndex + 1) % prev.users.length,
        }));
        return true;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setState((prev) => ({
          ...prev,
          selectedIndex:
            (prev.selectedIndex - 1 + prev.users.length) % prev.users.length,
        }));
        return true;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        const user = state.users[state.selectedIndex];
        if (user) {
          e.preventDefault();
          insertMention(user);
          return true;
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setState(initialState);
        return true;
      }
      return false;
    },
    [state.open, state.users, state.selectedIndex, insertMention],
  );

  return {
    open: state.open && state.users.length > 0,
    users: state.users,
    selectedIndex: state.selectedIndex,
    handleSelectionChange,
    handleKeyDown,
    insertMention,
    close: () => setState(initialState),
  };
}
