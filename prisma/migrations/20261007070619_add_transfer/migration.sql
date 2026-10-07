-- CreateEnum
CREATE TYPE "MaterialNature" AS ENUM ('INVESTISSEMENT', 'CONSOMMABLE');

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "siteExpediteur" TEXT NOT NULL,
    "dateExpediteur" TIMESTAMP(3) NOT NULL,
    "siteDestinataire" TEXT NOT NULL,
    "dateDestinataire" TIMESTAMP(3),
    "nature" "MaterialNature" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferItem" (
    "id" SERIAL NOT NULL,
    "transferId" INTEGER NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Transfer_siteExpediteur_idx" ON "Transfer"("siteExpediteur");

-- CreateIndex
CREATE INDEX "Transfer_siteDestinataire_idx" ON "Transfer"("siteDestinataire");

-- CreateIndex
CREATE INDEX "Transfer_dateExpediteur_idx" ON "Transfer"("dateExpediteur");

-- CreateIndex
CREATE INDEX "TransferItem_transferId_idx" ON "TransferItem"("transferId");

-- CreateIndex
CREATE INDEX "TransferItem_deviceId_idx" ON "TransferItem"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferItem_transferId_deviceId_key" ON "TransferItem"("transferId", "deviceId");

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferItem" ADD CONSTRAINT "TransferItem_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
