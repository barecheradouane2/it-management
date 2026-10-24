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

// ----------------------------------------------------------------------
// 1. CREATE TRANSFER
// ----------------------------------------------------------------------
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

      // Fetch all referenced devices
      const devices = await tx.device.findMany({
        where: { id: { in: deviceIds } },
        select: {
          id: true,
          qty: true,
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

      const deviceMap = new Map(devices.map((d) => [d.id, d]));

      // Check stock availability (requested quantity must not exceed device.qty)
      for (const item of data.items) {
        const device = deviceMap.get(Number(item.deviceId))!;
        const requestedQty = Number(item.quantity);

        if (device.qty < requestedQty) {
          const deviceLabel = `${device.codeSarpi ? `[${device.codeSarpi}] ` : ""}${device.type} ${device.brand} ${device.model || ""}`.trim();
          throw new Error(
            `Quantité insuffisante pour "${deviceLabel}". Disponible: ${device.qty}, demandée: ${requestedQty}.`
          );
        }
      }

      // Deduct quantity and update state per device
      for (const item of data.items) {
        const device = deviceMap.get(Number(item.deviceId))!;
        const requestedQty = Number(item.quantity);
        const remainingQty = device.qty - requestedQty;

        await tx.device.update({
          where: { id: device.id },
          data: {
            qty: { decrement: requestedQty },
            state: remainingQty > 0 ? DeviceState.en_Stock : DeviceState.Transfert,
          },
        });
      }

      // Create the transfer record with items
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
      error: error?.message || "Erreur lors de la création du transfert.",
    };
  }
}

// ----------------------------------------------------------------------
// 2. UPDATE TRANSFER
// ----------------------------------------------------------------------
export async function updateTransfer(id: number, data: TransferFormData) {
  try {
    const validationError = validateTransferData(data);

    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const transfer = await prisma.$transaction(async (tx) => {
      // Find existing transfer and its current items
      const existingTransfer = await tx.transfer.findUnique({
        where: { id },
        include: {
          items: true,
        },
      });

      if (!existingTransfer) {
        throw new Error("Transfert introuvable.");
      }

      const oldItemMap = new Map<number, number>();
      for (const item of existingTransfer.items) {
        oldItemMap.set(item.deviceId, item.quantity);
      }

      const newItemMap = new Map<number, number>();
      for (const item of data.items) {
        newItemMap.set(Number(item.deviceId), Number(item.quantity));
      }

      // Collect all affected device IDs (both previous and updated)
      const allDeviceIds = [
        ...new Set([...oldItemMap.keys(), ...newItemMap.keys()]),
      ];

      const devices = await tx.device.findMany({
        where: { id: { in: allDeviceIds } },
        select: {
          id: true,
          qty: true,
          codeSarpi: true,
          type: true,
          brand: true,
          model: true,
        },
      });

      const deviceMap = new Map(devices.map((d) => [d.id, d]));

      // Verify that all stock adjustments are valid before making updates
      for (const deviceId of allDeviceIds) {
        const device = deviceMap.get(deviceId);
        if (!device) {
          throw new Error("Un ou plusieurs matériels sont introuvables.");
        }

        const oldQty = oldItemMap.get(deviceId) ?? 0;
        const newQty = newItemMap.get(deviceId) ?? 0;
        const delta = newQty - oldQty; // >0 means we need more stock, <0 means we restore stock

        if (delta > 0 && device.qty < delta) {
          const deviceLabel = `${device.codeSarpi ? `[${device.codeSarpi}] ` : ""}${device.type} ${device.brand} ${device.model || ""}`.trim();
          throw new Error(
            `Stock insuffisant pour "${deviceLabel}". Disponible: ${device.qty}, supplément demandé: ${delta}.`
          );
        }
      }

      // Apply quantity changes and update device state
      for (const deviceId of allDeviceIds) {
        const device = deviceMap.get(deviceId)!;
        const oldQty = oldItemMap.get(deviceId) ?? 0;
        const newQty = newItemMap.get(deviceId) ?? 0;
        const delta = newQty - oldQty;

        if (delta !== 0) {
          const updatedDevice = await tx.device.update({
            where: { id: deviceId },
            data: {
              qty: { decrement: delta },
            },
            select: { qty: true },
          });

          await tx.device.update({
            where: { id: deviceId },
            data: {
              state: updatedDevice.qty > 0 ? DeviceState.en_Stock : DeviceState.Transfert,
            },
          });
        }
      }

      // Update transfer metadata
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

      // Recreate transfer items
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
      error: error?.message || "Erreur lors de la modification du transfert.",
    };
  }
}

// ----------------------------------------------------------------------
// 3. DELETE TRANSFER
// ----------------------------------------------------------------------
export async function deleteTransfer(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      // Find items in the transfer to know how many to restore
      const items = await tx.transferItem.findMany({
        where: { transferId: id },
        select: {
          deviceId: true,
          quantity: true,
        },
      });

      // Delete the transfer record (and items cascade or get deleted)
      await tx.transfer.delete({
        where: { id },
      });

      // Restore device quantities and return state to en_Stock
      for (const item of items) {
        await tx.device.update({
          where: { id: item.deviceId },
          data: {
            qty: { increment: item.quantity },
            state: DeviceState.en_Stock,
          },
        });
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
      error: error?.message || "Erreur lors de la suppression du transfert.",
    };
  }
}