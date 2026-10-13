-- CreateEnum
CREATE TYPE "SupplyRequestStatus" AS ENUM ('BROUILLON', 'EN_ATTENTE', 'APPROUVEE', 'PARTIELLEMENT_APPROUVEE', 'REJETEE', 'LIVREE');

-- CreateTable
CREATE TABLE "SupplyRequest" (
    "id" SERIAL NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desiredDeadline" TIMESTAMP(3),
    "status" "SupplyRequestStatus" NOT NULL DEFAULT 'BROUILLON',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyRequestItem" (
    "id" SERIAL NOT NULL,
    "supplyRequestId" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "referenceCode" TEXT,
    "unit" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER,
    "desiredAvailability" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplyRequest_requestNumber_key" ON "SupplyRequest"("requestNumber");

-- CreateIndex
CREATE INDEX "SupplyRequest_requestDate_idx" ON "SupplyRequest"("requestDate");

-- CreateIndex
CREATE INDEX "SupplyRequest_status_idx" ON "SupplyRequest"("status");

-- CreateIndex
CREATE INDEX "SupplyRequestItem_supplyRequestId_idx" ON "SupplyRequestItem"("supplyRequestId");

-- CreateIndex
CREATE INDEX "SupplyRequestItem_designation_idx" ON "SupplyRequestItem"("designation");

-- AddForeignKey
ALTER TABLE "SupplyRequestItem" ADD CONSTRAINT "SupplyRequestItem_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "SupplyRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
