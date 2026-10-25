/*
  Warnings:

  - You are about to drop the column `bureau` on the `Assignment` table. All the data in the column will be lost.
  - You are about to drop the column `siteProject` on the `Device` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Assignment_bureau_idx";

-- AlterTable
ALTER TABLE "Assignment" DROP COLUMN "bureau";

-- AlterTable
ALTER TABLE "Device" DROP COLUMN "siteProject",
ADD COLUMN     "location" TEXT;
