"use client";

// ─── InvEditor — editor principal de Investigaciones ──────────
//
// Layout 70/30. Panel principal con título, deck, abstract editable,
// separador §§§, toolbar TipTap mínimo, body editable, bibliografía
// preview generada de las citas insertadas. Panel sidebar con tipo,
// área, instituciones, contador del cuerpo, checklist y botón
// "Enviar a la imprenta".
//
// Autosave: localStorage cada 30s con key `inv-draft-${userId}`.
// Restauración con modal al cargar si existe borrador.
// Disclaimer Ley 17.336 obligatorio antes de publicar.

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { CitaExtension } from "@/lib/tiptap-cita-extension";
import {
  TIPOS_INVESTIGACION,
  TIPOS_INVESTIGACION_LABELS,
  AREAS_DERECHO,
  AREAS_DERECHO_LABELS,
  MIN_WORDS_BY_TYPE,
  ABSTRACT_MIN_WORDS,
  ABSTRACT_MAX_WORDS,
  MIN_KEYWORDS,
  MAX_KEYWORDS,
  toRomanLower,
} from "@/lib/investigaciones-constants";
import { InvCitaModal, type CitaPayload } from "./inv-cita-modal";
import { InvRestoreDraftModal } from "./inv-restore-modal";
import { InvPublishConfirmModal } from "./inv-publish-modal";
import { InstitucionAutocomplete } from "./inv-institucion-autocomplete";

const AUTOSAVE_INTERVAL_MS = 30_000;

type Institucion = {
  id: number;
  nombre: string;
  area: string;
  grupo: string;
};

type Draft = {
  titulo: string;
  deck: string;
  abstract: string;
  contenido: string;
  tipo: string;
  area: string;
  areasSecundarias: string[];
  institucionIds: number[];
  citasInsertadas: CitaPayload[];
  savedAt: string;
};

