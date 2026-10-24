import dotenv from "dotenv";
dotenv.config();

import { prisma } from "../lib/prisma";
import { DeviceState } from "@prisma/client";

async function main() {
  const result = await prisma.device.updateMany({
    where: {
      state: {
        in: [DeviceState.en_Service, DeviceState.Transfert],
      },
    },
    data: {
      qty: 0,
    },
  });

  console.log(
    `Successfully updated ${result.count} devices in 'en_Service' or 'Transfert' to qty = 0.`
  );
}

main()
  .catch((e) => {
    console.error("Error updating devices:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });