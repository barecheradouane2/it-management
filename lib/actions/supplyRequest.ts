

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type SupplyRequestFormData = {
  requestNumber: string;
  purpose: string;
  requestDate: string;
  desiredDeadline?: string;
  status:
    | "BROUILLON"
    | "EN_ATTENTE"
    | "APPROUVEE"
    | "PARTIELLEMENT_APPROUVEE"
    | "REJETEE"
    | "LIVREE";
  note?: string;

  items: {
    designation: string;
    referenceCode?: string;
    unit: string;
    requestedQuantity: number;
    approvedQuantity?: number | null;
    desiredAvailability?: string;
    note?: string;
  }[];
};

// CREATE
export async function createSupplyRequest(
  data: SupplyRequestFormData
) {
  try {
    if (!data.requestNumber?.trim()) {
      return {
        success: false,
        error: "Le numéro de demande est obligatoire.",
      };
    }

    if (!data.purpose?.trim()) {
      return {
        success: false,
        error: "L'objet de la demande est obligatoire.",
      };
    }

    if (!data.requestDate) {
      return {
        success: false,
        error: "La date de demande est obligatoire.",
      };
    }

    if (!data.status) {
      return {
        success: false,
        error: "Le statut de la demande est obligatoire.",
      };
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return {
        success: false,
        error: "Veuillez ajouter au moins un article.",
      };
    }

    const validStatuses = [
      "BROUILLON",
      "EN_ATTENTE",
      "APPROUVEE",
      "PARTIELLEMENT_APPROUVEE",
      "REJETEE",
      "LIVREE",
    ];

    if (!validStatuses.includes(data.status)) {
      return {
        success: false,
        error: "Le statut sélectionné est invalide.",
      };
    }

    const items = data.items.map((item) => ({
      designation: item.designation?.trim() || "",
      referenceCode: item.referenceCode?.trim() || null,
      unit: item.unit?.trim() || "",
      requestedQuantity: Number(item.requestedQuantity),
      approvedQuantity:
        item.approvedQuantity === null ||
        item.approvedQuantity === undefined ||
        item.approvedQuantity === ("" as any)
          ? null
          : Number(item.approvedQuantity),
      desiredAvailability: item.desiredAvailability
        ? new Date(item.desiredAvailability)
        : null,
      note: item.note?.trim() || null,
    }));

    for (const item of items) {
      if (!item.designation) {
        return {
          success: false,
          error: "La désignation de chaque article est obligatoire.",
        };
      }

      if (!item.unit) {
        return {
          success: false,
          error: "L'unité de chaque article est obligatoire.",
        };
      }

      if (
        !Number.isInteger(item.requestedQuantity) ||
        item.requestedQuantity <= 0
      ) {
        return {
          success: false,
          error: "La quantité demandée doit être un entier supérieur à 0.",
        };
      }

      if (
        item.approvedQuantity !== null &&
        (!Number.isInteger(item.approvedQuantity) ||
          item.approvedQuantity < 0)
      ) {
        return {
          success: false,
          error: "La quantité approuvée doit être un entier positif ou nul.",
        };
      }
    }

    const requestDate = new Date(data.requestDate);
    const desiredDeadline = data.desiredDeadline
      ? new Date(data.desiredDeadline)
      : null;

    if (Number.isNaN(requestDate.getTime())) {
      return {
        success: false,
        error: "La date de demande est invalide.",
      };
    }

    if (
      desiredDeadline &&
      Number.isNaN(desiredDeadline.getTime())
    ) {
      return {
        success: false,
        error: "La date limite souhaitée est invalide.",
      };
    }

    const supplyRequest = await prisma.supplyRequest.create({
      data: {
        requestNumber: data.requestNumber.trim(),
        purpose: data.purpose.trim(),
        requestDate,
        desiredDeadline,
        status: data.status,
        note: data.note?.trim() || null,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });

    revalidatePath("/supply-requests");

    return {
      success: true,
      supplyRequest,
    };
  } catch (error: any) {
    console.error("CREATE SUPPLY REQUEST ERROR:", error);

    if (error?.code === "P2002") {
      return {
        success: false,
        error: "Ce numéro de demande existe déjà.",
      };
    }

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la création de la demande d'approvisionnement.",
    };
  }
}

