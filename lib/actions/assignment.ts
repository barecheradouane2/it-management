"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeviceState, DeviceType, AssignmentCondition, Block } from "@prisma/client";

export interface AssignmentFormData {
  deviceId: number;
  employeeId: number;
  bureau?: string | null;
  block?: Block | string | null;
  hostName?: string | null;
  condition: AssignmentCondition;
  note?: string | null;
  assignedAt: string | Date;
  returnedAt?: string | Date | null;
  qty: number;
}

const BULK_DEVICE_TYPES: DeviceType[] = [
  DeviceType.FLASH_DISK,
  DeviceType.ADAPTATEUR_WIFI,
  DeviceType.HARD_DISK_EXTERN,
];

function isBulkDevice(type: DeviceType): boolean {
  return BULK_DEVICE_TYPES.includes(type);
}

// ----------------------------------------------------------------------
// 1. CREATE ASSIGNMENT
// ----------------------------------------------------------------------
export async function createAssignment(data: AssignmentFormData) {
  try {
    const requestedQty = data.qty && data.qty > 0 ? Number(data.qty) : 1;

    const assignment = await prisma.$transaction(async (tx) => {
      const device = await tx.device.findUnique({
        where: { id: data.deviceId },
        select: {
          id: true,
          type: true,
          state: true,
          qty: true,
        },
      });

      if (!device) {
        throw new Error("DEVICE_NOT_FOUND");
      }

      const isBulk = isBulkDevice(device.type);

      if (isBulk) {
        if (device.qty < requestedQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const remainingQty = device.qty - requestedQty;

        await tx.device.update({
          where: { id: device.id },
          data: {
            qty: { decrement: requestedQty },
            state: remainingQty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
          },
        });
      } else {
        if (device.state !== DeviceState.en_Stock) {
          throw new Error("DEVICE_NOT_IN_STOCK");
        }

        await tx.device.update({
          where: { id: device.id },
          data: {
            state: DeviceState.en_Service,
          },
        });
      }

      const newAssignment = await tx.assignment.create({
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          qty: isBulk ? requestedQty : 1,
          bureau: data.bureau || null,
          block: (data.block as Block) || null,
          hostName: data.hostName || null,
          condition: data.condition || AssignmentCondition.NEUF,
          note: data.note || null,
          assignedAt: data.assignedAt ? new Date(data.assignedAt) : new Date(),
          returnedAt: data.returnedAt ? new Date(data.returnedAt) : null,
        },
      });

      return newAssignment;
    });

    revalidatePath("/assignments");
    revalidatePath("/devices");
    revalidatePath("/employees");

    return { success: true, assignment };
  } catch (error) {
    console.error("Error creating assignment:", error);

    if (error instanceof Error) {
      if (error.message === "DEVICE_NOT_FOUND") {
        return { success: false, error: "Device not found." };
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return { success: false, error: "Insufficient quantity available in stock." };
      }
      if (error.message === "DEVICE_NOT_IN_STOCK") {
        return { success: false, error: "Assignment not allowed: device is not in stock." };
      }
    }

    return { success: false, error: "Failed to create assignment." };
  }
}

