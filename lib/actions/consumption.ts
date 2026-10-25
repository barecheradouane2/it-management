"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ConsumptionFormData = {
  deviceId: number;
  employeeId?: number | null;
  userId?: number | null;
  quantity: number;
  consumedAt?: string;
  note?: string;
};

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * Creates a consumption entry and deducts stock from the device.
 */
export async function createConsumption(
  formData: ConsumptionFormData
): Promise<ActionResult> {
  try {
    const qtyToConsume = Math.floor(Number(formData.quantity));
    if (isNaN(qtyToConsume) || qtyToConsume <= 0) {
      return { success: false, error: "Quantity must be at least 1." };
    }

    await prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({
        where: { id: Number(formData.deviceId) },
      });

      if (!device) {
        throw new Error("Device not found.");
      }

      if (device.qty < qtyToConsume) {
        throw new Error(
          `Insufficient stock. Available: ${device.qty}, requested: ${qtyToConsume}.`
        );
      }

      // Deduct quantity from device inventory
      await tx.device.update({
        where: { id: device.id },
        data: {
          qty: {
            decrement: qtyToConsume,
          },
        },
      });

      // Create consumption record
      await tx.consumption.create({
        data: {
          deviceId: device.id,
          employeeId: formData.employeeId ? Number(formData.employeeId) : null,
          userId: formData.userId ? Number(formData.userId) : null,
          quantity: qtyToConsume,
          consumedAt: formData.consumedAt ? new Date(formData.consumedAt) : new Date(),
          note: formData.note?.trim() || null,
        },
      });
    });

    revalidatePath("/consumptions");
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create consumption record.",
    };
  }
}

/**
 * Updates an existing consumption entry and reconciles device stock difference.
 */
export async function updateConsumption(
  id: number,
  formData: ConsumptionFormData
): Promise<ActionResult> {
  try {
    const newQty = Math.floor(Number(formData.quantity));
    if (isNaN(newQty) || newQty <= 0) {
      return { success: false, error: "Quantity must be at least 1." };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.consumption.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error("Consumption log not found.");
      }

      const newDeviceId = Number(formData.deviceId);
      const isSameDevice = existing.deviceId === newDeviceId;

      if (isSameDevice) {
        // Difference: positive means consuming more, negative means refunding
        const diff = newQty - existing.quantity;

        if (diff > 0) {
          const device = await tx.device.findUnique({
            where: { id: existing.deviceId },
          });

          if (!device || device.qty < diff) {
            throw new Error(
              `Insufficient additional stock. Available: ${device?.qty ?? 0}, needed: ${diff}.`
            );
          }
        }

        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            qty: {
              decrement: diff,
            },
          },
        });
      } else {
        // Returned old item stock
        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            qty: {
              increment: existing.quantity,
            },
          },
        });

        // Deduct new item stock
        const newDevice = await tx.device.findUnique({
          where: { id: newDeviceId },
        });

        if (!newDevice || newDevice.qty < newQty) {
          throw new Error(
            `Insufficient stock for the newly selected device. Available: ${newDevice?.qty ?? 0}.`
          );
        }

        await tx.device.update({
          where: { id: newDeviceId },
          data: {
            qty: {
              decrement: newQty,
            },
          },
        });
      }

      // Update consumption record
      await tx.consumption.update({
        where: { id },
        data: {
          deviceId: newDeviceId,
          employeeId: formData.employeeId ? Number(formData.employeeId) : null,
          userId: formData.userId ? Number(formData.userId) : null,
          quantity: newQty,
          consumedAt: formData.consumedAt ? new Date(formData.consumedAt) : existing.consumedAt,
          note: formData.note?.trim() || null,
        },
      });
    });

    revalidatePath("/consumptions");
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update consumption record.",
    };
  }
}

/**
 * Deletes consumption record and restores stock to device inventory.
 */
export async function deleteConsumption(id: number): Promise<ActionResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const consumption = await tx.consumption.findUnique({
        where: { id },
      });

      if (!consumption) {
        throw new Error("Consumption record not found.");
      }

      // Refund the quantity back to device stock
      await tx.device.update({
        where: { id: consumption.deviceId },
        data: {
          qty: {
            increment: consumption.quantity,
          },
        },
      });

      await tx.consumption.delete({
        where: { id },
      });
    });

    revalidatePath("/consumptions");
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete consumption record.",
    };
  }
}