"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
AssignmentCondition,
Block,
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
export async function createAssignment(data: AssignmentFormData) {
try {
const assignment = await prisma.assignment.create({
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


revalidatePath("/assignments");
revalidatePath("/devices");
revalidatePath("/employees");

return {
  success: true,
  assignment,
};


} catch (error) {
console.error("Error creating assignment:", error);


return {
  success: false,
  error: "Failed to create assignment",
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
