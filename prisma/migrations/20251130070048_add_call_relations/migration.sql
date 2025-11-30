-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('VIDEO', 'AUDIO');

-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CallRoom" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "callType" "CallType" NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "sfuRoomId" TEXT,
    "sfuServerUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "isRecording" BOOLEAN NOT NULL DEFAULT false,
    "recordingUrl" TEXT,

    CONSTRAINT "CallRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallParticipant" (
    "id" TEXT NOT NULL,
    "callRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "transportId" TEXT,
    "producerIds" TEXT[],
    "consumerIds" TEXT[],
    "isAudioEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isVideoEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isScreenSharing" BOOLEAN NOT NULL DEFAULT false,
    "lastActiveAt" TIMESTAMP(3),
    "connectionQuality" TEXT,
    "packetLoss" DOUBLE PRECISION,
    "rtt" DOUBLE PRECISION,
    "jitter" DOUBLE PRECISION,
    "audioBytesSent" BIGINT,
    "audioBytesReceived" BIGINT,
    "videoBytesSent" BIGINT,
    "videoBytesReceived" BIGINT,

    CONSTRAINT "CallParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRoom_conversationId_idx" ON "CallRoom"("conversationId");

-- CreateIndex
CREATE INDEX "CallRoom_status_idx" ON "CallRoom"("status");

-- CreateIndex
CREATE INDEX "CallRoom_sfuRoomId_idx" ON "CallRoom"("sfuRoomId");

-- CreateIndex
CREATE INDEX "CallRoom_createdById_idx" ON "CallRoom"("createdById");

-- CreateIndex
CREATE INDEX "CallParticipant_callRoomId_idx" ON "CallParticipant"("callRoomId");

-- CreateIndex
CREATE INDEX "CallParticipant_userId_idx" ON "CallParticipant"("userId");

-- CreateIndex
CREATE INDEX "CallParticipant_lastActiveAt_idx" ON "CallParticipant"("lastActiveAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallParticipant_callRoomId_userId_key" ON "CallParticipant"("callRoomId", "userId");

-- AddForeignKey
ALTER TABLE "CallRoom" ADD CONSTRAINT "CallRoom_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRoom" ADD CONSTRAINT "CallRoom_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallParticipant" ADD CONSTRAINT "CallParticipant_callRoomId_fkey" FOREIGN KEY ("callRoomId") REFERENCES "CallRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
