"use client";

import { useEffect, useState } from "react";
import {
  useForm,
  useFieldArray,
  Controller,
  type Control,
  type UseFormRegister,
  type FieldErrors,
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
  createTransfer,
  updateTransfer,
  type TransferFormData,
} from "@/lib/actions/transfer";

import { getAllDevicesForTransfer } from "@/lib/actions/device";

type Device = {
  id: number;
 codeSarpi: string | null;
  serialNumber?: string | null;
  type: string;
  brand: string;
  model?: string | null;
};

type TransferItem = {
  id?: number;
  deviceId: number;
  quantity: number;
  device?: Device;
};

type Transfer = {
  id?: number;
  siteExpediteur: string;
  dateExpediteur: Date | string;
  siteDestinataire: string;
  dateDestinataire?: Date | string | null;
  nature: string;
  note?: string | null;
  items: TransferItem[];
};

type Props = {
  transfer?: Transfer;
  onSuccess?: () => void;
};

const natures = [
  "INVESTISSEMENT",
  "CONSOMMABLE",
];

const deviceTypes = [
  "UNITE",
  "ECRAN",
  "ONDULEUR",
  "IMPRIMANTE",
  "LAPTOP",
  "DATASHOW",
  "POINT_ACCES",
  "Switch",
  "Hard_Disk",
  "Flash_Disk",
  "Toner",
  "Batterie"
];

const emptyForm: TransferFormData = {
  siteExpediteur: "",
  dateExpediteur: "",
  siteDestinataire: "",
  dateDestinataire: "",
  nature: "",
  note: "",
  items: [],
};

