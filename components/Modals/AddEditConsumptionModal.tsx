"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";
import {
  createConsumption,
  updateConsumption,
  type ConsumptionFormData,
} from "@/lib/actions/consumption";

type DeviceOption = {
  id: number;
  brand: string;
  model: string | null;
  type: string;
  qty: number;
};

type EmployeeOption = {
  id: number;
  fullname: string;
  service: string | null;
};

type ConsumptionItem = {
  id: number;
  deviceId: number;
  employeeId: number | null;
  userId: number | null;
  quantity: number;
  consumedAt: Date | string;
  note: string | null;
};

type Props = {
  consumption?: ConsumptionItem;
  devices: DeviceOption[];
  employees: EmployeeOption[];
  onSuccess?: () => void;
};

const EMPTY_FORM: ConsumptionFormData = {
  deviceId: 0,
  employeeId: null,
  quantity: 1,
  consumedAt: new Date().toISOString().slice(0, 10),
  note: "",
};

export default function AddEditConsumptionModal({
  consumption,
  devices,
  employees,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(consumption);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ConsumptionFormData>({
    defaultValues: EMPTY_FORM,
  });

  const selectedDeviceId = watch("deviceId");
  const selectedDevice = devices.find((d) => d.id === Number(selectedDeviceId));

  // In edit mode, available stock includes current consumption amount
  const maxAvailableStock = selectedDevice
    ? isEdit && consumption?.deviceId === selectedDevice.id
      ? selectedDevice.qty + consumption.quantity
      : selectedDevice.qty
    : 0;

  const getFormValues = (item: ConsumptionItem): ConsumptionFormData => ({
    deviceId: item.deviceId,
    employeeId: item.employeeId,
    userId: item.userId,
    quantity: item.quantity,
    consumedAt: new Date(item.consumedAt).toISOString().slice(0, 10),
    note: item.note ?? "",
  });

  useEffect(() => {
    if (consumption) {
      reset(getFormValues(consumption));
    }
  }, [consumption, reset]);

  const openModal = () => {
    reset(
      consumption
        ? getFormValues(consumption)
        : {
            ...EMPTY_FORM,
            deviceId: devices[0]?.id ?? 0,
            consumedAt: new Date().toISOString().slice(0, 10),
          }
    );
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset(consumption ? getFormValues(consumption) : EMPTY_FORM);
  };

  const onSubmit = async (data: ConsumptionFormData) => {
    try {
      const payload: ConsumptionFormData = {
        ...data,
        deviceId: Number(data.deviceId),
        quantity: Number(data.quantity),
        employeeId: data.employeeId ? Number(data.employeeId) : null,
      };

      const result = isEdit
        ? await updateConsumption(consumption!.id, payload)
        : await createConsumption(payload);

      if (!result.success) {
        toast.error(result.error || "Unable to save consumption record.");
        return;
      }

      toast.success(
        isEdit
          ? "Consumption record updated!"
          : "Consumption recorded successfully!"
      );

      setOpen(false);
      reset(EMPTY_FORM);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving consumption:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 text-sm";
  const labelClass = "mb-2 block text-left text-sm font-medium text-slate-700";

  return (
    <>
      {isEdit ? (
        <button
          type="button"
          onClick={openModal}
          title="Edit consumption"
          aria-label="Edit consumption"
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
          + Record Consumption
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-left text-xl font-semibold text-slate-900">
                  {isEdit ? "Edit Consumption" : "Consume Device / Consumable"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Deducts items from current inventory and records recipient.
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Device Selector */}
                <div className="sm:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className={labelClass}>Select Item / Device *</label>
                    {selectedDevice && (
                      <span className="text-xs text-slate-500">
                        In stock:{" "}
                        <strong className="text-slate-900">
                          {maxAvailableStock}
                        </strong>
                      </span>
                    )}
                  </div>

                  <select
                    {...register("deviceId", {
                      required: "Device selection is required",
                      valueAsNumber: true,
                      validate: (v) => v > 0 || "Please select a valid device",
                    })}
                    className={inputClass}
                  >
                    <option value={0}>-- Select item in stock --</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.brand} {d.model ? `- ${d.model}` : ""} ({d.type}) — Qty: {d.qty}
                      </option>
                    ))}
                  </select>

                  {errors.deviceId && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.deviceId.message}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className={labelClass}>Quantity to Consume *</label>
                  <input
                    type="number"
                    min={1}
                    max={maxAvailableStock > 0 ? maxAvailableStock : undefined}
                    {...register("quantity", {
                      valueAsNumber: true,
                      required: "Quantity is required",
                      min: { value: 1, message: "Quantity must be at least 1" },
                      validate: (val) =>
                        maxAvailableStock === 0 ||
                        val <= maxAvailableStock ||
                        `Exceeds available stock (${maxAvailableStock})`,
                    })}
                    className={inputClass}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.quantity.message}
                    </p>
                  )}
                </div>

                {/* Consumption Date */}
                <div>
                  <label className={labelClass}>Date of Consumption *</label>
                  <input
                    type="date"
                    {...register("consumedAt", {
                      required: "Date is required",
                    })}
                    className={inputClass}
                  />
                </div>

                {/* Employee / Beneficiary */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    Assigned Employee (Beneficiary)
                  </label>
                  <select
                    {...register("employeeId", {
                      setValueAs: (v) => (v === "" ? null : Number(v)),
                    })}
                    className={inputClass}
                  >
                    <option value="">-- Optional / General Stock --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullname} {emp.service ? `(${emp.service})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Purpose / Note</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Replacement toner for Accounting printer..."
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
                    : "Confirm Consumption"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}