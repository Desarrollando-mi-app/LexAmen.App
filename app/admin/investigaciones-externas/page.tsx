// ─── /admin/investigaciones-externas — Panel admin ──────────────
//
// Lista citas externas con status='pendiente' para que la redacción
// las verifique o rechace. Layout admin (app/admin/layout.tsx) ya
// aplica el guard isAdmin; igual repetimos el chequeo como defensa
// en profundidad.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CitaExternaActions } from "./components/cita-externa-actions";

export const metadata = {
  title: "Citas externas · Pendientes — Admin",
};

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

type StatusFilter = "pendiente" | "verificada" | "rechazada";

export default async function AdminCitasExternasPage({
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
    sp.status === "verificada" || sp.status === "rechazada"
      ? sp.status
      : "pendiente";

  const items = await prisma.citacionExterna.findMany({
    where: { status },
    orderBy: { createdAt: status === "pendiente" ? "asc" : "desc" },
    take: 100,
    select: {
      id: true,
      citingTitle: true,
      citingAuthor: true,
      citingYear: true,
      citingSource: true,
      citingUrl: true,
      citingPdfUrl: true,
      status: true,
      reviewedAt: true,
      reviewNotes: true,
      createdAt: true,
      declaredById: true,
      investigacion: {
        select: {
          id: true,
          titulo: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  const declaredByIds = Array.from(new Set(items.map((i) => i.declaredById)));
  const declarantes = declaredByIds.length
    ? await prisma.user.findMany({
        where: { id: { in: declaredByIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const declarantesMap = new Map(declarantes.map((d) => [d.id, d]));

  const counts = await prisma.citacionExterna.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const countsByStatus = new Map(counts.map((c) => [c.status, c._count.id]));

  return (
    <main>
      <header className="mb-6 pb-4 border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Citaciones externas
        </h1>
        <p className="text-sm text-gray-600">
          Verificación de citas declaradas por autores. Cada acción queda
          registrada en AdminLog.
        </p>
      </header>

      {/* Tabs por estado */}
      <nav className="flex gap-1 mb-5 border-b border-gray-200">
        <TabLink
          active={status === "pendiente"}
          href="/admin/investigaciones-externas?status=pendiente"
          label="Pendientes"
          count={countsByStatus.get("pendiente") ?? 0}
        />
        <TabLink
          active={status === "verificada"}
          href="/admin/investigaciones-externas?status=verificada"
          label="Verificadas"
          count={countsByStatus.get("verificada") ?? 0}
        />
        <TabLink
          active={status === "rechazada"}
          href="/admin/investigaciones-externas?status=rechazada"
          label="Rechazadas"
          count={countsByStatus.get("rechazada") ?? 0}
        />
      </nav>

      {items.length === 0 && (
        <p className="py-12 text-center text-sm text-gray-500">
          {status === "pendiente"
            ? "No hay declaraciones pendientes. Todo al día."
            : `No hay declaraciones con estado "${status}".`}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((p) => {
          const declarante = declarantesMap.get(p.declaredById);
          return (
            <li
              key={p.id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <div className="flex justify-between items-start gap-4 mb-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
                    Declarada el{" "}
                    {new Date(p.createdAt).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {p.reviewedAt && (
                      <>
                        {" · Resuelta el "}
                        {new Date(p.reviewedAt).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "long",
                        })}
                      </>
                    )}
                  </p>
                  <h2 className="font-semibold text-base mb-0.5 text-gray-900">
                    {p.citingTitle}
                  </h2>
                  <p className="text-sm text-gray-700">
                    por {p.citingAuthor}
                    {p.citingYear ? ` · ${p.citingYear}` : ""}
                    {p.citingSource
                      ? ` · ${SOURCE_LABELS[p.citingSource] ?? p.citingSource}`
                      : ""}
                  </p>
                  {p.citingUrl && (
                    <a
                      href={p.citingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs text-blue-600 hover:underline break-all"
                    >
                      {p.citingUrl}
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-2 border-t border-gray-100 text-sm">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Investigación citada
                  </p>
                  <Link
                    href={`/dashboard/diario/investigaciones/${p.investigacion.id}`}
                    target="_blank"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {p.investigacion.titulo}
                  </Link>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Autor: {p.investigacion.user.firstName}{" "}
                    {p.investigacion.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-0.5">
                    Declarante
                  </p>
                  <p>
                    {declarante
                      ? `${declarante.firstName} ${declarante.lastName}`
                      : "—"}
                  </p>
                </div>
              </div>

              {p.status === "rechazada" && p.reviewNotes && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-900">
                  <strong>Motivo del rechazo:</strong> {p.reviewNotes}
                </div>
              )}

              {p.status === "pendiente" && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <CitaExternaActions
                    citaId={p.id}
                    hasPdf={!!p.citingPdfUrl}
                  />
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
