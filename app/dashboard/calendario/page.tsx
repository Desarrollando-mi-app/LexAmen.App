import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CalendarioClient } from "./calendario-client";
import Image from "next/image";

export default async function CalendarioPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Fetch last 60 days of study activity for streak calculation
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  sixtyDaysAgo.setHours(0, 0, 0, 0);

  const [events, countdowns, studyDays] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        userId: authUser.id,
        startDate: { gte: start, lte: end },
      },
      orderBy: { startDate: "asc" },
    }),
    prisma.userCountdown.findMany({
      where: { userId: authUser.id },
      orderBy: { fecha: "asc" },
    }),
    prisma.xpLog.findMany({
      where: {
        userId: authUser.id,
        category: { in: ["estudio", "simulacro"] },
        amount: { gt: 0 },
        createdAt: { gte: sixtyDaysAgo },
      },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Calculate streak
  const studyDaySet = new Set<string>();
  for (const log of studyDays) {
    const d = new Date(log.createdAt);
    studyDaySet.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
  }

  let currentStreak = 0;
  const checkDate = new Date();
  checkDate.setHours(0, 0, 0, 0);
  // Check if today has activity, if not start from yesterday
  const todayKey = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
  if (!studyDaySet.has(todayKey)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (true) {
    const key = `${checkDate.getFullYear()}-${checkDate.getMonth() + 1}-${checkDate.getDate()}`;
    if (studyDaySet.has(key)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate best streak
  let bestStreak = 0;
  let tempStreak = 0;
  const sortedDays = Array.from(studyDaySet).map((k) => {
    const [y, m, d] = k.split("-").map(Number);
    return new Date(y, m - 1, d).getTime();
  }).sort((a, b) => a - b);

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0 || sortedDays[i] - sortedDays[i - 1] === 86400000) {
      tempStreak++;
    } else {
      tempStreak = 1;
    }
    if (tempStreak > bestStreak) bestStreak = tempStreak;
  }

  // Auto-migrar examDate si no tiene countdown de grado
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { examDate: true },
  });
  if (user?.examDate && !countdowns.some((c) => c.isGrado)) {
    const newCountdown = await prisma.userCountdown.create({
      data: {
        userId: authUser.id,
        titulo: "Examen de Grado",
        fecha: user.examDate,
        color: "#c41a1a",
        isGrado: true,
      },
    });
    countdowns.push(newCountdown);
  }

  const serialized = events.map((e) => ({
    ...e,
    startDate: e.startDate.toISOString(),
    endDate: e.endDate?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  const serializedCountdowns = countdowns.map((c) => ({
    id: c.id,
    titulo: c.titulo,
    fecha: c.fecha.toISOString(),
    color: c.color,
    isGrado: c.isGrado,
  }));

  return (
    <div>
      <div className="gz-section-header px-4 sm:px-6 pt-8">
        <p className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-ink-light mb-1">
          Planificación · Calendario
        </p>
        <div className="flex items-center gap-3 mb-1">
          <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
          <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink leading-none">
            Calendario Personal
          </h1>
        </div>
        <div className="mt-3 h-[2px] bg-gz-rule-dark" />
      </div>
      <CalendarioClient
        initialEvents={serialized}
        initialMonth={now.getMonth() + 1}
        initialYear={now.getFullYear()}
        initialCountdowns={serializedCountdowns}
        initialStreak={currentStreak}
        initialBestStreak={bestStreak}
      />
    </div>
  );
}
