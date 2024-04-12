/*
  Warnings:

  - You are about to drop the column `ownedById` on the `Question` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_ownedById_fkey";

-- AlterTable
ALTER TABLE "Question" DROP COLUMN "ownedById";

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