function normalizeType(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function formatDateForInput(
  date: Date | string
) {
  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toISOString().split("T")[0];
}

export default function AddEditTransferModal({
  transfer,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<Device[]>(
    []
  );
  const [loadingDevices, setLoadingDevices] =
    useState(false);

  const isEdit = Boolean(transfer);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormData>({
    defaultValues: emptyForm,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const loadDevices = async () => {
    try {
      setLoadingDevices(true);

      const result =
        await getAllDevicesForTransfer();

      if (!result.success) {
        toast.error(
          result.error ??
            "Impossible de charger les matériels."
        );
        return;
      }

      setDevices(result.devices);
    } catch (error) {
      console.error(error);

      toast.error(
        "Impossible de charger les matériels."
      );
    } finally {
      setLoadingDevices(false);
    }
  };

  const getEditData = (
    currentTransfer: Transfer
  ): TransferFormData => {
    return {
      siteExpediteur:
        currentTransfer.siteExpediteur,

      dateExpediteur: formatDateForInput(
        currentTransfer.dateExpediteur
      ),

      siteDestinataire:
        currentTransfer.siteDestinataire,

      dateDestinataire:
        currentTransfer.dateDestinataire
          ? formatDateForInput(
              currentTransfer.dateDestinataire
            )
          : "",

      nature: currentTransfer.nature,

      note: currentTransfer.note ?? "",

      items: currentTransfer.items.map(
        (item) => {
          const device =
            item.device ??
            devices.find(
              (d) => d.id === item.deviceId
            );

          return {
            deviceId: item.deviceId,
            deviceType: normalizeType(
              device?.type
            ),
            quantity: item.quantity,
          };
        }
      ),
    };
  };

  useEffect(() => {
    if (transfer && devices.length > 0) {
      reset(getEditData(transfer));
    }
  }, [transfer, devices, reset]);

  const openModal = async () => {
    setOpen(true);

    if (!transfer) {
      reset(emptyForm);
    }

    await loadDevices();
  };

  const closeModal = () => {
    setOpen(false);
    reset(emptyForm);
  };

  const onSubmit = async (
    data: TransferFormData
  ) => {
    try {
      if (
        !data.items ||
        data.items.length === 0
      ) {
        toast.error(
          "Veuillez ajouter au moins un matériel."
        );
        return;
      }

      for (const item of data.items) {
        if (
          !item.deviceType ||
          Number(item.deviceId) <= 0 ||
          Number(item.quantity) <= 0
        ) {
          toast.error(
            "Veuillez compléter tous les champs des matériels."
          );
          return;
        }
      }

      const ids = data.items.map((item) =>
        Number(item.deviceId)
      );

      if (new Set(ids).size !== ids.length) {
        toast.error(
          "Un même matériel ne peut pas être ajouté deux fois."
        );
        return;
      }

      const result = isEdit
        ? await updateTransfer(
            transfer!.id!,
            data
          )
        : await createTransfer(data);

      if (!result.success) {
        toast.error(
          result.error ??
            "Une erreur est survenue."
        );
        return;
      }

      toast.success(
        isEdit
          ? "Transfert modifié avec succès."
          : "Transfert créé avec succès."
      );

      closeModal();

      onSuccess?.();
    } catch (error) {
      console.error(error);

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
          + Add Transfer
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {isEdit
                    ? "Edit Transfer"
                    : "Add Transfer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update transfer information"
                    : "Create a new IT equipment transfer"}
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
              className="max-h-[80vh] space-y-5 overflow-y-auto p-6"
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Site Expéditeur
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. DRIA"
                    {...register(
                      "siteExpediteur",
                      {
                        required:
                          "Site expéditeur is required",
                      }
                    )}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />

                  {errors.siteExpediteur && (
                    <p className="mt-1 text-sm text-red-500">
                      {
                        errors.siteExpediteur
                          .message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Site Destinataire
                  </label>

                  <input
                    type="text"
                    placeholder="e.g. STAH"
                    {...register(
                      "siteDestinataire",
                      {
                        required:
                          "Site destinataire is required",
                      }
                    )}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />

                  {errors.siteDestinataire && (
                    <p className="mt-1 text-sm text-red-500">
                      {
                        errors
                          .siteDestinataire
                          .message
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Date Expédition
                  </label>

                  <input
                    type="date"
                    {...register(
                      "dateExpediteur",
                      {
                        required:
                          "Date expédition is required",
                      }
                    )}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />

                  {errors.dateExpediteur && (
                    <p className="mt-1 text-sm text-red-500">
                      {
                        errors
                          .dateExpediteur
                          .message
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Date Réception
                  </label>

                  <input
                    type="date"
                    {...register(
                      "dateDestinataire"
                    )}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Nature
                </label>

                <select
                  {...register("nature", {
                    required:
                      "Nature is required",
                  })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    Select nature
                  </option>

                  {natures.map((nature) => (
                    <option
                      key={nature}
                      value={nature}
                    >
                      {nature}
                    </option>
                  ))}
                </select>

                {errors.nature && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.nature.message}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">
                      Matériels
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Sélectionnez le type puis le code inventaire.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={loadingDevices}
                    onClick={() =>
                      append({
                        deviceId: 0,
                        deviceType: "",
                        quantity: 1,
                      })
                    }
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Ajouter matériel
                  </button>
                </div>

                {loadingDevices && (
                  <div className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Chargement des matériels...
                  </div>
                )}

                {!loadingDevices &&
                  devices.length === 0 && (
                    <div className="mb-4 rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">
                      Aucun matériel trouvé.
                    </div>
                  )}

                {fields.length === 0 && (
                  <div className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                    Aucun matériel ajouté.
                  </div>
                )}

                <div className="space-y-4">
                  {fields.map(
                    (field, index) => (
                      <MaterialRow
                        key={field.id}
                        index={index}
                        control={control}
                        register={register}
                        errors={errors}
                        devices={devices}
                        remove={remove}
                        setValue={setValue}
                      />
                    )
                  )}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Note
                </label>

                <textarea
                  rows={3}
                  placeholder="Optional note..."
                  {...register("note")}
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    loadingDevices
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Add Transfer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

type MaterialRowProps = {
  index: number;
  control: Control<TransferFormData>;
  register: UseFormRegister<TransferFormData>;
  errors: FieldErrors<TransferFormData>;
  devices: Device[];
  remove: (index: number) => void;
  setValue: ReturnType<
    typeof useForm<TransferFormData>
  >["setValue"];
};

function MaterialRow({
  index,
  control,
  register,
  errors,
  devices,
  remove,
  setValue,
}: MaterialRowProps) {
  return (
    <Controller
      control={control}
      name={`items.${index}.deviceType`}
      render={({ field: typeField }) => {
        const selectedType = normalizeType(
          typeField.value
        );

        const filteredDevices =
          selectedType.length > 0
            ? devices.filter(
                (device) =>
                  normalizeType(
                    device.type
                  ) === selectedType
              )
            : [];

        return (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-600">
                  Type Matériel
                </label>

                <select
                  value={selectedType}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    typeField.onChange(value);

                    setValue(
                      `items.${index}.deviceId`,
                      0,
                      {
                        shouldValidate: true,
                        shouldDirty: true,
                      }
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    Sélectionner le type
                  </option>

                  {deviceTypes.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <Controller
                control={control}
                name={`items.${index}.deviceId`}
                rules={{
                  validate: (value) =>
                    Number(value) > 0 ||
                    "Sélectionnez un matériel",
                }}
                render={({ field }) => {
                  const selectedDeviceId =
                    Number(field.value) || 0;

                  return (
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-600">
                        Code Inventaire
                      </label>

                      <select
                        value={
                          selectedDeviceId || ""
                        }
                        disabled={
                          !selectedType ||
                          filteredDevices.length ===
                            0
                        }
                        onChange={(e) => {
                          field.onChange(
                            Number(
                              e.target.value
                            )
                          );
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      >
                        <option value="">
                          {!selectedType
                            ? "Sélectionnez le type d'abord"
                            : filteredDevices.length ===
                                0
                              ? "Aucun matériel de ce type"
                              : "Sélectionner le code"}
                        </option>

                        {filteredDevices.map(
                          (device) => (
                            <option
                              key={device.id}
                              value={device.id}
                            >
                              {device.codeSarpi}
                            </option>
                          )
                        )}
                      </select>

                      {selectedType && (
                        <p className="mt-1 text-xs text-slate-400">
                          {filteredDevices.length}{" "}
                          matériel(s) disponible(s)
                        </p>
                      )}

                      {errors.items?.[index]
                        ?.deviceId && (
                        <p className="mt-1 text-xs text-red-500">
                          {
                            errors.items[index]
                              ?.deviceId
                              ?.message
                          }
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            </div>

            <Controller
              control={control}
              name={`items.${index}.deviceId`}
              render={({ field }) => {
                const selectedDevice =
                  devices.find(
                    (device) =>
                      device.id ===
                      Number(field.value)
                  );

                return (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[700px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                            Code Inventaire
                          </th>

                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                            N° Série
                          </th>

                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                            Type
                          </th>

                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                            Marque
                          </th>

                          <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">
                            Modèle
                          </th>

                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">
                            Qté
                          </th>

                          <th className="px-3 py-2 text-center text-xs font-medium text-slate-600">
                            Action
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-b">
                          <td className="px-3 py-3 font-medium text-slate-800">
                            {selectedDevice?.codeSarpi ??
                              "-"}
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            {selectedDevice?.serialNumber ||
                              "-"}
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            {selectedDevice?.type ||
                              "-"}
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            {selectedDevice?.brand ||
                              "-"}
                          </td>

                          <td className="px-3 py-3 text-slate-600">
                            {selectedDevice?.model ||
                              "-"}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <input
                              type="number"
                              min={1}
                              {...register(
                                `items.${index}.quantity`,
                                {
                                  required:
                                    "Quantité requise",
                                  valueAsNumber:
                                    true,
                                  min: {
                                    value: 1,
                                    message:
                                      "Minimum 1",
                                  },
                                }
                              )}
                              className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                            />

                            {errors.items?.[
                              index
                            ]?.quantity && (
                              <p className="mt-1 text-xs text-red-500">
                                {
                                  errors.items[
                                    index
                                  ]?.quantity
                                    ?.message
                                }
                              </p>
                            )}
                          </td>

                          <td className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                remove(index)
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                              title="Supprimer"
                            >
                              <Trash2 size={17} />
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              }}
            />
          </div>
        );
      }}
    />
  );
}