// UPDATE
export async function updateSupplyRequest(
  id: number,
  data: SupplyRequestFormData
) {
  try {
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: "Identifiant de demande invalide.",
      };
    }

    if (!data.requestNumber?.trim()) {
      return {
        success: false,
        error: "Le numéro de demande est obligatoire.",
      };
    }

    if (!data.purpose?.trim()) {
      return {
        success: false,
        error: "L'objet de la demande est obligatoire.",
      };
    }

    if (!data.requestDate) {
      return {
        success: false,
        error: "La date de demande est obligatoire.",
      };
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return {
        success: false,
        error: "Veuillez ajouter au moins un article.",
      };
    }

    const validStatuses = [
      "BROUILLON",
      "EN_ATTENTE",
      "APPROUVEE",
      "PARTIELLEMENT_APPROUVEE",
      "REJETEE",
      "LIVREE",
    ];

    if (!validStatuses.includes(data.status)) {
      return {
        success: false,
        error: "Le statut sélectionné est invalide.",
      };
    }

    const items = data.items.map((item) => ({
      designation: item.designation?.trim() || "",
      referenceCode: item.referenceCode?.trim() || null,
      unit: item.unit?.trim() || "",
      requestedQuantity: Number(item.requestedQuantity),
      approvedQuantity:
        item.approvedQuantity === null ||
        item.approvedQuantity === undefined ||
        item.approvedQuantity === ("" as any)
          ? null
          : Number(item.approvedQuantity),
      desiredAvailability: item.desiredAvailability
        ? new Date(item.desiredAvailability)
        : null,
      note: item.note?.trim() || null,
    }));

    for (const item of items) {
      if (!item.designation) {
        return {
          success: false,
          error: "La désignation de chaque article est obligatoire.",
        };
      }

      if (!item.unit) {
        return {
          success: false,
          error: "L'unité de chaque article est obligatoire.",
        };
      }

      if (
        !Number.isInteger(item.requestedQuantity) ||
        item.requestedQuantity <= 0
      ) {
        return {
          success: false,
          error: "La quantité demandée doit être un entier supérieur à 0.",
        };
      }

      if (
        item.approvedQuantity !== null &&
        (!Number.isInteger(item.approvedQuantity) ||
          item.approvedQuantity < 0)
      ) {
        return {
          success: false,
          error: "La quantité approuvée doit être un entier positif ou nul.",
        };
      }

      if (
        item.desiredAvailability &&
        Number.isNaN(item.desiredAvailability.getTime())
      ) {
        return {
          success: false,
          error: "Une date de disponibilité souhaitée est invalide.",
        };
      }
    }

    const requestDate = new Date(data.requestDate);
    const desiredDeadline = data.desiredDeadline
      ? new Date(data.desiredDeadline)
      : null;

    if (Number.isNaN(requestDate.getTime())) {
      return {
        success: false,
        error: "La date de demande est invalide.",
      };
    }

    if (
      desiredDeadline &&
      Number.isNaN(desiredDeadline.getTime())
    ) {
      return {
        success: false,
        error: "La date limite souhaitée est invalide.",
      };
    }

    const supplyRequest = await prisma.$transaction(
      async (tx) => {
        const updatedRequest = await tx.supplyRequest.update({
          where: { id },
          data: {
            requestNumber: data.requestNumber.trim(),
            purpose: data.purpose.trim(),
            requestDate,
            desiredDeadline,
            status: data.status,
            note: data.note?.trim() || null,
          },
        });

        // Replace the existing request items.
        await tx.supplyRequestItem.deleteMany({
          where: {
            supplyRequestId: id,
          },
        });

        await tx.supplyRequestItem.createMany({
          data: items.map((item) => ({
            supplyRequestId: id,
            designation: item.designation,
            referenceCode: item.referenceCode,
            unit: item.unit,
            requestedQuantity: item.requestedQuantity,
            approvedQuantity: item.approvedQuantity,
            desiredAvailability: item.desiredAvailability,
            note: item.note,
          })),
        });

        return tx.supplyRequest.findUniqueOrThrow({
          where: { id: updatedRequest.id },
          include: {
            items: {
              orderBy: {
                id: "asc",
              },
            },
          },
        });
      }
    );

    revalidatePath("/supply-requests");

    return {
      success: true,
      supplyRequest,
    };
  } catch (error: any) {
    console.error("UPDATE SUPPLY REQUEST ERROR:", error);

    if (error?.code === "P2002") {
      return {
        success: false,
        error: "Ce numéro de demande existe déjà.",
      };
    }

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la mise à jour de la demande.",
    };
  }
}

// DELETE
export async function deleteSupplyRequest(id: number) {
  try {
    if (!Number.isInteger(id) || id <= 0) {
      return {
        success: false,
        error: "Identifiant de demande invalide.",
      };
    }

    await prisma.supplyRequest.delete({
      where: {
        id,
      },
    });

    // SupplyRequestItem records are deleted automatically
    // because the relation uses onDelete: Cascade.

    revalidatePath("/supply-requests");

    return {
      success: true,
    };
  } catch (error: any) {
    console.error("DELETE SUPPLY REQUEST ERROR:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la suppression de la demande.",
    };
  }
}
