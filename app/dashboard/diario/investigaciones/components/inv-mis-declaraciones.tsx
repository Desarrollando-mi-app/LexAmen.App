// ─── InvMisDeclaraciones — server component ────────────────────
//
// Solo visible al autor de la investigación. Lista todas las
// CitacionExterna que ha declarado para esta investigación con
// su estado (pendiente / verificada / rechazada). Si la rechazada
// tiene reviewNotes, lo muestra al autor.

import { prisma } from "@/lib/prisma";

const SOURCE_LABELS: Record<string, string> = {
  memoria_pregrado: "Memoria de pregrado",
  tesis_magister: "Tesis de magíster",
  tesis_doctorado: "Tesis doctoral",
  articulo_revista: "Artículo de revista",
  libro: "Libro",
  capitulo_libro: "Capítulo de libro",
  sentencia: "Sentencia judicial",
  otro: "Otro",
};

export async function InvMisDeclaraciones({ invId }: { invId: string }) {
  const declaraciones = await prisma.citacionExterna.findMany({
    where: { investigacionId: invId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      citingTitle: true,
      citingAuthor: true,
      citingYear: true,
      citingSource: true,
      citingUrl: true,
      citingPdfUrl: true,
      status: true,
      reviewNotes: true,
      reviewedAt: true,
      createdAt: true,
    },
  });

  if (declaraciones.length === 0) return null;

  return (
    <section className="mt-8">
      <h3 className="font-cormorant italic text-[12px] uppercase tracking-[2.5px] text-inv-ocre mb-3">
        — Mis declaraciones —
      </h3>
      <ul className="space-y-3">
        {declaraciones.map((d) => (
          <li
            key={d.id}
            className="p-3.5 border border-inv-rule bg-inv-paper"
          >
            <div className="flex justify-between items-start gap-3 mb-1">
              <p className="font-cormorant text-[15px] font-medium leading-tight text-inv-ink min-w-0 flex-1">
                {d.citingTitle}
              </p>
              <StatusBadge status={d.status} />
            </div>
            <p className="font-crimson-pro italic text-[12px] text-inv-ink-3">
              por {d.citingAuthor}
              {d.citingYear ? ` · ${d.citingYear}` : ""}
              {d.citingSource
                ? ` · ${SOURCE_LABELS[d.citingSource] ?? d.citingSource}`
                : ""}
            </p>
            {d.citingUrl && (
              <a
                href={d.citingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-1 font-cormorant italic text-[11px] text-inv-ocre hover:text-inv-ink underline-offset-2 hover:underline"
              >
                {d.citingUrl}
              </a>
            )}
            {d.status === "rechazada" && d.reviewNotes && (
              <p className="mt-2 pt-2 border-t border-inv-rule-2 font-crimson-pro italic text-[12px] text-inv-tinta-roja leading-snug">
                <strong className="not-italic font-semibold">Motivo: </strong>
                {d.reviewNotes}
              </p>
            )}
            {d.citingPdfUrl && (
              <p className="mt-1.5 font-cormorant italic text-[10px] text-inv-ink-4 tracking-[0.5px]">
                · PDF de evidencia adjunto
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; cls: string }> = {
    pendiente: {
      label: "En revisión",
      cls: "bg-inv-paper-2 text-inv-ink-3 border border-inv-rule",
    },
    verificada: {
      label: "Verificada",
      cls: "bg-inv-ocre text-inv-paper",
    },
    rechazada: {
      label: "Rechazada",
      cls: "bg-inv-tinta-roja text-inv-paper",
    },
  };
  const v = variants[status] ?? variants.pendiente;
  return (
    <span
      className={`shrink-0 font-crimson-pro text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 ${v.cls}`}
    >
      {v.label}
    </span>
  );
}
