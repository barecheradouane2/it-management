
"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  useFieldArray,
} from "react-hook-form";

import {
  Pencil,
  X,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";

import {
  createSupplyRequest,
  updateSupplyRequest,
  type SupplyRequestFormData,
} from "@/lib/actions/supplyRequest";

type SupplyRequestItem = {
  id?: number;
  designation: string;
  referenceCode?: string | null;
  unit: string;
  requestedQuantity: number;
  approvedQuantity?: number | null;
  desiredAvailability?: Date | string | null;
  note?: string | null;
};

type SupplyRequest = {
  id: number;
  requestNumber: string;
  purpose: string;
  requestDate: Date | string;
  desiredDeadline?: Date | string | null;
  status: SupplyRequestFormData["status"];
  note?: string | null;
  items: SupplyRequestItem[];
};

type Props = {
  supplyRequest?: SupplyRequest;
  onSuccess?: () => void;
};

const statuses: {
  value: SupplyRequestFormData["status"];
  label: string;
}[] = [
  { value: "BROUILLON", label: "Brouillon" },
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "APPROUVEE", label: "Approuvée" },
  {
    value: "PARTIELLEMENT_APPROUVEE",
    label: "Partiellement approuvée",
  },
  { value: "REJETEE", label: "Rejetée" },
  { value: "LIVREE", label: "Livrée" },
];

const emptyForm: SupplyRequestFormData = {
  requestNumber: "",
  purpose: "",
  requestDate: new Date().toISOString().slice(0, 10),
  desiredDeadline: "",
  status: "BROUILLON",
  note: "",
  items: [
    {
      designation: "",
      referenceCode: "",
      unit: "Unité",
      requestedQuantity: 1,
      approvedQuantity: null,
      desiredAvailability: "",
      note: "",
    },
  ],
};

