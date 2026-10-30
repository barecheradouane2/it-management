-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeviceType" ADD VALUE 'TRACEUR';
ALTER TYPE "DeviceType" ADD VALUE 'STATION';
ALTER TYPE "DeviceType" ADD VALUE 'SERVEUR';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_ALIMENTATION';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_VGA';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_HDMI';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_DISPLAYPORT';
ALTER TYPE "DeviceType" ADD VALUE 'BOITE_ALIMENTATION';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_ETHERNET_1M';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_ETHERNET_3M';
ALTER TYPE "DeviceType" ADD VALUE 'CLAVIER';
ALTER TYPE "DeviceType" ADD VALUE 'SOURIS';
ALTER TYPE "DeviceType" ADD VALUE 'CABLE_MALE_FEMELLE';