export function InvEditor({
  userId,
  instituciones,
}: {
  userId: string;
  instituciones: Institucion[];
}) {
  const router = useRouter();
  const draftKey = `inv-draft-${userId}`;

  const [titulo, setTitulo] = useState("");
  const [deck, setDeck] = useState("");
  const [abstract, setAbstract] = useState("");
  const [tipo, setTipo] = useState("");
  const [area, setArea] = useState("");
  const [areasSecundarias] = useState<string[]>([]);
  const [institucionIds, setInstitucionIds] = useState<number[]>([]);
  const [citasInsertadas, setCitasInsertadas] = useState<CitaPayload[]>([]);
  const [showCitaModal, setShowCitaModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Escribe el cuerpo de tu investigación…",
      }),
      CitaExtension,
    ],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "art-body min-h-[400px] focus:outline-none font-crimson-pro text-[16px] sm:text-[17px] leading-[1.75] text-inv-ink",
      },
    },
  });

  // ── Detectar borrador al montar (solo una vez) ──
  const restoreCheckedRef = useRef(false);
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Draft;
      if (parsed && (parsed.titulo || parsed.contenido || parsed.abstract)) {
        setPendingDraft(parsed);
      }
    } catch {
      /* ignorar JSON corrupto */
    }
  }, [draftKey]);

  // ── Autosave cada 30s ──
  useEffect(() => {
    if (!editor) return;
    const interval = setInterval(() => {
      const draft: Draft = {
        titulo,
        deck,
        abstract,
        contenido: editor.getHTML(),
        tipo,
        area,
        areasSecundarias,
        institucionIds,
        citasInsertadas,
        savedAt: new Date().toISOString(),
      };
      try {
        // No guardar borrador completamente vacío
        if (titulo.trim() || abstract.trim() || editor.getText().trim()) {
          localStorage.setItem(draftKey, JSON.stringify(draft));
        }
      } catch {
        /* localStorage lleno o no disponible */
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    editor,
    titulo,
    deck,
    abstract,
    tipo,
    area,
    areasSecundarias,
    institucionIds,
    citasInsertadas,
    draftKey,
  ]);

  // ── Restaurar borrador ──
  function handleRestore() {
    if (!pendingDraft) return;
    setTitulo(pendingDraft.titulo ?? "");
    setDeck(pendingDraft.deck ?? "");
    setAbstract(pendingDraft.abstract ?? "");
    setTipo(pendingDraft.tipo ?? "");
    setArea(pendingDraft.area ?? "");
    setInstitucionIds(pendingDraft.institucionIds ?? []);
    setCitasInsertadas(pendingDraft.citasInsertadas ?? []);
    if (editor && pendingDraft.contenido) {
      editor.commands.setContent(pendingDraft.contenido);
    }
    setPendingDraft(null);
  }
  function handleDiscardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* silent */
    }
    setPendingDraft(null);
  }

  // ── Insertar cita ──
  const handleInsertCita = useCallback(
    (cita: CitaPayload) => {
      editor?.commands.insertCita({
        citedInvId: cita.citedInvId,
        citedAuthor: cita.citedAuthor,
        citedYear: cita.citedYear,
      });
      setCitasInsertadas((prev) => {
        // Evitar duplicados
        if (prev.some((c) => c.citedInvId === cita.citedInvId)) return prev;
        return [...prev, cita];
      });
      setShowCitaModal(false);
    },
    [editor],
  );

  // ── Contadores en vivo ──
  const abstractWords = abstract.trim()
    ? abstract.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const bodyText = editor?.getText() ?? "";
  const bodyWords = bodyText.trim()
    ? bodyText.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const minBodyWords =
    tipo && tipo in MIN_WORDS_BY_TYPE
      ? MIN_WORDS_BY_TYPE[tipo as keyof typeof MIN_WORDS_BY_TYPE]
      : 0;

  // ── Checklist en vivo ──
  const checklist = {
    titulo: titulo.trim().length >= 10,
    abstract:
      abstractWords >= ABSTRACT_MIN_WORDS &&
      abstractWords <= ABSTRACT_MAX_WORDS,
    tipo: !!tipo,
    area: !!area,
    instituciones:
      institucionIds.length >= MIN_KEYWORDS &&
      institucionIds.length <= MAX_KEYWORDS,
    body: bodyWords >= minBodyWords && bodyWords > 0,
  };
  const canPublish = Object.values(checklist).every(Boolean);

  // ── Publicar ──
  async function handlePublish() {
    if (!editor || !canPublish || publishing) return;
    setPublishing(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/investigaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: titulo.trim(),
          deck: deck.trim() || null,
          abstract: abstract.trim(),
          contenido: editor.getHTML(),
          tipo,
          area,
          areasSecundarias,
          institucionIds,
          citasInsertadas: citasInsertadas.map((c) => ({
            citedInvId: c.citedInvId,
            contextSnippet: c.contextSnippet ?? null,
            locationInText: null,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.errors?.[0] ?? data?.error ?? "Error al publicar.";
        setErrorMsg(msg);
        setShowPublishModal(false);
        return;
      }
      const data = await res.json();
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* silent */
      }
      router.push(`/dashboard/diario/investigaciones/${data.id}`);
    } catch (e) {
      setErrorMsg(
        e instanceof Error ? e.message : "Error de conexión al publicar.",
      );
      setShowPublishModal(false);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 lg:gap-10">
      {/* ─── Panel principal ─── */}
      <div className="min-w-0">
        {/* Título */}
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Título de la investigación"
          className="block w-full bg-transparent border-none outline-none font-cormorant text-[32px] sm:text-[40px] font-medium leading-tight tracking-[-0.5px] text-inv-ink placeholder:text-inv-ink-4 mb-3 focus:ring-0"
          maxLength={200}
        />

        {/* Deck */}
        <input
          type="text"
          value={deck}
          onChange={(e) => setDeck(e.target.value)}
          placeholder="Bajada periodística (opcional, una línea)"
          className="block w-full bg-transparent border-none outline-none font-cormorant italic text-[18px] text-inv-ink-2 placeholder:text-inv-ink-4 mb-6 focus:ring-0"
          maxLength={240}
        />

        {/* Abstract */}
        <p className="font-cormorant italic text-[12px] uppercase tracking-[2px] text-inv-ocre mb-2">
          — Resumen —
        </p>
        <textarea
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          placeholder={`Resumen de la investigación. Entre ${ABSTRACT_MIN_WORDS} y ${ABSTRACT_MAX_WORDS} palabras.`}
          rows={6}
          className="w-full font-cormorant italic text-[16px] leading-[1.65] bg-inv-paper-2 border-l-[3px] border-inv-ocre p-4 mb-2 outline-none text-inv-ink resize-y focus:ring-0"
        />
        <p
          className={`font-crimson-pro text-[11px] tabular-nums tracking-[0.5px] mb-1 ${
            checklist.abstract ? "text-inv-ocre-2" : "text-inv-tinta-roja"
          }`}
        >
          {abstractWords} / {ABSTRACT_MAX_WORDS} palabras
          {!checklist.abstract && abstractWords > 0 && (
            <>
              {" · "}
              {abstractWords < ABSTRACT_MIN_WORDS
                ? `faltan ${ABSTRACT_MIN_WORDS - abstractWords}`
                : `sobran ${abstractWords - ABSTRACT_MAX_WORDS}`}
            </>
          )}
        </p>

        {/* Separador */}
        <div className="text-center text-[24px] text-inv-ocre tracking-[16px] my-9 font-cormorant italic">
          § &nbsp; § &nbsp; §
        </div>

        {/* Toolbar TipTap */}
        <div className="flex items-center gap-1 flex-wrap mb-3 pb-3 border-b border-inv-rule-2">
          <ToolbarBtn
            label="B"
            bold
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={!!editor?.isActive("bold")}
          />
          <ToolbarBtn
            label="I"
            italic
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={!!editor?.isActive("italic")}
          />
          <ToolbarBtn
            label="H2"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={!!editor?.isActive("heading", { level: 2 })}
          />
          <ToolbarBtn
            label="H3"
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={!!editor?.isActive("heading", { level: 3 })}
          />
          <ToolbarBtn
            label="“ ”"
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={!!editor?.isActive("blockquote")}
          />
          <ToolbarBtn
            label="•"
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={!!editor?.isActive("bulletList")}
          />
          <ToolbarBtn
            label="—"
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          />
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setShowCitaModal(true)}
            className="font-crimson-pro text-[12px] tracking-[1px] uppercase bg-inv-ocre text-inv-paper px-3 py-1.5 cursor-pointer hover:bg-inv-ink transition-colors"
          >
            + Cita
          </button>
        </div>

        {/* Editor body */}
        <EditorContent editor={editor} />

        {/* Bibliografía preview */}
        {citasInsertadas.length > 0 && (
          <div className="mt-12 px-7 py-6 bg-inv-paper-2 border-y-[3px] border-double border-inv-ink">
            <h3 className="font-cormorant text-[22px] font-medium mb-1.5 text-inv-ink">
              — Referencias —
            </h3>
            <p className="font-cormorant italic text-[12px] text-inv-ink-3 mb-4 pb-3 border-b border-inv-rule-2">
              {citasInsertadas.length}{" "}
              {citasInsertadas.length === 1 ? "fuente citada" : "fuentes citadas"}
              .
            </p>
            <ul className="space-y-2.5">
              {citasInsertadas.map((c, i) => (
                <li
                  key={c.citedInvId}
                  className="font-crimson-pro text-[14px] leading-[1.55] grid grid-cols-[28px_1fr_auto] gap-3 items-start"
                >
                  <span className="font-cormorant italic text-[16px] text-inv-ocre font-medium text-right">
                    {toRomanLower(i + 1)}.
                  </span>
                  <span className="text-inv-ink">
                    {c.citedAuthor} ({c.citedYear}).{" "}
                    <em className="font-cormorant text-[15px]">
                      {c.citedTitle}
                    </em>
                    . Studio IURIS, Imprenta.
                  </span>
                  <span className="font-cormorant italic text-[10px] uppercase tracking-[1.5px] text-inv-ocre border border-inv-ocre/40 px-1.5 py-0.5 self-start">
                    ★ Studio IURIS
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Error inline */}
        {errorMsg && (
          <div className="mt-6 border border-inv-tinta-roja/40 bg-inv-tinta-roja/[0.05] px-4 py-3 font-crimson-pro text-[13px] text-inv-tinta-roja">
            {errorMsg}
          </div>
        )}
      </div>

      {/* ─── Sidebar ─── */}
      <aside className="space-y-5">
        {/* Tipo */}
        <div>
          <label className="block font-cormorant italic text-[11px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1.5">
            Tipo de trabajo
          </label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full font-crimson-pro text-[13px] p-2 border border-inv-rule bg-inv-paper outline-none cursor-pointer focus:border-inv-ocre"
          >
            <option value="">— Seleccionar —</option>
            {TIPOS_INVESTIGACION.map((t) => (
              <option key={t} value={t}>
                {TIPOS_INVESTIGACION_LABELS[t]}
              </option>
            ))}
          </select>
          {tipo && minBodyWords > 0 && (
            <p className="font-cormorant italic text-[11px] text-inv-ink-3 mt-1">
              Mínimo: {minBodyWords.toLocaleString("es-CL")} palabras
            </p>
          )}
        </div>

        {/* Área */}
        <div>
          <label className="block font-cormorant italic text-[11px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1.5">
            Área principal
          </label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full font-crimson-pro text-[13px] p-2 border border-inv-rule bg-inv-paper outline-none cursor-pointer focus:border-inv-ocre"
          >
            <option value="">— Seleccionar —</option>
            {AREAS_DERECHO.map((a) => (
              <option key={a} value={a}>
                {AREAS_DERECHO_LABELS[a]}
              </option>
            ))}
          </select>
        </div>

        {/* Instituciones */}
        <div>
          <label className="block font-cormorant italic text-[11px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1.5">
            Instituciones jurídicas
          </label>
          <p className="font-cormorant italic text-[11px] text-inv-ink-3 mb-2">
            Mínimo {MIN_KEYWORDS}, máximo {MAX_KEYWORDS}
          </p>
          <InstitucionAutocomplete
            instituciones={instituciones}
            selected={institucionIds}
            onChange={setInstitucionIds}
            max={MAX_KEYWORDS}
          />
        </div>

        {/* Contador del cuerpo */}
        <div className="p-3 bg-inv-paper-2 border border-inv-rule">
          <div className="font-cormorant text-[22px] tabular-nums leading-none text-inv-ink">
            {bodyWords.toLocaleString("es-CL")}
            {minBodyWords > 0 && (
              <span className="text-[14px] text-inv-ink-3 ml-1">
                / {minBodyWords.toLocaleString("es-CL")}
              </span>
            )}
          </div>
          <div className="font-cormorant italic text-[11px] text-inv-ink-3 mt-1">
            palabras del cuerpo
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-1.5">
          <ChecklistItem ok={checklist.titulo} label="Título ≥ 10 caracteres" />
          <ChecklistItem
            ok={checklist.abstract}
            label={`Abstract entre ${ABSTRACT_MIN_WORDS} y ${ABSTRACT_MAX_WORDS} palabras`}
          />
          <ChecklistItem ok={checklist.tipo} label="Tipo seleccionado" />
          <ChecklistItem ok={checklist.area} label="Área seleccionada" />
          <ChecklistItem
            ok={checklist.instituciones}
            label={`Mínimo ${MIN_KEYWORDS} instituciones`}
          />
          <ChecklistItem
            ok={checklist.body}
            label="Cuerpo cumple mínimo de palabras"
          />
        </div>

        {/* Acciones */}
        <button
          type="button"
          disabled={!canPublish || publishing}
          onClick={() => setShowPublishModal(true)}
          className="w-full font-crimson-pro text-[13px] tracking-[1px] uppercase bg-inv-ink text-inv-paper py-3 cursor-pointer hover:bg-inv-ocre transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Enviar a la imprenta →
        </button>
      </aside>

      {/* Modales */}
      {showCitaModal && (
        <InvCitaModal
          onClose={() => setShowCitaModal(false)}
          onInsert={handleInsertCita}
        />
      )}
      {pendingDraft && (
        <InvRestoreDraftModal
          draft={pendingDraft}
          onRestore={handleRestore}
          onDiscard={handleDiscardDraft}
        />
      )}
      {showPublishModal && (
        <InvPublishConfirmModal
          onConfirm={handlePublish}
          onCancel={() => setShowPublishModal(false)}
          loading={publishing}
        />
      )}
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  active = false,
  bold = false,
  italic = false,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  bold?: boolean;
  italic?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-crimson-pro text-[12px] px-2.5 py-1 border transition-colors cursor-pointer ${
        active
          ? "bg-inv-ink text-inv-paper border-inv-ink"
          : "bg-inv-paper text-inv-ink-2 border-inv-rule hover:border-inv-ocre hover:text-inv-ocre"
      } ${bold ? "font-semibold" : ""} ${italic ? "italic" : ""}`}
    >
      {label}
    </button>
  );
}

function ChecklistItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 font-crimson-pro text-[13px]">
      <span
        className={ok ? "text-inv-ocre-2 font-bold" : "text-inv-tinta-roja"}
      >
        {ok ? "✓" : "○"}
      </span>
      <span className={ok ? "text-inv-ink" : "text-inv-ink-3"}>{label}</span>
    </div>
  );
}