function formatDateForInput(
  date?: Date | string | null
): string {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  // Use local calendar date to avoid UTC date shifts.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AddEditSupplyRequestModal({
  supplyRequest,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);

  const isEdit = Boolean(supplyRequest);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupplyRequestFormData>({
    defaultValues: emptyForm,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    if (supplyRequest) {
      reset({
        requestNumber: supplyRequest.requestNumber,
        purpose: supplyRequest.purpose,
        requestDate: formatDateForInput(
          supplyRequest.requestDate
        ),
        desiredDeadline: formatDateForInput(
          supplyRequest.desiredDeadline
        ),
        status: supplyRequest.status,
        note: supplyRequest.note ?? "",
        items: supplyRequest.items.map((item) => ({
          designation: item.designation,
          referenceCode: item.referenceCode ?? "",
          unit: item.unit,
          requestedQuantity: item.requestedQuantity,
          approvedQuantity: item.approvedQuantity ?? null,
          desiredAvailability: formatDateForInput(
            item.desiredAvailability
          ),
          note: item.note ?? "",
        })),
      });
    }
  }, [supplyRequest, reset]);

  const openModal = () => {
    if (!supplyRequest) {
      reset({
        ...emptyForm,
        requestDate: formatDateForInput(new Date()),
        items: [
          {
            designation: "",
            referenceCode: "",
            unit: "Unité",
            requestedQuantity: 1,
            approvedQuantity: null,
            desiredAvailability: "",
            note: "",
          },
        ],
      });
    }

    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset(emptyForm);
  };

  const onSubmit = async (
    data: SupplyRequestFormData
  ) => {
    try {
      if (!data.items || data.items.length === 0) {
        toast.error("Veuillez ajouter au moins un article.");
        return;
      }

      const normalizedData: SupplyRequestFormData = {
        ...data,
        requestNumber: data.requestNumber.trim(),
        purpose: data.purpose.trim(),
        note: data.note?.trim() || "",
        items: data.items.map((item) => ({
          ...item,
          designation: item.designation.trim(),
          referenceCode: item.referenceCode?.trim() || "",
          unit: item.unit.trim(),
          requestedQuantity: Number(item.requestedQuantity),
          approvedQuantity:
            item.approvedQuantity == null ||
            item.approvedQuantity === ("" as unknown as number) ||
            !Number.isFinite(Number(item.approvedQuantity))
              ? null
              : Number(item.approvedQuantity),
          desiredAvailability: item.desiredAvailability || "",
          note: item.note?.trim() || "",
        })),
      };

      for (const item of normalizedData.items) {
        if (!item.designation) {
          toast.error("La désignation de chaque article est obligatoire.");
          return;
        }

        if (!item.unit) {
          toast.error("L'unité de chaque article est obligatoire.");
          return;
        }

        if (
          !Number.isInteger(item.requestedQuantity) ||
          item.requestedQuantity <= 0
        ) {
          toast.error(
            "La quantité demandée doit être un entier supérieur à 0."
          );
          return;
        }

        if (
          item.approvedQuantity != null &&
          (!Number.isInteger(item.approvedQuantity) ||
            item.approvedQuantity < 0)
        ) {
          toast.error(
            "La quantité approuvée doit être un entier positif ou nul."
          );
          return;
        }

        if (
          item.approvedQuantity != null &&
          item.approvedQuantity > item.requestedQuantity
        ) {
          toast.error(
            "La quantité approuvée ne peut pas dépasser la quantité demandée."
          );
          return;
        }
      }

      const result = isEdit
        ? await updateSupplyRequest(
            supplyRequest!.id,
            normalizedData
          )
        : await createSupplyRequest(normalizedData);

      if (!result.success) {
        toast.error(
          result.error ?? "Une erreur est survenue."
        );
        return;
      }

      toast.success(
        isEdit
          ? "Demande modifiée avec succès."
          : "Demande créée avec succès."
      );

      closeModal();
      onSuccess?.();
    } catch (error) {
      console.error("SUPPLY REQUEST FORM ERROR:", error);

      toast.error(
        "Une erreur est survenue. Veuillez réessayer."
      );
    }
  };

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          title="Modifier"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Add Supply Request
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-6xl rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEdit
                    ? "Edit Supply Request"
                    : "Add Supply Request"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update the supply request and its items"
                    : "Create a new supply request"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="max-h-[80vh] space-y-6 overflow-y-auto p-6"
            >
              {/* General Information */}
              <div>
                <h3 className="mb-4 text-sm font-semibold text-slate-800">
                  Informations générales
                </h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {/* Request Number */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Numéro de demande *
                    </label>

                    <input
                      type="text"
                      placeholder="Ex. DA-2026-001"
                      {...register("requestNumber", {
                        required: "Le numéro de demande est obligatoire.",
                      })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    {errors.requestNumber && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.requestNumber.message}
                      </p>
                    )}
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Objet de la demande *
                    </label>

                    <input
                      type="text"
                      placeholder="Ex. Fournitures informatiques"
                      {...register("purpose", {
                        required: "L'objet de la demande est obligatoire.",
                      })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    {errors.purpose && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.purpose.message}
                      </p>
                    )}
                  </div>

                  {/* Request Date */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Date de demande *
                    </label>

                    <input
                      type="date"
                      {...register("requestDate", {
                        required: "La date de demande est obligatoire.",
                      })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    {errors.requestDate && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.requestDate.message}
                      </p>
                    )}
                  </div>

                  {/* Deadline */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Échéance souhaitée
                    </label>

                    <input
                      type="date"
                      {...register("desiredDeadline")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Statut *
                    </label>

                    <select
                      {...register("status", {
                        required: "Le statut est obligatoire.",
                      })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    >
                      {statuses.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>

                    {errors.status && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.status.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Items */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Articles demandés
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Ajoutez les désignations, références et quantités souhaitées.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      append({
                        designation: "",
                        referenceCode: "",
                        unit: "Unité",
                        requestedQuantity: 1,
                        approvedQuantity: null,
                        desiredAvailability: "",
                        note: "",
                      })
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <Plus size={16} />
                    Ajouter un article
                  </button>
                </div>

                {fields.length === 0 && (
                  <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Aucun article ajouté.
                  </div>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border border-slate-200 bg-white p-4"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-700">
                          Article {index + 1}
                        </h4>

                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                          title="Supprimer cet article"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Designation */}
                        <div className="lg:col-span-2">
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Désignation *
                          </label>

                          <input
                            type="text"
                            placeholder="Ex. Clavier USB"
                            {...register(
                              `items.${index}.designation`,
                              {
                                required: "La désignation est obligatoire.",
                              }
                            )}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />

                          {errors.items?.[index]?.designation && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.items[index]?.designation?.message}
                            </p>
                          )}
                        </div>

                        {/* Reference */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Code référence
                          </label>

                          <input
                            type="text"
                            placeholder="Référence facultative"
                            {...register(
                              `items.${index}.referenceCode`
                            )}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        {/* Unit */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Unité *
                          </label>

                          <select
                            {...register(`items.${index}.unit`, {
                              required: "L'unité est obligatoire.",
                            })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          >
                            <option value="Unité">Unité</option>
                            <option value="Pièce">Pièce</option>
                            <option value="Lot">Lot</option>
                            <option value="Boîte">Boîte</option>
                            <option value="Carton">Carton</option>
                            <option value="Paquet">Paquet</option>
                            <option value="Rouleau">Rouleau</option>
                            <option value="Mètre">Mètre</option>
                            <option value="Litre">Litre</option>
                            <option value="Kilogramme">Kilogramme</option>
                          </select>

                          {errors.items?.[index]?.unit && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.items[index]?.unit?.message}
                            </p>
                          )}
                        </div>

                        {/* Requested Quantity */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Quantité demandée *
                          </label>

                          <input
                            type="number"
                            min={1}
                            step={1}
                            {...register(
                              `items.${index}.requestedQuantity`,
                              {
                                required: "La quantité est obligatoire.",
                                valueAsNumber: true,
                                min: {
                                  value: 1,
                                  message: "Minimum : 1",
                                },
                                validate: (value) =>
                                  Number.isInteger(value) ||
                                  "Saisissez un nombre entier.",
                              }
                            )}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />

                          {errors.items?.[index]?.requestedQuantity && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.items[index]?.requestedQuantity?.message}
                            </p>
                          )}
                        </div>

                        {/* Approved Quantity */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Quantité approuvée
                          </label>

                          <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="Non définie"
                            {...register(
                              `items.${index}.approvedQuantity`,
                              {
                                setValueAs: (value) =>
                                  value === "" ||
                                  value == null ||
                                  !Number.isFinite(Number(value))
                                    ? null
                                    : Number(value),
                                min: {
                                  value: 0,
                                  message: "Minimum : 0",
                                },
                                validate: (value) =>
                                  value == null ||
                                  Number.isInteger(value) ||
                                  "Saisissez un nombre entier.",
                              }
                            )}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />

                          {errors.items?.[index]?.approvedQuantity && (
                            <p className="mt-1 text-xs text-red-500">
                              {errors.items[index]?.approvedQuantity?.message}
                            </p>
                          )}
                        </div>

                        {/* Desired Availability */}
                        <div>
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Disponibilité souhaitée
                          </label>

                          <input
                            type="date"
                            {...register(
                              `items.${index}.desiredAvailability`
                            )}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>

                        {/* Item Note */}
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="mb-2 block text-xs font-medium text-slate-600">
                            Note sur l'article
                          </label>

                          <textarea
                            rows={2}
                            placeholder="Informations complémentaires..."
                            {...register(`items.${index}.note`)}
                            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Note */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Note générale
                </label>

                <textarea
                  rows={3}
                  placeholder="Observations ou informations complémentaires..."
                  {...register("note")}
                  className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting && (
                    <Loader2 size={16} className="animate-spin" />
                  )}

                  {isSubmitting
                    ? "Enregistrement..."
                    : isEdit
                      ? "Enregistrer les modifications"
                      : "Créer la demande"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
