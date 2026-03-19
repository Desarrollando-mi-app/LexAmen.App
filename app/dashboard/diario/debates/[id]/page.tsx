import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DebateDetail } from "./debate-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const debate = await prisma.debateJuridico.findUnique({
    where: { id },
    select: { titulo: true },
  });
  return {
    title: debate
      ? `${debate.titulo} — Debates — Studio Iuris`
      : "Debate no encontrado",
  };
}

export default async function DebateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const debate = await prisma.debateJuridico.findUnique({
    where: { id },
    include: {
      autor1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
      autor2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
    },
  });

  if (!debate) notFound();

  // Check if user has voted
  const voto = await prisma.debateVoto.findUnique({
    where: {
      debateId_userId: {
        debateId: id,
        userId: authUser.id,
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
      <DebateDetail
        debate={JSON.parse(JSON.stringify(debate))}
        userId={authUser.id}
        yaVotado={!!voto}
        votoPara={voto?.votoPara ?? null}
      />
    </div>
  );
}
