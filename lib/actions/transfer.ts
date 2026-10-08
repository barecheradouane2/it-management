
"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";


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



// CREATE
export async function createTransfer(data: TransferFormData) {
  try {
    if (!data.siteExpediteur?.trim()) {
      return {
        success: false,
        error: "Le site expéditeur est obligatoire.",
      };
    }

    if (!data.siteDestinataire?.trim()) {
      return {
        success: false,
        error: "Le site destinataire est obligatoire.",
      };
    }

    if (!data.dateExpediteur) {
      return {
        success: false,
        error: "La date d'expédition est obligatoire.",
      };
    }

    if (!data.nature) {
      return {
        success: false,
        error: "La nature du transfert est obligatoire.",
      };
    }

    if (!data.items || data.items.length === 0) {
      return {
        success: false,
        error: "Veuillez ajouter au moins un matériel.",
      };
    }

    const items = data.items.map((item) => ({
      deviceId: Number(item.deviceId),
      quantity: Number(item.quantity),
    }));

    for (const item of items) {
      if (!item.deviceId || item.deviceId <= 0) {
        return {
          success: false,
          error: "Un matériel valide doit être sélectionné.",
        };
      }

      if (!item.quantity || item.quantity <= 0) {
        return {
          success: false,
          error: "La quantité doit être supérieure à 0.",
        };
      }
    }

    const transfer = await prisma.transfer.create({
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
          create: items,
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

    revalidatePath("/transfers");

    return {
      success: true,
      transfer,
    };
  } catch (error: any) {
    console.error("CREATE TRANSFER ERROR:", error);

    return {
      success: false,
      error:
        error?.message ||
        "Erreur lors de la création du transfert.",
    };
  }
}

// UPDATE
export async function updateTransfer(
  id: number,
  data: TransferFormData
) {
  try {
    const transfer =
      await prisma.$transaction(async (tx) => {
        // Update transfer information
        const updatedTransfer =
          await tx.transfer.update({
            where: {
              id,
            },

            data: {
              siteExpediteur:
                data.siteExpediteur,

              dateExpediteur:
                new Date(data.dateExpediteur),

              siteDestinataire:
                data.siteDestinataire,

              dateDestinataire:
                data.dateDestinataire
                  ? new Date(
                      data.dateDestinataire
                    )
                  : null,

              nature: data.nature as any,

              note: data.note || null,
            },
          });

        // Remove old items
        await tx.transferItem.deleteMany({
          where: {
            transferId: id,
          },
        });

        // Create new items
        if (data.items.length > 0) {
          await tx.transferItem.createMany({
            data: data.items.map((item) => ({
              transferId: id,
              deviceId: item.deviceId,
              quantity: item.quantity,
            })),
          });
        }

        return updatedTransfer;
      });

    revalidatePath("/transfers");

    return {
      success: true,
      transfer,
    };
  } catch (error) {
    console.error(
      "Error updating transfer:",
      error
    );

    return {
      success: false,
      error: "Failed to update transfer",
    };
  }
}

// DELETE
export async function deleteTransfer(
  id: number
) {
  try {
    await prisma.transfer.delete({
      where: {
        id,
      },
    });

    revalidatePath("/transfers");

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "Error deleting transfer:",
      error
    );

    return {
      success: false,
      error: "Failed to delete transfer",
    };
  }
}