// ----------------------------------------------------------------------
// 2. UPDATE ASSIGNMENT
// ----------------------------------------------------------------------
export async function updateAssignment(id: number, data: AssignmentFormData) {
  try {
    const assignment = await prisma.$transaction(async (tx) => {
      const existing = await tx.assignment.findUnique({
        where: { id },
        include: { device: true },
      });

      if (!existing) {
        throw new Error("ASSIGNMENT_NOT_FOUND");
      }

      const returnedAt = data.returnedAt ? new Date(data.returnedAt) : null;
      const isBulk = isBulkDevice(existing.device.type);
      const newQty = isBulk ? (data.qty && data.qty > 0 ? Number(data.qty) : 1) : 1;
      const oldQty = existing.qty;

      if (isBulk) {
        const wasReturned = Boolean(existing.returnedAt);
        const isNowReturned = Boolean(returnedAt);

        if (!wasReturned && isNowReturned) {
          await tx.device.update({
            where: { id: existing.deviceId },
            data: {
              qty: { increment: oldQty },
              state: DeviceState.en_Stock,
            },
          });
        } else if (wasReturned && !isNowReturned) {
          if (existing.device.qty < newQty) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          const remainingQty = existing.device.qty - newQty;
          await tx.device.update({
            where: { id: existing.deviceId },
            data: {
              qty: { decrement: newQty },
              state: remainingQty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
            },
          });
        } else if (!wasReturned && !isNowReturned) {
          const qtyDelta = newQty - oldQty;

          if (qtyDelta > 0 && existing.device.qty < qtyDelta) {
            throw new Error("INSUFFICIENT_STOCK");
          }

          const updatedDevice = await tx.device.update({
            where: { id: existing.deviceId },
            data: {
              qty: { decrement: qtyDelta },
            },
            select: { qty: true },
          });

          await tx.device.update({
            where: { id: existing.deviceId },
            data: {
              state: updatedDevice.qty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
            },
          });
        }
      } else {
        await tx.device.update({
          where: { id: data.deviceId },
          data: {
            state: returnedAt ? DeviceState.en_Stock : DeviceState.en_Service,
          },
        });
      }

      const updatedAssignment = await tx.assignment.update({
        where: { id },
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          qty: newQty,
          bureau: data.bureau || null,
          block: (data.block as Block) || null,
          hostName: data.hostName || null,
          condition: data.condition,
          note: data.note || null,
          assignedAt: data.assignedAt ? new Date(data.assignedAt) : new Date(),
          returnedAt,
        },
      });

      return updatedAssignment;
    });

    revalidatePath("/assignments");
    revalidatePath("/devices");
    revalidatePath("/employees");

    return { success: true, assignment };
  } catch (error) {
    console.error("Error updating assignment:", error);

    if (error instanceof Error) {
      if (error.message === "ASSIGNMENT_NOT_FOUND") {
        return { success: false, error: "Assignment not found." };
      }
      if (error.message === "INSUFFICIENT_STOCK") {
        return { success: false, error: "Insufficient quantity available in stock." };
      }
    }

    return { success: false, error: "Failed to update assignment." };
  }
}

// ----------------------------------------------------------------------
// 3. DELETE ASSIGNMENT
// ----------------------------------------------------------------------
export async function deleteAssignment(id: number) {
  try {
    await prisma.$transaction(async (tx) => {
      const assignment = await tx.assignment.findUnique({
        where: { id },
        include: { device: true },
      });

      if (!assignment) {
        throw new Error("ASSIGNMENT_NOT_FOUND");
      }

      const isBulk = isBulkDevice(assignment.device.type);

      await tx.assignment.delete({
        where: { id },
      });

      if (isBulk) {
        if (!assignment.returnedAt) {
          await tx.device.update({
            where: { id: assignment.deviceId },
            data: {
              qty: { increment: assignment.qty },
              state: DeviceState.en_Stock,
            },
          });
        }
      } else {
        const remainingActiveAssignments = await tx.assignment.count({
          where: {
            deviceId: assignment.deviceId,
            returnedAt: null,
          },
        });

        if (remainingActiveAssignments === 0) {
          await tx.device.update({
            where: { id: assignment.deviceId },
            data: {
              state: DeviceState.en_Stock,
            },
          });
        }
      }
    });

    revalidatePath("/assignments");
    revalidatePath("/devices");
    revalidatePath("/employees");

    return { success: true };
  } catch (error) {
    console.error("Error deleting assignment:", error);

    if (error instanceof Error && error.message === "ASSIGNMENT_NOT_FOUND") {
      return { success: false, error: "Assignment not found." };
    }

    return { success: false, error: "Failed to delete assignment." };
  }
}