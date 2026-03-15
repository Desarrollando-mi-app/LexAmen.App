import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminSalaPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({ where: { id: authUser.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) redirect("/dashboard");

  const [
    reportesPendientes,
    publicacionesOcultas,
    eventosPendientes,
    ayudantiasActivas,
    pasantiasActivas,
    ofertasActivas,
    eventosAprobados,
    sesionesCompletadas,
  ] = await Promise.all([
    prisma.salaReporte.count({ where: { reviewStatus: "pendiente" } }),
    prisma.salaReporte.count({
      where: {
        reviewStatus: "pendiente",
        OR: [
          { ayudantia: { isHidden: true } },
          { pasantia: { isHidden: true } },
          { evento: { isHidden: true } },
          { oferta: { isHidden: true } },
        ],
      },
    }),
    prisma.eventoAcademico.count({ where: { approvalStatus: "pendiente", isActive: true } }),
    prisma.ayudantia.count({ where: { isActive: true, isHidden: false } }),
    prisma.pasantia.count({ where: { isActive: true, isHidden: false } }),
    prisma.ofertaTrabajo.count({ where: { isActive: true, isHidden: false } }),
    prisma.eventoAcademico.count({ where: { approvalStatus: "aprobado", isActive: true, isHidden: false, fecha: { gte: new Date() } } }),
    prisma.ayudantiaSesion.count({ where: { status: "completada" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium text-navy/50 uppercase tracking-wider">
          Administración
        </p>
        <h1 className="text-2xl font-bold text-navy">La Sala</h1>
      </div>

      {/* Reportes Pendientes */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">🚩</span>
          <h2 className="text-lg font-semibold text-navy">Reportes Pendientes</h2>
        </div>
        <div className="flex items-center gap-6 mt-3">
          <div>
            <p className="text-3xl font-bold text-red-600">{reportesPendientes}</p>
            <p className="text-sm text-navy/50">publicaciones con reportes sin revisar</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-500">{publicacionesOcultas}</p>
            <p className="text-sm text-navy/50">publicaciones auto-ocultadas</p>
          </div>
        </div>
        <Link
          href="/admin/sala/reportes"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-navy transition-colors"
        >
          Revisar reportes →
        </Link>
      </div>

      {/* Eventos Pendientes */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">📅</span>
          <h2 className="text-lg font-semibold text-navy">Eventos Pendientes</h2>
        </div>
        <p className="text-3xl font-bold text-gold mt-3">{eventosPendientes}</p>
        <p className="text-sm text-navy/50">eventos esperando aprobación</p>
        <Link
          href="/admin/sala/eventos"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-navy transition-colors"
        >
          Revisar eventos →
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">📊</span>
          <h2 className="text-lg font-semibold text-navy">Estadísticas</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-navy/5">
            <p className="text-2xl font-bold text-navy">{ayudantiasActivas}</p>
            <p className="text-xs text-navy/50">Ayudantías activas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-navy/5">
            <p className="text-2xl font-bold text-navy">{pasantiasActivas}</p>
            <p className="text-xs text-navy/50">Pasantías activas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-navy/5">
            <p className="text-2xl font-bold text-navy">{ofertasActivas}</p>
            <p className="text-xs text-navy/50">Ofertas activas</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-navy/5">
            <p className="text-2xl font-bold text-navy">{eventosAprobados}</p>
            <p className="text-xs text-navy/50">Eventos próximos</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-navy/5">
            <p className="text-2xl font-bold text-navy">{sesionesCompletadas}</p>
            <p className="text-xs text-navy/50">Sesiones completadas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
