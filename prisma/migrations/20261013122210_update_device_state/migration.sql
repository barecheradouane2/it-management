/*
  Warnings:

  - The values [BUREAU_IT,TRANSFER,MAGASIN,ARCHIVES] on the enum `DeviceState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeviceState_new" AS ENUM ('en_Service', 'Transfert', 'en_Stock');
ALTER TABLE "public"."Device" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "Device" ALTER COLUMN "state" TYPE "DeviceState_new" USING ("state"::text::"DeviceState_new");
ALTER TYPE "DeviceState" RENAME TO "DeviceState_old";
ALTER TYPE "DeviceState_new" RENAME TO "DeviceState";
DROP TYPE "public"."DeviceState_old";
ALTER TABLE "Device" ALTER COLUMN "state" SET DEFAULT 'en_Stock';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeviceType" ADD VALUE 'Switch';
ALTER TYPE "DeviceType" ADD VALUE 'Hard_Disk';
ALTER TYPE "DeviceType" ADD VALUE 'Flash_Disk';

-- AlterTable
ALTER TABLE "Device" ALTER COLUMN "state" SET DEFAULT 'en_Stock';
