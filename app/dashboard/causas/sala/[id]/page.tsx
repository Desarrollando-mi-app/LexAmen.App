import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { roomIdToCode, ROOM_QUESTIONS } from "@/lib/causa-room";
import { SalaViewer } from "./sala-viewer";

export default async function SalaPage({
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

  const room = await prisma.causaRoom.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      participants: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      questions: {
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
              explanation: true,
            },
          },
        },
        orderBy: { questionIndex: "asc" },
      },
      answers: {
        where: { userId: authUser.id },
        orderBy: { questionIndex: "asc" },
      },
    },
  });

  if (!room) {
    redirect("/dashboard/causas");
  }

  // Verificar participante
  const isParticipant = room.participants.some(
    (p) => p.user.id === authUser.id
  );

  if (!isParticipant) {
    redirect("/dashboard/causas");
  }

  const code = roomIdToCode(room.id);

  // Serializar datos
  const serializedParticipants = room.participants.map((p) => ({
    userId: p.user.id,
    name: `${p.user.firstName} ${p.user.lastName}`,
    score: p.score,
    position: p.position,
  }));

  const serializedQuestions =
    room.status !== "lobby"
      ? room.questions.map((q) => ({
          questionIndex: q.questionIndex,
          mcq: {
            id: q.mcq.id,
            question: q.mcq.question,
            optionA: q.mcq.optionA,
            optionB: q.mcq.optionB,
            optionC: q.mcq.optionC,
            optionD: q.mcq.optionD,
            // Solo revelar correctOption si finished
            ...(room.status === "finished" && {
              correctOption: q.mcq.correctOption,
              explanation: q.mcq.explanation,
            }),
          },
        }))
      : [];

  const serializedMyAnswers = room.answers.map((a) => ({
    questionIndex: a.questionIndex,
    selectedOption: a.selectedOption,
    isCorrect: a.isCorrect,
    score: a.score,
    timeMs: a.timeMs,
  }));

  return (
    <SalaViewer
      roomId={room.id}
      code={code}
      status={room.status}
      maxPlayers={room.maxPlayers}
      totalQuestions={ROOM_QUESTIONS}
      createdById={room.createdBy.id}
      creatorName={`${room.createdBy.firstName} ${room.createdBy.lastName}`}
      userId={authUser.id}
      participants={serializedParticipants}
      questions={serializedQuestions}
      myAnswers={serializedMyAnswers}
    />
  );
}
