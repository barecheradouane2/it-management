/*
  Warnings:

  - You are about to drop the column `hostName` on the `Assignment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "hostName";

-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "hostName" TEXT;
