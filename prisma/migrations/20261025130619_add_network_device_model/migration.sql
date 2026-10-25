-- CreateTable
CREATE TABLE "NetworkDevice" (
    "id" SERIAL NOT NULL,
    "deviceId" INTEGER,
    "host" TEXT,
    "wifiSsid" TEXT,
    "wifiPassword" TEXT,
    "adminLogin" TEXT,
    "adminPassword" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NetworkDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NetworkDevice_deviceId_key" ON "NetworkDevice"("deviceId");

-- CreateIndex
CREATE INDEX "NetworkDevice_deviceId_idx" ON "NetworkDevice"("deviceId");

-- AddForeignKey
ALTER TABLE "NetworkDevice" ADD CONSTRAINT "NetworkDevice_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;
