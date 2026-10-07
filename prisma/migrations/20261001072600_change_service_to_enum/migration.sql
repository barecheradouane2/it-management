/*
  Warnings:

  - The `service` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Service" AS ENUM ('RH', 'BET', 'IT', 'QAQC', 'SMI', 'COMPTABLE', 'FINANCE', 'CND', 'COST', 'ENGINEERING', 'GDS', 'TOPO', 'PLANNING', 'HSE', 'LOGISTIC', 'ARCHIVES', 'CONSTRUCTION', 'DCC', 'SAS', 'OTHER');

-- AlterTable
ALTER TABLE "Employee" DROP COLUMN "service",
ADD COLUMN     "service" "Service";
