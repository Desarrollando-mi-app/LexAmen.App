-- CreateEnum BadgeSlug
CREATE TYPE "BadgeSlug" AS ENUM ('PASANTE', 'PROCURADOR', 'ABOGADO_LITIGANTE', 'PENALISTA_EN_SERIE', 'JURISCONSULTO_SEMANA', 'SOCIEDAD_DE_HECHO');

-- CreateTable UserBadge
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badge" "BadgeSlug" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserBadge_userId_badge_key" ON "UserBadge"("userId", "badge");

ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CausaRoom
CREATE TABLE "CausaRoom" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'individual',
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "maxPlayers" INT NOT NULL DEFAULT 10,
    "createdById" TEXT NOT NULL,
    "materia" TEXT,
    "difficulty" TEXT,
    "timeLimitSeconds" INT NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CausaRoom_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CausaRoom_status_idx" ON "CausaRoom"("status");

ALTER TABLE "CausaRoom" ADD CONSTRAINT "CausaRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CausaParticipant
CREATE TABLE "CausaParticipant" (
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INT NOT NULL DEFAULT 0,
    "position" INT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CausaParticipant_pkey" PRIMARY KEY ("roomId", "userId")
);

ALTER TABLE "CausaParticipant" ADD CONSTRAINT "CausaParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CausaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaParticipant" ADD CONSTRAINT "CausaParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CausaRoomQuestion
CREATE TABLE "CausaRoomQuestion" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "mcqId" TEXT NOT NULL,
    "questionIndex" INT NOT NULL,
    CONSTRAINT "CausaRoomQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CausaRoomQuestion_roomId_questionIndex_key" ON "CausaRoomQuestion"("roomId", "questionIndex");

ALTER TABLE "CausaRoomQuestion" ADD CONSTRAINT "CausaRoomQuestion_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CausaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaRoomQuestion" ADD CONSTRAINT "CausaRoomQuestion_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "MCQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CausaRoomAnswer
CREATE TABLE "CausaRoomAnswer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcqId" TEXT NOT NULL,
    "questionIndex" INT NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    "timeMs" INT,
    "score" INT NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CausaRoomAnswer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CausaRoomAnswer_roomId_userId_questionIndex_key" ON "CausaRoomAnswer"("roomId", "userId", "questionIndex");

ALTER TABLE "CausaRoomAnswer" ADD CONSTRAINT "CausaRoomAnswer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "CausaRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaRoomAnswer" ADD CONSTRAINT "CausaRoomAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaRoomAnswer" ADD CONSTRAINT "CausaRoomAnswer_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "MCQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
