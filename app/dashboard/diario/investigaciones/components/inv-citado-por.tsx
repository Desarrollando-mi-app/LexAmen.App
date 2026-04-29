// ─── InvCitadoPor — server component ───────────────────────────
//
// Lista de investigaciones que citan a la investigación actual. Muestra
// hasta 12 ítems con contextSnippet (si está). Auto-citas se excluyen
// (isSelfCitation=false) para no inflar la sección. Si no hay citas
// reales, no se renderiza nada.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEtapa } from "@/lib/etapa";
import { InvReportarCita } from "./inv-reportar-cita";

const MAX_ITEMS = 12;

export async function InvCitadoPor({ invId }: { invId: string }) {
  const citaciones = await prisma.citacion.findMany({
    where: {
      citedInvId: invId,
      isSelfCitation: false,
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ITEMS,
    select: {
      id: true,
      contextSnippet: true,
      createdAt: true,
      citingInv: {
        select: {
          id: true,
          titulo: true,
          tipo: true,
          publishedAt: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              etapaActual: true,
              gender: true,
              universidad: true,
            },
          },
        },
      },
    },
  });

  if (citaciones.length === 0) return null;

  const total = await prisma.citacion.count({
    where: { citedInvId: invId, isSelfCitation: false },
  });

  return (
    <section className="mt-14 pt-7 border-t-[3px] border-double border-inv-ink">
      <header className="mb-5">
        <p className="font-cormorant italic text-[12px] uppercase tracking-[2.5px] text-inv-ocre mb-1">
          — Sección IV · Recepción —
        </p>
        <h2 className="font-cormorant text-[28px] sm:text-[32px] font-medium text-inv-ink leading-tight">
          <em>Citado por</em>
        </h2>
        <p className="font-cormorant italic text-[13px] text-inv-ink-3 mt-1">
          {total === 1
            ? "1 trabajo cita esta investigación."
            : `${total} trabajos citan esta investigación.`}
        </p>
      </header>

      <ul className="divide-y divide-inv-rule-2">
        {citaciones.map((cit) => {
          const u = cit.citingInv.user;
          const initials = `${u.firstName[0] ?? ""}${
            u.lastName[0] ?? ""
          }`.toUpperCase();
          const year = new Date(cit.citingInv.publishedAt).getFullYear();
          return (
            <li key={cit.id} className="py-4 flex items-start gap-3.5">
              <Link
                href={`/dashboard/perfil/${u.id}`}
                className="shrink-0"
                aria-label={`Perfil de ${u.firstName} ${u.lastName}`}
              >
                <span
                  className="inv-sello"
                  style={{ width: 40, height: 40, fontSize: 13 }}
                >
                  {u.avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.avatarUrl}
                      alt=""
                      className="rounded-full object-cover absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </span>
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/diario/investigaciones/${cit.citingInv.id}`}
                  className="block group"
                >
                  <h3 className="font-cormorant text-[18px] font-medium leading-snug text-inv-ink group-hover:text-inv-ocre transition-colors line-clamp-2">
                    {cit.citingInv.titulo}
                  </h3>
                </Link>
                <p className="font-crimson-pro italic text-[12px] text-inv-ink-3 mt-0.5">
                  Por{" "}
                  <Link
                    href={`/dashboard/perfil/${u.id}`}
                    className="text-inv-ocre hover:text-inv-ink"
                  >
                    {u.firstName} {u.lastName}
                  </Link>
                  {u.etapaActual && (
                    <>
                      {" · "}
                      {formatEtapa(u.etapaActual, u.gender, {
                        capitalize: false,
                      })}
                    </>
                  )}
                  {" · "}
                  {year}
                </p>
                {cit.contextSnippet && (
                  <blockquote className="mt-2 pl-3 border-l-[2px] border-inv-ocre/40 font-cormorant italic text-[14px] leading-[1.55] text-inv-ink-2">
                    “{cit.contextSnippet}”
                  </blockquote>
                )}
                <div className="mt-1.5">
                  <InvReportarCita citacionId={cit.id} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {total > MAX_ITEMS && (
        <p className="mt-4 font-cormorant italic text-[12px] text-inv-ink-3 text-center">
          Mostrando los {MAX_ITEMS} más recientes de {total}.
        </p>
      )}
    </section>
  );
}
