
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

import {
  createDevice,
  updateDevice,
  type DeviceFormData,
} from "@/lib/actions/device";

type Device = {
  id: number;
  codeSarpi: string | null;
  serialNumber: string | null;
  type: DeviceFormData["type"];
  brand: string;
  model: string | null;
  arrivalDate: Date | string | null;
  siteProject: string | null;
  condition: DeviceFormData["condition"];
  qty: number;
  state: DeviceFormData["state"];
  note: string | null;
};

type Props = {
  device?: Device;
  onSuccess?: () => void;
};

// These values must match the Prisma DeviceType enum.
const deviceTypes: DeviceFormData["type"][] = [
  "UNITE",
  "ECRAN",
  "ONDULEUR",
  "IMPRIMANTE",
  "LAPTOP",
  "DATASHOW",
  "POINT_ACCES",
  "SWITCH",
  "HARD_DISK",
  "FLASH_DISK",
  "TONER",
  "BATTERIE"
];

// These values must match the Prisma Condition enum.
const conditions: DeviceFormData["condition"][] = [
  "NEUF",
  "EN_PANNE",
  "ANCIEN",
];

// These values must match the current Prisma DeviceState enum.
const states: DeviceFormData["state"][] = [
  "en_Service",
  "Transfert",
  "en_Stock",
];

const EMPTY_FORM: DeviceFormData = {
  codeSarpi: "",
  serialNumber: "",
  type: "UNITE",
  brand: "",
  model: "",
  arrivalDate: "",
  siteProject: "",
  condition: "NEUF",
  qty: 1,
  state: "en_Stock",
  note: "",
};

export default function AddEditDeviceModal({
  device,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(device);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormData>({
    defaultValues: EMPTY_FORM,
  });

  const getDeviceValues = (item: Device): DeviceFormData => ({
    codeSarpi: item.codeSarpi  ?? "",
    serialNumber: item.serialNumber ?? "",
    type: item.type,
    brand: item.brand,
    model: item.model ?? "",
    arrivalDate: item.arrivalDate
      ? new Date(item.arrivalDate).toISOString().slice(0, 10)
      : "",
    siteProject: item.siteProject ?? "",
    condition: item.condition,
    qty: item.qty ?? 1,
    state: item.state,
    note: item.note ?? "",
  });

  useEffect(() => {
    if (device) {
      reset(getDeviceValues(device));
    }
  }, [device, reset]);

  const openModal = () => {
    reset(device ? getDeviceValues(device) : EMPTY_FORM);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset(device ? getDeviceValues(device) : EMPTY_FORM);
  };

  const onSubmit = async (data: DeviceFormData) => {
    try {
      const result = isEdit
        ? await updateDevice(device!.id, data)
        : await createDevice(data);

      if (!result.success) {
        toast.error(result.error || "Unable to save the device.");
        return;
      }

      toast.success(
        isEdit
          ? "Device updated successfully!"
          : "Device added successfully!"
      );

      setOpen(false);
      reset(EMPTY_FORM);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving device:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

  const labelClass =
    "mb-2 block text-left text-sm font-medium text-slate-700";

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={openModal}
          title="Edit device"
          aria-label="Edit device"
          className="rounded-lg border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Add Device
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="device-modal-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2
                  id="device-modal-title"
                  className="text-left text-xl font-semibold text-slate-900"
                >
                  {isEdit ? "Edit Device" : "Add Device"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update device information"
                    : "Add new SARPI IT equipment"}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                aria-label="Close modal"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 p-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* SARPI Code */}
                <div>
                  <label className={labelClass}>
                    Code SARPI *
                  </label>

                  <input
                    placeholder="Enter SARPI code"
                    {...register("codeSarpi")}
                    className={inputClass}
                  />

                  {errors.codeSarpi && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.codeSarpi.message}
                    </p>
                  )}
                </div>

                {/* Serial Number */}
                <div>
                  <label className={labelClass}>
                    Serial Number
                  </label>

                  <input
                    placeholder="Enter serial number"
                    {...register("serialNumber")}
                    className={inputClass}
                  />
                </div>

                {/* Device Type */}
                <div>
                  <label className={labelClass}>
                    Device Type *
                  </label>

                  <select
                    {...register("type", {
                      required: "Device type is required",
                    })}
                    className={inputClass}
                  >
                    {deviceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Brand */}
                <div>
                  <label className={labelClass}>
                    Brand *
                  </label>

                  <input
                    placeholder="e.g. HP, Dell, Lenovo"
                    {...register("brand", {
                      required: "Brand is required",
                      validate: (value) =>
                        value.trim().length > 0 ||
                        "Brand cannot be empty",
                    })}
                    className={inputClass}
                  />

                  {errors.brand && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.brand.message}
                    </p>
                  )}
                </div>

                {/* Model */}
                <div>
                  <label className={labelClass}>
                    Model
                  </label>

                  <input
                    placeholder="Enter model"
                    {...register("model")}
                    className={inputClass}
                  />
                </div>

                {/* Arrival Date */}
                <div>
                  <label className={labelClass}>
                    Arrival Date
                  </label>

                  <input
                    type="date"
                    {...register("arrivalDate")}
                    className={inputClass}
                  />
                </div>

                {/* Site / Project */}
                <div>
                  <label className={labelClass}>
                    Site / Project
                  </label>

                  <input
                    placeholder="Enter site or project"
                    {...register("siteProject")}
                    className={inputClass}
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className={labelClass}>
                    Condition *
                  </label>

                  <select
                    {...register("condition", {
                      required: "Condition is required",
                    })}
                    className={inputClass}
                  >
                    {conditions.map((condition) => (
                      <option
                        key={condition}
                        value={condition}
                      >
                        {condition.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* State */}
                <div>
                  <label className={labelClass}>
                    State *
                  </label>

                  <select
                    {...register("state", {
                      required: "State is required",
                    })}
                    className={inputClass}
                  >
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {state.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className={labelClass}>
                    Quantity *
                  </label>

                  <input
                    type="number"
                    min={1}
                    step={1}
                    {...register("qty", {
                      valueAsNumber: true,
                      required: "Quantity is required",
                      min: {
                        value: 1,
                        message: "Quantity must be at least 1",
                      },
                      validate: (value) =>
                        Number.isInteger(value) ||
                        "Quantity must be a whole number",
                    })}
                    className={inputClass}
                  />

                  {errors.qty && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.qty.message}
                    </p>
                  )}
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Note
                  </label>

                  <textarea
                    rows={3}
                    placeholder="Additional information..."
                    {...register("note")}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={isSubmitting}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Saving..."
                    : isEdit
                      ? "Save Changes"
                      : "Add Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
