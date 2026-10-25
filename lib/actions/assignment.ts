"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DeviceState, AssignmentCondition, Block } from "@prisma/client";

export interface AssignmentFormData {
  deviceId: number;
  employeeId: number;
  location?: string | null; // Updates Device.location
  block?: Block | string | null;
  hostName?: string | null;
  condition: AssignmentCondition;
  note?: string | null;
  assignedAt: string | Date;
  returnedAt?: string | Date | null;
  qty: number;
}

// ----------------------------------------------------------------------
// 1. CREATE ASSIGNMENT
// ----------------------------------------------------------------------
export async function createAssignment(data: AssignmentFormData) {
  try {
    const requestedQty = data.qty && data.qty > 0 ? Number(data.qty) : 1;

    const assignment = await prisma.$transaction(async (tx) => {
      // 1. Verify device exists and check stock
      const device = await tx.device.findUnique({
        where: { id: data.deviceId },
        select: {
          id: true,
          state: true,
          qty: true,
        },
      });

      if (!device) {
        throw new Error("DEVICE_NOT_FOUND");
      }

      if (device.qty < requestedQty) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const remainingQty = device.qty - requestedQty;

      // 2. Decrement device stock, set state, and update device location
      await tx.device.update({
        where: { id: device.id },
        data: {
          qty: { decrement: requestedQty },
          state: remainingQty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
          location: data.location?.trim() || null,
        },
      });

      // 3. Create assignment record without bureau
      const newAssignment = await tx.assignment.create({
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          qty: requestedQty,
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
      // 1. Fetch existing assignment with device details
      const existing = await tx.assignment.findUnique({
        where: { id },
        include: { device: true },
      });

      if (!existing) {
        throw new Error("ASSIGNMENT_NOT_FOUND");
      }

      const returnedAt = data.returnedAt ? new Date(data.returnedAt) : null;
      const newQty = data.qty && data.qty > 0 ? Number(data.qty) : 1;
      const oldQty = existing.qty;

      const wasReturned = Boolean(existing.returnedAt);
      const isNowReturned = Boolean(returnedAt);

      // 2. Manage stock restoration or deduction across devices
      if (!wasReturned && isNowReturned) {
        // Device returned: return assigned quantity back to inventory
        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            qty: { increment: oldQty },
            state: DeviceState.en_Stock,
            location: data.location?.trim() || null,
          },
        });
      } else if (wasReturned && !isNowReturned) {
        // Re-activated assignment: deduct new quantity from inventory
        if (existing.device.qty < newQty) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const remainingQty = existing.device.qty - newQty;
        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            qty: { decrement: newQty },
            state: remainingQty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
            location: data.location?.trim() || null,
          },
        });
      } else if (!wasReturned && !isNowReturned) {
        // Still active: adjust inventory by the delta
        const qtyDelta = newQty - oldQty;

        if (qtyDelta > 0 && existing.device.qty < qtyDelta) {
          throw new Error("INSUFFICIENT_STOCK");
        }

        const updatedDevice = await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            qty: { decrement: qtyDelta },
            location: data.location?.trim() || null,
          },
          select: { qty: true },
        });

        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            state: updatedDevice.qty > 0 ? DeviceState.en_Stock : DeviceState.en_Service,
          },
        });
      } else {
        // Both were returned; update location only
        await tx.device.update({
          where: { id: existing.deviceId },
          data: {
            location: data.location?.trim() || null,
          },
        });
      }

      // 3. Update assignment record
      const updatedAssignment = await tx.assignment.update({
        where: { id },
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          qty: newQty,
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
      });

      if (!assignment) {
        throw new Error("ASSIGNMENT_NOT_FOUND");
      }

      await tx.assignment.delete({
        where: { id },
      });

      if (!assignment.returnedAt) {
        await tx.device.update({
          where: { id: assignment.deviceId },
          data: {
            qty: { increment: assignment.qty },
            state: DeviceState.en_Stock,
            location:null
           
          },
        });
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