"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
DeviceType,
DeviceCondition,
DeviceState,
} from "@prisma/client";

export type DeviceFormData = {
codeSarpi: string;
serialNumber: string;
type: DeviceType;
brand: string;
model: string;
arrivalDate: string;
siteProject: string;
condition: DeviceCondition;
state: DeviceState;
note: string;
};

// CREATE
export async function createDevice(data: DeviceFormData) {
try {
const device = await prisma.device.create({
data: {
codeSarpi: data.codeSarpi,
serialNumber: data.serialNumber || null,
type: data.type,
brand: data.brand,
model: data.model || null,
arrivalDate: data.arrivalDate
? new Date(data.arrivalDate)
: null,
siteProject: data.siteProject || null,
condition: data.condition || DeviceCondition.NEUF,
state: data.state || DeviceState.BUREAU_IT,
note: data.note || null,
},
});


revalidatePath("/devices");

return { success: true, device };


} catch (error) {
console.error("Error creating device:", error);


return {
  success: false,
  error: "Failed to create device",
};


}
}

// UPDATE
export async function updateDevice(
id: number,
data: DeviceFormData
) {
try {
const device = await prisma.device.update({
where: { id },
data: {
codeSarpi: data.codeSarpi,
serialNumber: data.serialNumber || null,
type: data.type,
brand: data.brand,
model: data.model || null,
arrivalDate: data.arrivalDate
? new Date(data.arrivalDate)
: null,
siteProject: data.siteProject || null,
condition: data.condition,
state: data.state,
note: data.note || null,
},
});


revalidatePath("/devices");

return { success: true, device };


} catch (error) {
console.error("Error updating device:", error);


return {
  success: false,
  error: "Failed to update device",
};


}
}

// DELETE
export async function deleteDevice(id: number) {
try {
await prisma.device.delete({
where: { id },
});


revalidatePath("/devices");

return { success: true };


} catch (error) {
console.error("Error deleting device:", error);


return {
  success: false,
  error: "Failed to delete device",
};


}
}
