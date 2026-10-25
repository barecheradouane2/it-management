-- CreateTable
CREATE TABLE "Consumption" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER NOT NULL,
    "employeeId" INTEGER,
    "userId" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consumption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consumption_deviceId_idx" ON "Consumption"("deviceId");

-- CreateIndex
CREATE INDEX "Consumption_employeeId_idx" ON "Consumption"("employeeId");

-- CreateIndex
CREATE INDEX "Consumption_userId_idx" ON "Consumption"("userId");

-- CreateIndex
CREATE INDEX "Consumption_consumedAt_idx" ON "Consumption"("consumedAt");

-- AddForeignKey
ALTER TABLE "Consumption" ADD CONSTRAINT "Consumption_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumption" ADD CONSTRAINT "Consumption_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consumption" ADD CONSTRAINT "Consumption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
