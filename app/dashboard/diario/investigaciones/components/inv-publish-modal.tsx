"use client";

// ─── InvPublishConfirmModal — disclaimer Ley 17.336 ────────────
//
// Modal final antes de publicar. Disclaimer textual obligatorio +
// checkbox que habilita el botón "Acepto y publico".

import { useState } from "react";

export function InvPublishConfirmModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const [accepted, setAccepted] = useState(false);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-inv-ink/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden
      />
      <div
        role="dialog"
        aria-label="Confirmar publicación"
        className="fixed left-1/2 top-[14vh] z-50 w-[92vw] max-w-[560px] -translate-x-1/2 rounded-[3px] border border-inv-ink bg-inv-paper shadow-2xl overflow-hidden"
      >
        <div className="h-[3px] bg-gradient-to-r from-inv-ocre via-inv-tinta-roja to-inv-ocre" />
        <div className="p-7">
          <p className="font-cormorant italic text-[12px] uppercase tracking-[2.5px] text-inv-ocre mb-1">
            — Confirmación de publicación —
          </p>
          <h2 className="font-cormorant text-[26px] font-medium leading-tight mb-4 text-inv-ink">
            <em>Antes de enviar a la imprenta</em>
          </h2>

          <p className="font-cormorant italic text-[15px] leading-[1.65] text-inv-ink-2 mb-5">
            Al publicar esta investigación, declaras que es de tu autoría y
            que respetas los derechos de autor de toda obra citada. Studio
            IURIS recibe una licencia para reproducir tu obra en la Revista
            mensual con ISSN si decides aceptarlo en su momento. Tu obra
            es y seguirá siendo tuya. Las opiniones son responsabilidad
            exclusiva del autor y no constituyen asesoría jurídica.
          </p>

          <label className="flex items-start gap-2.5 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 accent-inv-ocre w-4 h-4"
            />
            <span className="font-crimson-pro text-[14px] text-inv-ink leading-snug">
              He leído y acepto las condiciones de publicación.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="font-crimson-pro text-[12px] tracking-[1px] uppercase border border-inv-rule px-5 py-2 text-inv-ink-3 hover:border-inv-ink hover:text-inv-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!accepted || loading}
              className="font-crimson-pro text-[13px] tracking-[1px] uppercase bg-inv-ink text-inv-paper px-6 py-2.5 hover:bg-inv-ocre transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Publicando…" : "Acepto y publico"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
