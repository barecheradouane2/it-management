
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeviceState } from "@prisma/client";

export type TransferFormData = {
  siteExpediteur: string;
  dateExpediteur: string;
  siteDestinataire: string;
  dateDestinataire?: string;
  nature: string;
  note?: string;
  items: {
    deviceId: number;
    deviceType: string;
    quantity: number;
  }[];
};

// Validate transfer items
function validateItems(items: TransferFormData["items"]) {
  if (!items || items.length === 0) {
    return "Veuillez ajouter au moins un matériel.";
  }

  const seen = new Set<number>();

  for (const item of items) {
    const deviceId = Number(item.deviceId);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      return "Un matériel valide doit être sélectionné.";
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return "La quantité doit être supérieure à 0.";
    }

    if (seen.has(deviceId)) {
      return "Un même matériel ne peut pas être ajouté plusieurs fois.";
    }

    seen.add(deviceId);
  }

  return null;
}

// Validate required transfer fields
function validateTransferData(data: TransferFormData) {
  if (!data.siteExpediteur?.trim()) {
    return "Le site expéditeur est obligatoire.";
  }

  if (!data.siteDestinataire?.trim()) {
    return "Le site destinataire est obligatoire.";
  }

  if (!data.dateExpediteur || Number.isNaN(new Date(data.dateExpediteur).getTime())) {
    return "Une date d'expédition valide est obligatoire.";
  }

  if (
    data.dateDestinataire &&
    Number.isNaN(new Date(data.dateDestinataire).getTime())
  ) {
    return "La date de destination est invalide.";
  }

  if (!data.nature?.trim()) {
    return "La nature du transfert est obligatoire.";
  }

  return validateItems(data.items);
}

// Set device state after transfer items have been changed.
// If another transfer still references the device, it remains Transfert.
// Otherwise, it returns to en_Stock.
async function refreshDeviceState(
  tx: any,
  deviceId: number
) {
  const transferCount = await tx.transferItem.count({
    where: { deviceId },
  });

  await tx.device.update({
    where: { id: deviceId },
    data: {
      state:
        transferCount > 0
          ? DeviceState.Transfert
          : DeviceState.en_Stock,
    },
  });
}

// CREATE
export async function createTransfer(data: TransferFormData) {
  try {
    const validationError = validateTransferData(data);

    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const transfer = await prisma.$transaction(async (tx) => {
      const deviceIds = [
        ...new Set(data.items.map((item) => Number(item.deviceId))),
      ];

      // Check that all devices exist
      const devices = await tx.device.findMany({
        where: {
          id: { in: deviceIds },
        },
        select: {
          id: true,
          state: true,
          codeSarpi: true,
          type: true,
          brand: true,
          model: true,
        },
      });

      if (devices.length !== deviceIds.length) {
        throw new Error("Un ou plusieurs matériels sont introuvables.");
      }

      // Only devices in stock can be transferred
      const unavailableDevices = devices.filter(
        (device) => device.state !== DeviceState.en_Stock
      );

      if (unavailableDevices.length > 0) {
        const names = unavailableDevices
          .map(
            (device) =>
              `${device.codeSarpi || device.id} - ${device.type} ${device.brand} ${device.model || ""} (${device.state})`
          )
          .join(", ");

        throw new Error(
          `Transfert impossible. Ces matériels ne sont pas en stock : ${names}`
        );
      }

      // Create transfer and items
      const createdTransfer = await tx.transfer.create({
        data: {
          siteExpediteur: data.siteExpediteur.trim(),
          dateExpediteur: new Date(data.dateExpediteur),
          siteDestinataire: data.siteDestinataire.trim(),
          dateDestinataire: data.dateDestinataire
            ? new Date(data.dateDestinataire)
            : null,
          nature: data.nature as any,
          note: data.note?.trim() || null,
          items: {
            create: data.items.map((item) => ({
              deviceId: Number(item.deviceId),
              quantity: Number(item.quantity),
            })),
          },
        },
        include: {
          items: {
            include: {
              device: true,
            },
          },
        },
      });

      // Mark devices as transferred
      await tx.device.updateMany({
        where: {
          id: { in: deviceIds },
        },
        data: {
          state: DeviceState.Transfert,
        },
      });

      return createdTransfer;
    });

    revalidatePath("/transfers");
    revalidatePath("/devices");
    revalidatePath("/assignments");

    return {
      success: true,
      transfer,
    };
  } catch (error: any) {
    console.error("CREATE TRANSFER ERROR:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la création du transfert.",
    };
  }
}

