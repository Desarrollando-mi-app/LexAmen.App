"use client";

// ─── InvCitaExternaForm — declaración de cita externa ──────────
//
// Solo visible al autor de la investigación. Acepta título, autor,
// año, tipo de fuente, URL y PDF de evidencia (max 10 MB). El form
// se envía como multipart/form-data. Tras éxito recarga la página
// para mostrar la nueva declaración en "Mis declaraciones".

import { useState } from "react";

const FUENTES = [
  { value: "memoria_pregrado", label: "Memoria de pregrado" },
  { value: "tesis_magister", label: "Tesis de magíster" },
  { value: "tesis_doctorado", label: "Tesis doctoral" },
  { value: "articulo_revista", label: "Artículo de revista académica" },
  { value: "libro", label: "Libro" },
  { value: "capitulo_libro", label: "Capítulo de libro" },
  { value: "sentencia", label: "Sentencia judicial" },
  { value: "otro", label: "Otro" },
];

const MAX_PDF_SIZE = 10 * 1024 * 1024;

export function InvCitaExternaForm({ invId }: { invId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    citingTitle: "",
    citingAuthor: "",
    citingYear: "",
    citingSource: "",
    citingUrl: "",
    pdfFile: null as File | null,
  });

  const reset = () => {
    setForm({
      citingTitle: "",
      citingAuthor: "",
      citingYear: "",
      citingSource: "",
      citingUrl: "",
      pdfFile: null,
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.append("citingTitle", form.citingTitle);
    fd.append("citingAuthor", form.citingAuthor);
    if (form.citingYear) fd.append("citingYear", form.citingYear);
    if (form.citingSource) fd.append("citingSource", form.citingSource);
    if (form.citingUrl) fd.append("citingUrl", form.citingUrl);
    if (form.pdfFile) fd.append("pdf", form.pdfFile);

    try {
      const res = await fetch(`/api/investigaciones/${invId}/citas-externas`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Error al enviar la declaración.");
        return;
      }
      reset();
      setOpen(false);
      window.location.reload();
    } catch {
      setError("Error de red al enviar la declaración.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-10 p-5 sm:p-6 border border-dashed border-inv-ocre bg-inv-paper-2">
      <header className="mb-3">
        <p className="font-cormorant italic text-[11px] uppercase tracking-[2.5px] text-inv-ocre mb-1">
          — Para el autor —
        </p>
        <h3 className="font-cormorant text-[20px] font-medium text-inv-ink leading-tight">
          <em>¿Tu investigación fue citada en una obra externa?</em>
        </h3>
        <p className="font-cormorant italic text-[13px] text-inv-ink-3 mt-0.5">
          Declárala aquí. La verificará la redacción de Studio IURIS.
        </p>
      </header>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-crimson-pro italic text-[13px] text-inv-ocre border-b border-inv-ocre pb-0.5 hover:text-inv-ink hover:border-inv-ink transition-colors cursor-pointer"
        >
          Declarar cita externa →
        </button>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3.5 mt-4">
          <Field label="Título de la obra que te cita *">
            <input
              type="text"
              required
              minLength={3}
              maxLength={300}
              value={form.citingTitle}
              onChange={(e) => setForm({ ...form, citingTitle: e.target.value })}
              className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[14px] text-inv-ink outline-none focus:border-inv-ocre"
            />
          </Field>

          <Field label="Autor de la obra externa *">
            <input
              type="text"
              required
              minLength={3}
              maxLength={200}
              value={form.citingAuthor}
              onChange={(e) => setForm({ ...form, citingAuthor: e.target.value })}
              className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[14px] text-inv-ink outline-none focus:border-inv-ocre"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Año">
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                value={form.citingYear}
                onChange={(e) => setForm({ ...form, citingYear: e.target.value })}
                className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[14px] text-inv-ink outline-none focus:border-inv-ocre"
              />
            </Field>
            <Field label="Tipo de fuente">
              <select
                value={form.citingSource}
                onChange={(e) => setForm({ ...form, citingSource: e.target.value })}
                className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[13px] text-inv-ink outline-none cursor-pointer focus:border-inv-ocre"
              >
                <option value="">— Seleccionar —</option>
                {FUENTES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="URL (opcional)">
            <input
              type="url"
              value={form.citingUrl}
              onChange={(e) => setForm({ ...form, citingUrl: e.target.value })}
              placeholder="https://…"
              className="w-full p-2 border border-inv-rule bg-inv-paper font-crimson-pro text-[14px] text-inv-ink outline-none focus:border-inv-ocre"
            />
          </Field>

          <Field label="PDF de evidencia (opcional, máx 10 MB)">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > MAX_PDF_SIZE) {
                  setError("El PDF excede el tamaño máximo de 10 MB.");
                  e.target.value = "";
                  return;
                }
                setError(null);
                setForm({ ...form, pdfFile: f });
              }}
              className="w-full font-crimson-pro text-[12px] text-inv-ink"
            />
            <p className="font-cormorant italic text-[11px] text-inv-ink-3 mt-0.5">
              Solo accesible para administradores al verificar.
            </p>
          </Field>

          {error && (
            <p className="font-crimson-pro text-[13px] text-inv-tinta-roja border border-inv-tinta-roja/40 bg-inv-tinta-roja/[0.05] px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={
                submitting ||
                form.citingTitle.trim().length < 3 ||
                form.citingAuthor.trim().length < 3
              }
              className="px-5 py-2 bg-inv-ink text-inv-paper font-crimson-pro text-[12px] tracking-[1px] uppercase hover:bg-inv-ocre transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? "Enviando…" : "Enviar declaración"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              disabled={submitting}
              className="px-5 py-2 border border-inv-rule font-crimson-pro text-[12px] tracking-[1px] uppercase text-inv-ink-3 hover:border-inv-ink hover:text-inv-ink transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block font-cormorant italic text-[12px] uppercase tracking-[1.5px] text-inv-ink-3 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
