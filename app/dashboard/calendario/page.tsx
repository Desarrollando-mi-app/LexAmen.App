import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CalendarioClient } from "./calendario-client";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const [events, user] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        userId: authUser.id,
        startDate: { gte: start, lte: end },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { examDate: true },
    }),
  ]);

  const serialized = events.map((e) => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-8">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1">
          Planificación · Calendario
        </p>
        <h1 className="font-cormorant text-[28px] !font-bold text-gz-ink leading-none">
          Calendario Personal
        </h1>
        <div className="mt-3 h-[2px] bg-gz-rule-dark" />
      </div>
      <CalendarioClient
        initialEvents={serialized}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
        examDate={user?.examDate?.toISOString() ?? null}
      />
    </div>
  );
}
