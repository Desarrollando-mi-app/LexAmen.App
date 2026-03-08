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
    <CalendarioClient
      initialEvents={serialized}
      initialMonth={now.getMonth() + 1}
      initialYear={now.getFullYear()}
      examDate={user?.examDate?.toISOString() ?? null}
    />
  );
}
