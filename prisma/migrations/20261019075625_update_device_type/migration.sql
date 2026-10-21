/*
  Warnings:

  - The values [Switch,Hard_Disk,Flash_Disk,Toner,Batterie] on the enum `DeviceType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DeviceType_new" AS ENUM ('UNITE', 'ECRAN', 'ONDULEUR', 'IMPRIMANTE', 'LAPTOP', 'DATASHOW', 'POINT_ACCES', 'SWITCH', 'HARD_DISK', 'FLASH_DISK', 'TONER', 'BATTERIE');
ALTER TABLE "Device" ALTER COLUMN "type" TYPE "DeviceType_new" USING ("type"::text::"DeviceType_new");
ALTER TYPE "DeviceType" RENAME TO "DeviceType_old";
ALTER TYPE "DeviceType_new" RENAME TO "DeviceType";
DROP TYPE "public"."DeviceType_old";
COMMIT;
