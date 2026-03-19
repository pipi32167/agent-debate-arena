-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseURL" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "models" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "participants" TEXT NOT NULL,
    "rounds" TEXT NOT NULL,
    "currentRoundIndex" INTEGER NOT NULL DEFAULT 0,
    "currentMatchIndex" INTEGER NOT NULL DEFAULT 0,
    "winners" TEXT NOT NULL,
    "champion" TEXT,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "maxDebateRounds" INTEGER NOT NULL DEFAULT 3
);

-- CreateTable
CREATE TABLE "tournament_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tournamentId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "description" TEXT,
    "participants" TEXT NOT NULL,
    "rounds" TEXT NOT NULL,
    "champion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "tournament_history_createdAt_idx" ON "tournament_history"("createdAt");
