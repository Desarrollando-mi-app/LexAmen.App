import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CAUSA_QUESTIONS } from "@/lib/causa";
import { CausaViewer } from "./causa-viewer";

export default async function CausaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const causa = await prisma.causa.findUnique({
    where: { id },
    include: {
      challenger: {
        select: { id: true, firstName: true, lastName: true },
      },
      challenged: {
        select: { id: true, firstName: true, lastName: true },
      },
      winner: {
        select: { id: true, firstName: true, lastName: true },
      },
      answers: {
        orderBy: { questionIdx: "asc" },
        include: {
          mcq: {
            select: {
              id: true,
              question: true,
              optionA: true,
              optionB: true,
              optionC: true,
              optionD: true,
              correctOption: true,
            },
          },
        },
      },
    },
  });

  if (!causa) {
    redirect("/dashboard/causas");
  }

  const isParticipant =
    causa.challengerId === authUser.id || causa.challengedId === authUser.id;

  if (!isParticipant) {
    redirect("/dashboard/causas");
  }

  const opponentUser =
    causa.challengerId === authUser.id ? causa.challenged : causa.challenger;

  const myAnswers = causa.answers
    .filter((a) => a.userId === authUser.id)
    .map((a) => ({
      questionIdx: a.questionIdx,
      mcq: {
        id: a.mcq.id,
        question: a.mcq.question,
        optionA: a.mcq.optionA,
        optionB: a.mcq.optionB,
        optionC: a.mcq.optionC,
        optionD: a.mcq.optionD,
        correctOption: a.mcq.correctOption,
      },
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      timeMs: a.timeMs,
      score: a.score,
    }));

  const opponentAnswers = causa.answers
    .filter((a) => a.userId !== authUser.id)
    .map((a) => ({
      questionIdx: a.questionIdx,
      selectedOption: a.selectedOption,
      isCorrect: a.isCorrect,
      score: a.score,
    }));

  const myScore = myAnswers.reduce((sum, a) => sum + a.score, 0);
  const opponentScore = opponentAnswers.reduce((sum, a) => sum + a.score, 0);

  return (
    <CausaViewer
      causaId={causa.id}
      status={causa.status}
      opponentName={`${opponentUser.firstName} ${opponentUser.lastName}`}
      totalQuestions={CAUSA_QUESTIONS}
      myAnswers={myAnswers}
      opponentAnswers={causa.status === "COMPLETED" ? opponentAnswers : []}
      myScore={myScore}
      opponentScore={causa.status === "COMPLETED" ? opponentScore : 0}
      winnerId={causa.winner?.id ?? null}
      userId={authUser.id}
    />
  );
}
