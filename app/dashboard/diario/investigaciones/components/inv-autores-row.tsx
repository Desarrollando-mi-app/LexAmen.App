// ─── InvAutoresRow — top 5 autores por h-index ───────────────
//
// Datos cuantitativos siempre en arábigos (h, trabajos, citas).
// Numeral romano solo decorativo en posición.

import Link from "next/link";
import { toRoman } from "@/lib/investigaciones-constants";
import { formatEtapa } from "@/lib/etapa";

type Autor = {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  etapaActual: string | null;
  gender: string | null;
  avatarUrl: string | null;
  hIndex: number;
  totalCitationsReceived: number;
  trabajos: number;
};

export function InvAutoresRow({ autores }: { autores: Autor[] }) {
  if (autores.length === 0) return null;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-0 border border-inv-ink mb-9 bg-inv-paper inv-anim-autores">
      {autores.map((autor, i) => {
        const initials = `${autor.firstName[0] ?? ""}${autor.lastName[0] ?? ""}`.toUpperCase();
        return (
          <Link
            key={autor.id}
            href={`/dashboard/perfil/${autor.id}`}
            className="block p-6 text-center border-r border-inv-rule last:border-r-0 cursor-pointer hover:bg-inv-paper-2 transition-colors"
          >
            <div className="font-cormorant italic text-[12px] text-inv-ocre tracking-[2px] mb-2.5">
              {toRoman(i + 1)}
            </div>

            <div
              className="inv-sello mx-auto mb-3"
              style={{ width: 64, height: 64, fontSize: 22 }}
            >
              {autor.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={autor.avatarUrl}
                  alt=""
                  className="rounded-full object-cover absolute inset-1 w-[calc(100%-8px)] h-[calc(100%-8px)]"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            <div className="font-cormorant text-[16px] font-medium leading-[1.2] mb-1 tracking-[-0.2px] text-inv-ink">
              {autor.firstName} {autor.lastName}
            </div>
            <div className="font-crimson-pro italic text-[11px] text-inv-ink-3 mb-3.5 pb-2.5 border-b border-inv-rule-2">
              {autor.universidad ?? "—"}
              {autor.etapaActual && (
                <>
                  {" · "}
                  <em>{formatEtapa(autor.etapaActual, autor.gender)}</em>
                </>
              )}
            </div>

            <div className="flex justify-center gap-3.5">
              <div>
                <div className="font-cormorant text-[22px] font-semibold text-inv-ocre leading-none">
                  {autor.hIndex}
                </div>
                <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
                  <em>h</em>
                </div>
              </div>
              <div>
                <div className="font-cormorant text-[22px] font-semibold text-inv-ocre leading-none">
                  {autor.trabajos}
                </div>
                <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
                  trabajos
                </div>
              </div>
              <div>
                <div className="font-cormorant text-[22px] font-semibold text-inv-ocre leading-none">
                  {autor.totalCitationsReceived}
                </div>
                <div className="font-crimson-pro italic text-[10px] text-inv-ink-3 mt-0.5">
                  citas
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

