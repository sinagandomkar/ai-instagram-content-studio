-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "instagramUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "profilePictureUrl" TEXT,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'composio',
    "encryptedToken" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Credential_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AccountSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "following" INTEGER NOT NULL,
    "postsCount" INTEGER NOT NULL,
    "engagementRate" REAL NOT NULL,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT NOT NULL,
    "niche" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "creatorUsername" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "videoUrl" TEXT NOT NULL,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "publishDate" DATETIME,
    "estimatedEngagement" REAL,
    "transcript" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReelSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT NOT NULL,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReelSnapshot_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GeneratedContent_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StorySequence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorySequence_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryFrame" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storySequenceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "text" TEXT,
    "visualIdea" TEXT,
    "poll" TEXT,
    "questionBox" TEXT,
    "cta" TEXT,
    "sticker" TEXT,
    CONSTRAINT "StoryFrame_storySequenceId_fkey" FOREIGN KEY ("storySequenceId") REFERENCES "StorySequence" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT NOT NULL,
    "authorUsername" TEXT,
    "text" TEXT NOT NULL,
    "sentiment" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommentInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT NOT NULL,
    "painPoints" TEXT NOT NULL,
    "repeatedQuestions" TEXT NOT NULL,
    "desiredTopics" TEXT NOT NULL,
    "sentimentSplit" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PostingRecommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "bestDays" TEXT NOT NULL,
    "bestHours" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "reasoning" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostingRecommendation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedLibraryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reelId" TEXT NOT NULL,
    "notes" TEXT,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedLibraryItem_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "Reel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "researchModeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_instagramUserId_key" ON "Account"("instagramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_accountId_key" ON "Credential"("accountId");

-- CreateIndex
CREATE INDEX "AccountSnapshot_accountId_capturedAt_idx" ON "AccountSnapshot"("accountId", "capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reel_externalId_key" ON "Reel"("externalId");

-- CreateIndex
CREATE INDEX "Reel_niche_idx" ON "Reel"("niche");

-- CreateIndex
CREATE INDEX "ReelSnapshot_reelId_capturedAt_idx" ON "ReelSnapshot"("reelId", "capturedAt");

-- CreateIndex
CREATE INDEX "GeneratedContent_reelId_type_idx" ON "GeneratedContent"("reelId", "type");

-- CreateIndex
CREATE INDEX "StoryFrame_storySequenceId_order_idx" ON "StoryFrame"("storySequenceId", "order");

-- CreateIndex
CREATE INDEX "Comment_reelId_idx" ON "Comment"("reelId");

-- CreateIndex
CREATE UNIQUE INDEX "CommentInsight_reelId_key" ON "CommentInsight"("reelId");

-- CreateIndex
CREATE INDEX "PostingRecommendation_accountId_idx" ON "PostingRecommendation"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedLibraryItem_reelId_key" ON "SavedLibraryItem"("reelId");
