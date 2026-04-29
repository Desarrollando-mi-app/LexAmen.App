// ─── InvExternas — server component ────────────────────────────
//
// Lista de citas externas verificadas (CitacionExterna con
// status='verificada'). Pendientes y rechazadas no se muestran al
// público. Sprint 2 deja la sección lista; Sprint 3 implementa el
// flujo de declaración + revisión editorial.

import { prisma } from "@/lib/prisma";

export async function InvExternas({ invId }: { invId: string }) {
  const externas = await prisma.citacionExterna.findMany({
    where: {
      investigacionId: invId,
      status: "verificada",
    },
    orderBy: [{ citingYear: "desc" }, { reviewedAt: "desc" }],
    select: {
      id: true,
      citingTitle: true,
      citingAuthor: true,
      citingYear: true,
      citingSource: true,
      citingUrl: true,
    },
  });

  if (externas.length === 0) return null;

  return (
    <section className="mt-12 pt-6 border-t border-inv-rule">
      <header className="mb-4">
        <p className="font-cormorant italic text-[11px] uppercase tracking-[2.5px] text-inv-ocre mb-1">
          — Sección V · Eco externo —
        </p>
        <h2 className="font-cormorant text-[24px] font-medium text-inv-ink leading-tight">
          <em>Externas verificadas</em>
        </h2>
        <p className="font-cormorant italic text-[12px] text-inv-ink-3 mt-1">
          {externas.length === 1
            ? "1 cita externa revisada por el comité."
            : `${externas.length} citas externas revisadas por el comité.`}
        </p>
      </header>

      <ul className="space-y-2.5">
        {externas.map((e, i) => (
          <li
            key={e.id}
            className="font-crimson-pro text-[14px] leading-[1.55] grid grid-cols-[28px_1fr] gap-3"
          >
            <span className="font-cormorant italic text-[15px] text-inv-ocre font-medium text-right tabular-nums">
              {i + 1}.
            </span>
            <span className="text-inv-ink">
              {e.citingAuthor}
              {e.citingYear && ` (${e.citingYear})`}.{" "}
              <em className="font-cormorant text-[15px]">{e.citingTitle}</em>
              {e.citingSource && `. ${e.citingSource}`}
              {e.citingUrl && (
                <>
                  {" "}
                  <a
                    href={e.citingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-cormorant italic text-[12px] text-inv-ocre hover:text-inv-ink underline-offset-2 hover:underline"
                  >
                    [enlace]
                  </a>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
