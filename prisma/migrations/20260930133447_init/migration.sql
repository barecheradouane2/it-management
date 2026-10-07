-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('UNITE', 'ECRAN', 'ONDULEUR', 'IMPRIMANTE', 'LAPTOP', 'DATASHOW');

-- CreateEnum
CREATE TYPE "DeviceCondition" AS ENUM ('NEUF', 'EN_PANNE', 'ANCIEN');

-- CreateEnum
CREATE TYPE "DeviceState" AS ENUM ('BUREAU_IT', 'TRANSFER', 'MAGASIN', 'ARCHIVES');

-- CreateEnum
CREATE TYPE "AssignmentCondition" AS ENUM ('NEUF', 'EN_PANNE', 'ANCIEN');

-- CreateEnum
CREATE TYPE "Block" AS ENUM ('BLOCK_SDR', 'BLOCK_DR', 'SPACE_R', 'SPACE_P', 'BASE_DE_VIE');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "fullname" TEXT NOT NULL,
    "function" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "service" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" SERIAL NOT NULL,
    "codeSarpi" TEXT NOT NULL,
    "serialNumber" TEXT,
    "type" "DeviceType" NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "arrivalDate" TIMESTAMP(3),
    "siteProject" TEXT,
    "condition" "DeviceCondition" NOT NULL DEFAULT 'NEUF',
    "state" "DeviceState" NOT NULL DEFAULT 'BUREAU_IT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "bureau" TEXT,
    "block" "Block",
    "hostName" TEXT,
    "condition" "AssignmentCondition" NOT NULL DEFAULT 'NEUF',
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Device_codeSarpi_key" ON "Device"("codeSarpi");

-- CreateIndex
CREATE UNIQUE INDEX "Device_serialNumber_key" ON "Device"("serialNumber");

-- CreateIndex
CREATE INDEX "Assignment_deviceId_idx" ON "Assignment"("deviceId");

-- CreateIndex
CREATE INDEX "Assignment_employeeId_idx" ON "Assignment"("employeeId");

-- CreateIndex
CREATE INDEX "Assignment_bureau_idx" ON "Assignment"("bureau");

-- CreateIndex
CREATE INDEX "Assignment_block_idx" ON "Assignment"("block");

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
