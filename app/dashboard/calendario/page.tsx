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

  // Romano del año para el masthead.
  const yearRoman = toRoman(now.getFullYear());

  // Cita rotada por mes — colección clásica jurídica.
  const cita = CITAS_JURIDICAS[now.getMonth() % CITAS_JURIDICAS.length];

  return (
    <div>
      <div className="gz-section-header px-4 sm:px-6 pt-8 pb-2 relative overflow-hidden">
        {/* Ornamento decorativo de fondo */}
        <div className="absolute top-2 right-3 sm:right-6 font-cormorant text-[120px] leading-none text-gz-ink/[0.04] select-none pointer-events-none">
          ✠
        </div>

        <p className="font-ibm-mono text-[10px] uppercase tracking-[2.5px] text-gz-ink-light mb-2 flex items-center gap-2">
          <span className="text-gz-gold">❡</span>
          Cuaderno de Bitácora
          <span className="text-gz-rule-dark">·</span>
          Año {yearRoman}
        </p>
        <div className="flex items-end gap-3 mb-2">
          <Image
            src="/brand/logo-sello.svg"
            alt="Studio Iuris"
            width={80}
            height={80}
            className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]"
          />
          <h1 className="font-cormorant text-[38px] lg:text-[48px] font-bold text-gz-ink leading-none tracking-tight">
            Calendario <span className="text-gz-burgundy italic">Personal</span>
          </h1>
        </div>

        {/* Cita celebre rotada por mes */}
        <p className="mt-3 max-w-[640px] font-cormorant italic text-[14px] sm:text-[15px] text-gz-ink-mid leading-relaxed">
          &ldquo;{cita.texto}&rdquo;
          <span className="ml-2 font-ibm-mono not-italic text-[10px] uppercase tracking-[1.5px] text-gz-ink-light">
            — {cita.autor}
          </span>
        </p>

        {/* Doble regla editorial */}
        <div className="mt-4 h-[2px] bg-gz-ink/80" />
        <div className="h-px bg-gz-ink/80 mt-[3px]" />
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

// ─── Helpers locales ────────────────────────────────────────

function toRoman(num: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) { out += s; n -= v; }
  }
  return out;
}

const CITAS_JURIDICAS: { texto: string; autor: string }[] = [
  { texto: "Ubi societas, ibi ius. Donde hay sociedad, hay derecho.", autor: "Aforismo romano" },
  { texto: "El derecho es la ciencia de lo justo y de lo injusto.", autor: "Ulpiano" },
  { texto: "La justicia es la constante y perpetua voluntad de dar a cada uno lo suyo.", autor: "Justiniano" },
  { texto: "Donde la ley no distingue, no debemos distinguir nosotros.", autor: "Aforismo" },
  { texto: "Sin disciplina cotidiana no hay obra duradera.", autor: "Andrés Bello" },
  { texto: "Audiatur et altera pars. Óigase también a la otra parte.", autor: "Aforismo procesal" },
  { texto: "El tiempo es la materia con que está hecha la vida.", autor: "Benjamin Franklin" },
  { texto: "Dura lex, sed lex. La ley es dura, pero es la ley.", autor: "Aforismo romano" },
  { texto: "El estudio sin método produce poco fruto, el método sin estudio ninguno.", autor: "Andrés Bello" },
  { texto: "La constancia vence lo que la dicha no alcanza.", autor: "Bolívar" },
  { texto: "In claris non fit interpretatio. Lo claro no requiere interpretación.", autor: "Aforismo" },
  { texto: "El derecho no nace del hecho sino de la razón.", autor: "Hugo Grocio" },
];
