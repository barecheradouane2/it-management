"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guard";
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
  hostName?: string;
  model: string;
  arrivalDate: string;
  location: string;
  condition: DeviceCondition;
  qty: number;
  state: DeviceState;
  note: string;
};

// CREATE
export async function createDevice(data: DeviceFormData) {
  await requireAdmin();
  try {
    const device = await prisma.device.create({
      data: {
        codeSarpi: data.codeSarpi?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        type: data.type,
        brand: data.brand.trim(),
        hostName: data.hostName?.trim() || null,
        model: data.model?.trim() || null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        location: data.location?.trim() || null,
        condition: data.condition || DeviceCondition.NEUF,
        qty: Number(data.qty ?? 1),
        state: data.state || DeviceState.en_Stock,
        note: data.note?.trim() || null,
      },
    });

    revalidatePath("/devices");
    revalidatePath("/assignments");
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
export async function updateDevice(id: number, data: DeviceFormData) {
  try {
    const device = await prisma.device.update({
      where: { id },
      data: {
        codeSarpi: data.codeSarpi?.trim() || null,
        serialNumber: data.serialNumber?.trim() || null,
        type: data.type,
        brand: data.brand.trim(),
        hostName: data.hostName?.trim() || null,
        model: data.model?.trim() || null,
        arrivalDate: data.arrivalDate ? new Date(data.arrivalDate) : null,
        location: data.location?.trim() || null,
        condition: data.condition,
        qty: Number(data.qty ?? 1),
        state: data.state,
        note: data.note?.trim() || null,
      },
    });

    revalidatePath("/devices");
    revalidatePath("/assignments");
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
    revalidatePath("/assignments");
    return { success: true };
  } catch (error) {
    console.error("Error deleting device:", error);
    return {
      success: false,
      error: "Failed to delete device",
    };
  }
}

export async function getAllDevicesForTransfer() {
  try {
    const devices = await prisma.device.findMany({
      select: {
        id: true,
        codeSarpi: true,
        serialNumber: true,
        type: true,
        brand: true,
        model: true,
        hostName: true,
      },
      orderBy: {
        codeSarpi: "asc",
      },
    });

    return {
      success: true,
      devices,
    };
  } catch (error) {
    console.error("getAllDevicesForTransfer:", error);
    return {
      success: false,
      devices: [],
      error: "Impossible de charger les matériels.",
    };
  }
}