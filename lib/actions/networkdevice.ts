"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type NetworkDeviceFormData = {
  deviceId?: number | null;
  host?: string | null;
  wifiSsid?: string | null;
  wifiPassword?: string | null;
  adminLogin?: string | null;
  adminPassword?: string | null;
  note?: string | null;
};

export type ActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function createNetworkDevice(
  formData: NetworkDeviceFormData
): Promise<ActionResult> {
  try {
    const deviceId = formData.deviceId ? Number(formData.deviceId) : null;

    if (deviceId) {
      const existing = await prisma.networkDevice.findUnique({
        where: { deviceId },
      });
      if (existing) {
        return {
          success: false,
          error: "Ce matériel possède déjà une configuration réseau.",
        };
      }
    }

    const networkDevice = await prisma.networkDevice.create({
      data: {
        deviceId,
        host: formData.host?.trim() || null,
        wifiSsid: formData.wifiSsid?.trim() || null,
        wifiPassword: formData.wifiPassword?.trim() || null,
        adminLogin: formData.adminLogin?.trim() || null,
        adminPassword: formData.adminPassword?.trim() || null,
        note: formData.note?.trim() || null,
      },
    });

    revalidatePath("/network-devices");
    revalidatePath("/devices");
    return { success: true, data: networkDevice };
  } catch (error: any) {
    console.error("CREATE NETWORK DEVICE ERROR:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la création de l'équipement réseau.",
    };
  }
}

export async function updateNetworkDevice(
  id: number,
  formData: NetworkDeviceFormData
): Promise<ActionResult> {
  try {
    const deviceId = formData.deviceId ? Number(formData.deviceId) : null;

    if (deviceId) {
      const existing = await prisma.networkDevice.findFirst({
        where: {
          deviceId,
          NOT: { id },
        },
      });
      if (existing) {
        return {
          success: false,
          error: "Ce matériel est déjà associé à un autre équipement réseau.",
        };
      }
    }

    const networkDevice = await prisma.networkDevice.update({
      where: { id },
      data: {
        deviceId,
        host: formData.host?.trim() || null,
        wifiSsid: formData.wifiSsid?.trim() || null,
        wifiPassword: formData.wifiPassword?.trim() || null,
        adminLogin: formData.adminLogin?.trim() || null,
        adminPassword: formData.adminPassword?.trim() || null,
        note: formData.note?.trim() || null,
      },
    });

    revalidatePath("/network-devices");
    revalidatePath("/devices");
    return { success: true, data: networkDevice };
  } catch (error: any) {
    console.error("UPDATE NETWORK DEVICE ERROR:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la mise à jour de l'équipement réseau.",
    };
  }
}

export async function deleteNetworkDevice(id: number): Promise<ActionResult> {
  try {
    await prisma.networkDevice.delete({
      where: { id },
    });

    revalidatePath("/network-devices");
    revalidatePath("/devices");
    return { success: true };
  } catch (error: any) {
    console.error("DELETE NETWORK DEVICE ERROR:", error);
    return {
      success: false,
      error: error.message || "Erreur lors de la suppression de l'équipement réseau.",
    };
  }
}