// UPDATE
export async function updateTransfer(
  id: number,
  data: TransferFormData
) {
  try {
    const validationError = validateTransferData(data);

    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // Verify that the transfer exists
      const existingTransfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          items: {
            select: {
              deviceId: true,
            },
          },
        },
      });

      if (!existingTransfer) {
        throw new Error("Transfert introuvable.");
      }

      const oldDeviceIds = [
        ...new Set(existingTransfer.items.map((item) => item.deviceId)),
      ];

      const newDeviceIds = [
        ...new Set(data.items.map((item) => Number(item.deviceId))),
      ];

      // Devices already included in this transfer can remain.
      // Newly added devices must be in stock.
      const addedDeviceIds = newDeviceIds.filter(
        (deviceId) => !oldDeviceIds.includes(deviceId)
      );

      if (addedDeviceIds.length > 0) {
        const addedDevices = await tx.device.findMany({
          where: {
            id: { in: addedDeviceIds },
          },
          select: {
            id: true,
            state: true,
            codeSarpi: true,
            type: true,
            brand: true,
            model: true,
          },
        });

        if (addedDevices.length !== addedDeviceIds.length) {
          throw new Error("Un ou plusieurs matériels sont introuvables.");
        }

        const unavailableDevices = addedDevices.filter(
          (device) => device.state !== DeviceState.en_Stock
        );

        if (unavailableDevices.length > 0) {
          const names = unavailableDevices
            .map(
              (device) =>
                `${device.codeSarpi || device.id} - ${device.type} ${device.brand} ${device.model || ""} (${device.state})`
            )
            .join(", ");

          throw new Error(
            `Modification impossible. Ces matériels ne sont pas en stock : ${names}`
          );
        }
      }

      // Update transfer information
      const updatedTransfer = await tx.transfer.update({
        where: { id },
        data: {
          siteExpediteur: data.siteExpediteur.trim(),
          dateExpediteur: new Date(data.dateExpediteur),
          siteDestinataire: data.siteDestinataire.trim(),
          dateDestinataire: data.dateDestinataire
            ? new Date(data.dateDestinataire)
            : null,
          nature: data.nature as any,
          note: data.note?.trim() || null,
        },
      });

      // Replace the transfer items
      await tx.transferItem.deleteMany({
        where: { transferId: id },
      });

      await tx.transferItem.createMany({
        data: data.items.map((item) => ({
          transferId: id,
          deviceId: Number(item.deviceId),
          quantity: Number(item.quantity),
        })),
      });

      // Refresh the state of all affected devices
      const affectedDeviceIds = [
        ...new Set([...oldDeviceIds, ...newDeviceIds]),
      ];

      for (const deviceId of affectedDeviceIds) {
        await refreshDeviceState(tx, deviceId);
      }

      return updatedTransfer;
    });

    revalidatePath("/transfers");
    revalidatePath("/devices");
    revalidatePath("/assignments");

    return {
      success: true,
      transfer,
    };
  } catch (error: any) {
    console.error("UPDATE TRANSFER ERROR:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la modification du transfert.",
    };
  }
}

// DELETE
export async function deleteTransfer(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const items = await tx.transferItem.findMany({
        where: { transferId: id },
        select: {
          deviceId: true,
        },
      });

      const deviceIds = [
        ...new Set(items.map((item) => item.deviceId)),
      ];

      await tx.transfer.delete({
        where: { id },
      });

      // Restore affected devices to stock unless another transfer
      // still contains them.
      for (const deviceId of deviceIds) {
        await refreshDeviceState(tx, deviceId);
      }
    });

    revalidatePath("/transfers");
    revalidatePath("/devices");
    revalidatePath("/assignments");

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("DELETE TRANSFER ERROR:", error);

    return {
      success: false,
      error:
        error?.message || "Erreur lors de la suppression du transfert.",
    };
  }
}
