// ─── /admin/citaciones-reportes — Panel admin ──────────────────
//
// Lista CitacionReporte abiertos con la cita, autor citado, autor
// citante y razón. Distingue reportes 'system' (outliers automáticos)
// de los manuales. Acciones: Resolver / Descartar.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ReporteActions } from "./components/reporte-actions";

export const metadata = {
  title: "Reportes de citas — Admin",
};

const REASON_LABELS: Record<string, string> = {
  outlier_detected: "Outlier detectado (automático)",
  inflado: "Cita inflada",
  irrelevante: "Cita irrelevante",
  plagio: "Posible plagio",
  otro: "Otro motivo",
};

const REASON_COLORS: Record<string, string> = {
  outlier_detected: "bg-amber-100 text-amber-900 border-amber-200",
  inflado: "bg-orange-100 text-orange-900 border-orange-200",
  irrelevante: "bg-gray-100 text-gray-900 border-gray-200",
  plagio: "bg-red-100 text-red-900 border-red-200",
  otro: "bg-blue-100 text-blue-900 border-blue-200",
};

type StatusFilter = "abierto" | "resuelto" | "descartado";

export default async function AdminCitacionesReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");
  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) redirect("/dashboard");

  const sp = await searchParams;
  const status: StatusFilter =
    sp.status === "resuelto" || sp.status === "descartado"
      ? sp.status
      : "abierto";

  const reportes = await prisma.citacionReporte.findMany({
    where: { status },
    orderBy: { createdAt: status === "abierto" ? "asc" : "desc" },
    take: 100,
    include: {
      citacion: {
        select: {
          id: true,
          contextSnippet: true,
          isSelfCitation: true,
          createdAt: true,
          citingInv: {
            select: {
              id: true,
              titulo: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          citedInv: {
            select: {
              id: true,
              titulo: true,
              citationsInternal: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  // Cargar reportantes (system + reales)
  const reportedByIds = Array.from(
    new Set(reportes.map((r) => r.reportedById).filter((id) => id !== "system")),
  );
  const reportantes = reportedByIds.length
    ? await prisma.user.findMany({
        where: { id: { in: reportedByIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const reportantesMap = new Map(reportantes.map((r) => [r.id, r]));

  const counts = await prisma.citacionReporte.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countsByStatus = new Map(counts.map((c) => [c.status, c._count.id]));

  return (
    <main>
      <header className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Reportes de citas internas
        </h1>
        <p className="text-sm text-gray-600">
          Outliers automáticos y reportes manuales. Cada acción queda
          registrada en AdminLog.
        </p>
      </header>

      <nav className="flex gap-1 mb-5 border-b border-gray-200">
        <TabLink
          active={status === "abierto"}
          href="/admin/citaciones-reportes?status=abierto"
          label="Abiertos"
          count={countsByStatus.get("abierto") ?? 0}
        />
        <TabLink
          active={status === "resuelto"}
          href="/admin/citaciones-reportes?status=resuelto"
          label="Resueltos"
          count={countsByStatus.get("resuelto") ?? 0}
        />
        <TabLink
          active={status === "descartado"}
          href="/admin/citaciones-reportes?status=descartado"
          label="Descartados"
          count={countsByStatus.get("descartado") ?? 0}
        />
      </nav>

      {reportes.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">
          {status === "abierto"
            ? "No hay reportes abiertos. Todo bajo control."
            : `No hay reportes con estado "${status}".`}
        </p>
      )}

      <ul className="space-y-3">
        {reportes.map((r) => {
          const isAutomatic = r.reportedById === "system";
          const reportante = reportantesMap.get(r.reportedById);
          const reasonLabel = REASON_LABELS[r.reason] ?? r.reason;
          const reasonCls =
            REASON_COLORS[r.reason] ?? "bg-gray-100 text-gray-900 border-gray-200";
          return (
            <li
              key={r.id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span
                  className={`inline-block px-2 py-0.5 text-[11px] uppercase tracking-wide font-medium border rounded ${reasonCls}`}
                >
                  {reasonLabel}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-gray-500">
                  {new Date(r.createdAt).toLocaleString("es-CL", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                {isAutomatic ? (
                  <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    SYSTEM
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-600">
                    Reportado por{" "}
                    {reportante
                      ? `${reportante.firstName} ${reportante.lastName}`
                      : "—"}
                  </span>
                )}
              </div>

              {r.details && (
                <p className="text-sm text-gray-700 mb-3 italic">
                  “{r.details}”
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm pt-3 border-t border-gray-100">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Cita citante
                  </p>
                  <Link
                    href={`/dashboard/diario/investigaciones/${r.citacion.citingInv.id}`}
                    target="_blank"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {r.citacion.citingInv.titulo}
                  </Link>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Por {r.citacion.citingInv.user.firstName}{" "}
                    {r.citacion.citingInv.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Cita citada
                    {isAutomatic && (
                      <span className="ml-1 text-amber-700">
                        ({r.citacion.citedInv.citationsInternal} citas internas)
                      </span>
                    )}
                  </p>
                  <Link
                    href={`/dashboard/diario/investigaciones/${r.citacion.citedInv.id}`}
                    target="_blank"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {r.citacion.citedInv.titulo}
                  </Link>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Por {r.citacion.citedInv.user.firstName}{" "}
                    {r.citacion.citedInv.user.lastName}
                  </p>
                </div>
              </div>

              {r.citacion.contextSnippet && (
                <p className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-700 italic">
                  Snippet: “{r.citacion.contextSnippet}”
                </p>
              )}

              {r.status === "abierto" && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <ReporteActions reporteId={r.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function TabLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm border-b-2 -mb-[1px] cursor-pointer transition-colors ${
        active
          ? "border-blue-600 text-blue-600 font-medium"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {label}
      <span
        className={`ml-1.5 inline-block px-1.5 rounded text-[11px] ${
          active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
