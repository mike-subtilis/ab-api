-- CreateEnum
CREATE TYPE "Publicity" AS ENUM ('private', 'public', 'anonymous');

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "prefix" TEXT,
    "metric" TEXT,
    "subject" TEXT,
    "publicity" "Publicity" NOT NULL DEFAULT 'private',
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "ownedById" TEXT NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "text" TEXT,
    "publicity" "Publicity" NOT NULL DEFAULT 'private',

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "key" TEXT NOT NULL,
    "display" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "etag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "auth0UserId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_QuestionToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_FavoriteQuestions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AnswerToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_AnswerToQuestion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_display_key" ON "Tag"("display");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_QuestionToTag_AB_unique" ON "_QuestionToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_QuestionToTag_B_index" ON "_QuestionToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_FavoriteQuestions_AB_unique" ON "_FavoriteQuestions"("A", "B");

-- CreateIndex
CREATE INDEX "_FavoriteQuestions_B_index" ON "_FavoriteQuestions"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AnswerToTag_AB_unique" ON "_AnswerToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_AnswerToTag_B_index" ON "_AnswerToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_AnswerToQuestion_AB_unique" ON "_AnswerToQuestion"("A", "B");

-- CreateIndex
CREATE INDEX "_AnswerToQuestion_B_index" ON "_AnswerToQuestion"("B");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_ownedById_fkey" FOREIGN KEY ("ownedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestionToTag" ADD CONSTRAINT "_QuestionToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_QuestionToTag" ADD CONSTRAINT "_QuestionToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteQuestions" ADD CONSTRAINT "_FavoriteQuestions_A_fkey" FOREIGN KEY ("A") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FavoriteQuestions" ADD CONSTRAINT "_FavoriteQuestions_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerToTag" ADD CONSTRAINT "_AnswerToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerToTag" ADD CONSTRAINT "_AnswerToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerToQuestion" ADD CONSTRAINT "_AnswerToQuestion_A_fkey" FOREIGN KEY ("A") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnswerToQuestion" ADD CONSTRAINT "_AnswerToQuestion_B_fkey" FOREIGN KEY ("B") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
