"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
AssignmentCondition,
Block,
DeviceState 
} from "@prisma/client";

export type AssignmentFormData = {
deviceId: number;
employeeId: number;
bureau: string;
block: Block | "";
hostName: string;
condition: AssignmentCondition;
note: string;
assignedAt: string;
returnedAt: string;
};

// CREATE
// Keep your existing AssignmentFormData type definition.

export async function createAssignment(data: AssignmentFormData) {
  try {
    const assignment = await prisma.$transaction(async (tx) => {
      // 1. Verify that the device exists
      const device = await tx.device.findUnique({
        where: {
          id: data.deviceId,
        },
        select: {
          id: true,
          state: true,
        },
      });

      if (!device) {
        throw new Error("DEVICE_NOT_FOUND");
      }

      // 2. Allow assignment only if the device is in stock
      if (device.state !== DeviceState.en_Stock) {
        throw new Error("DEVICE_NOT_IN_STOCK");
      }

      // 3. Create the assignment
      const newAssignment = await tx.assignment.create({
        data: {
          deviceId: data.deviceId,
          employeeId: data.employeeId,
          bureau: data.bureau || null,
          block: data.block || null,
          hostName: data.hostName || null,
          condition: data.condition || AssignmentCondition.NEUF,
          note: data.note || null,
          assignedAt: data.assignedAt
            ? new Date(data.assignedAt)
            : new Date(),
          returnedAt: data.returnedAt
            ? new Date(data.returnedAt)
            : null,
        },
      });

      // 4. Change the device state to en_Service
      await tx.device.update({
        where: {
          id: data.deviceId,
        },
        data: {
          state: DeviceState.en_Service,
        },
      });

      return newAssignment;
    });

    // 5. Refresh the affected pages
    revalidatePath("/assignments");
    revalidatePath("/devices");
    revalidatePath("/employees");

    return {
      success: true,
      assignment,
    };
  } catch (error) {
    console.error("Error creating assignment:", error);

    if (error instanceof Error) {
      if (error.message === "DEVICE_NOT_FOUND") {
        return {
          success: false,
          error: "Device not found.",
        };
      }

      if (error.message === "DEVICE_NOT_IN_STOCK") {
        return {
          success: false,
          error: "Assignment not allowed: the device is not in stock.",
        };
      }
    }

    return {
      success: false,
      error: "Failed to create assignment.",
    };
  }
}

// UPDATE
export async function updateAssignment(
id: number,
data: AssignmentFormData
) {
try {
const assignment = await prisma.assignment.update({
where: { id },
data: {
deviceId: data.deviceId,
employeeId: data.employeeId,
bureau: data.bureau || null,
block: data.block || null,
hostName: data.hostName || null,
condition: data.condition,
note: data.note || null,
assignedAt: data.assignedAt
? new Date(data.assignedAt)
: new Date(),
returnedAt: data.returnedAt
? new Date(data.returnedAt)
: null,
},
});


revalidatePath("/assignments");
revalidatePath("/devices");
revalidatePath("/employees");

return {
  success: true,
  assignment,
};


} catch (error) {
console.error("Error updating assignment:", error);


return {
  success: false,
  error: "Failed to update assignment",
};


}
}

// DELETE
export async function deleteAssignment(id: number) {
try {
await prisma.assignment.delete({
where: { id },
});


revalidatePath("/assignments");
revalidatePath("/devices");
revalidatePath("/employees");

return {
  success: true,
};


} catch (error) {
console.error("Error deleting assignment:", error);


return {
  success: false,
  error: "Failed to delete assignment",
};


}
}
