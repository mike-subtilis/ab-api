/*
  Warnings:

  - You are about to drop the column `isVotingOpen` on the `Answer` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Answer" DROP COLUMN "isVotingOpen";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "isVotingOpen" BOOLEAN NOT NULL DEFAULT false;
