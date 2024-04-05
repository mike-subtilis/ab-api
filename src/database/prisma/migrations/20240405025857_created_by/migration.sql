/*
  Warnings:

  - Added the required column `createdBy` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `Answer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `Question` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdBy` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedBy` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Answer" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdBy" TEXT NOT NULL,
ADD COLUMN     "updatedBy" TEXT NOT NULL;
