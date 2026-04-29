// ─── TipTap extension: cita inline ────────────────────────────
//
// Nodo inline custom que renderiza una citación a otra investigación
// como `(Apellido, Año)` con clase `.cite-inline` y atributos
// data-cited-inv-id / data-cited-author / data-cited-year. Como es un
// `atom`, el editor lo trata como una unidad indivisible — no se
// puede romper escribiendo dentro.
//
// Al guardar y reabrir el editor, parseHTML reconstruye el nodo
// estructurado a partir de los atributos data-* preservados en el
// HTML — la identidad estructural se mantiene a través de
// roundtrips.

import { Node, mergeAttributes } from "@tiptap/core";

export interface CitaOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cita: {
      insertCita: (attrs: {
        citedInvId: string;
        citedAuthor: string;
        citedYear: number;
      }) => ReturnType;
    };
  }
}

export const CitaExtension = Node.create<CitaOptions>({
  name: "cita",
  inline: true,
  group: "inline",
  selectable: true,
  atom: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      citedInvId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-cited-inv-id"),
        renderHTML: (attrs) => ({ "data-cited-inv-id": attrs.citedInvId }),
      },
      citedAuthor: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-cited-author"),
        renderHTML: (attrs) => ({ "data-cited-author": attrs.citedAuthor }),
      },
      citedYear: {
        default: null,
        parseHTML: (el) => {
          const v = el.getAttribute("data-cited-year");
          return v ? Number(v) : null;
        },
        renderHTML: (attrs) => ({
          "data-cited-year": attrs.citedYear ? String(attrs.citedYear) : "",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a.cite-inline[data-cited-inv-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { citedAuthor, citedYear } = node.attrs as {
      citedAuthor: string | null;
      citedYear: number | null;
    };
    return [
      "a",
      mergeAttributes(
        {
          class: "cite-inline",
          href: `#cita-${node.attrs.citedInvId}`,
        },
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      `(${citedAuthor ?? "—"}, ${citedYear ?? "—"})`,
    ];
  },

  addCommands() {
    return {
      insertCita:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs,
          }),
    };
  },
});
