"use client";

// ─── InvRestoreDraftModal ─────────────────────────────────────
//
// Modal centrado que se muestra al cargar el editor si hay un borrador
// guardado en localStorage. Preview del título + savedAt + dos botones.

type Draft = {
  titulo?: string;
  savedAt?: string;
};

export function InvRestoreDraftModal({
  draft,
  onRestore,
  onDiscard,
}: {
  draft: Draft;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const fechaIso = draft.savedAt;
  const fecha = fechaIso
    ? new Date(fechaIso).toLocaleString("es-CL", {
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-inv-ink/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Restaurar borrador"
        className="fixed left-1/2 top-[20vh] z-50 w-[92vw] max-w-[480px] -translate-x-1/2 rounded-[3px] border border-inv-ink bg-inv-paper shadow-2xl overflow-hidden"
      >
        <div className="h-[3px] bg-inv-ocre" />
        <div className="p-6">
          <p className="font-cormorant italic text-[12px] uppercase tracking-[2.5px] text-inv-ocre mb-1">
            — Borrador encontrado —
          </p>
          <h2 className="font-cormorant text-[24px] font-medium leading-tight mb-2 text-inv-ink">
            <em>¿Restaurar tu borrador?</em>
          </h2>
          <p className="font-crimson-pro text-[14px] leading-snug text-inv-ink-2 mb-1">
            <strong className="font-cormorant text-[15px]">
              {draft.titulo?.trim() || "Sin título"}
            </strong>
          </p>
          <p className="font-cormorant italic text-[12px] text-inv-ink-3 mb-6">
            Guardado: {fecha}
          </p>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onDiscard}
              className="font-crimson-pro text-[12px] tracking-[1px] uppercase border border-inv-rule px-4 py-2 text-inv-ink-3 hover:border-inv-tinta-roja hover:text-inv-tinta-roja transition-colors cursor-pointer"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={onRestore}
              className="font-crimson-pro text-[12px] tracking-[1px] uppercase bg-inv-ink text-inv-paper px-5 py-2 hover:bg-inv-ocre transition-colors cursor-pointer"
            >
              Restaurar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
