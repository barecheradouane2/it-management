
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, X } from "lucide-react";
import { toast } from "sonner";

import {
  createAssignment,
  updateAssignment,
  type AssignmentFormData,
} from "@/lib/actions/assignment";

import type { Block, AssignmentCondition } from "@prisma/client";

type DeviceOption = {
  id: number;
  codeSarpi: string | null;
  brand: string;
  model: string | null;
  state:string,
  qty:number
  
};

type EmployeeOption = {
  id: number;
  fullname: string;
};

type Assignment = {
  id: number;
  deviceId: number;
  employeeId: number;
  bureau: string | null;
  block: Block | null;
  hostName: string | null;
  condition: AssignmentCondition;
  note: string | null;
  assignedAt: Date | string;
  returnedAt: Date | string | null;
};

type Props = {
  assignment?: Assignment;
  devices: DeviceOption[];
  employees: EmployeeOption[];
  onSuccess?: () => void;
};

// Make sure these values match your Prisma Block enum.
const blocks = [
  "BLOCK_SDR",
  "BLOCK_DR",
  "SPACE_R",
  "SPACE_P",
  "BASE_DE_VIE",
] as const;

const conditions = ["NEUF", "EN_PANNE", "ANCIEN"] as const;

const emptyValues: AssignmentFormData = {
  deviceId: 0,
  employeeId: 0,
  bureau: "",
  block: "",
  hostName: "",
  condition: "NEUF",
  note: "",
  assignedAt: "",
  returnedAt: "",
};

export default function AddEditAssignmentModal({
  assignment,
  devices,
  employees,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const isEdit = !!assignment;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentFormData>({
    defaultValues: emptyValues,
  });

  

  const getAssignmentValues = (
    item: Assignment
  ): AssignmentFormData => ({
    deviceId: item.deviceId,
    employeeId: item.employeeId,
    bureau: item.bureau ?? "",
    block: item.block ?? "",
    hostName: item.hostName ?? "",
    condition: item.condition,
    note: item.note ?? "",
    assignedAt: new Date(item.assignedAt)
      .toISOString()
      .slice(0, 10),
    returnedAt: item.returnedAt
      ? new Date(item.returnedAt).toISOString().slice(0, 10)
      : "",
  });

  useEffect(() => {
    if (assignment) {
      reset(getAssignmentValues(assignment));
    }
  }, [assignment, reset]);

  const openModal = () => {
    reset(
      assignment
        ? getAssignmentValues(assignment)
        : { ...emptyValues }
    );
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset(
      assignment
        ? getAssignmentValues(assignment)
        : { ...emptyValues }
    );
  };

 if (!isEdit) {
  devices = devices.filter(
    (device) => device.state === "en_Stock" && device.qty > 0
  );
}

  const onSubmit = async (data: AssignmentFormData) => {
    try {
      const result = isEdit
        ? await updateAssignment(assignment.id, data)
        : await createAssignment(data);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      toast.success(
        isEdit
          ? "Assignment updated successfully!"
          : "Assignment added successfully!"
      );

      closeModal();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving assignment:", error);
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
          title="Edit assignment"
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
          + Add Assignment
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-left text-xl font-semibold text-slate-900">
                  {isEdit ? "Edit Assignment" : "Add Assignment"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update assignment information"
                    : "Assign IT equipment to an employee"}
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

            {/* Form */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-5 p-6"
            >
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Device */}
                <div>
                  <label className={labelClass}>Device *</label>
                  <select
                    {...register("deviceId", {
                      valueAsNumber: true,
                      required: "Please select a device",
                      validate: (value) =>
                        value > 0 || "Please select a device",
                    })}
                    className={inputClass}
                  >
                    <option value={0}>Select a device</option>
                    {devices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.codeSarpi} - {device.brand}
                        {device.model ? ` ${device.model}` : ""}
                      </option>
                    ))}
                  </select>
                  {errors.deviceId && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.deviceId.message}
                    </p>
                  )}
                </div>

                {/* Employee */}
                <div>
                  <label className={labelClass}>Employee *</label>
                  <select
                    {...register("employeeId", {
                      valueAsNumber: true,
                      required: "Please select an employee",
                      validate: (value) =>
                        value > 0 || "Please select an employee",
                    })}
                    className={inputClass}
                  >
                    <option value={0}>Select an employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullname}
                      </option>
                    ))}
                  </select>
                  {errors.employeeId && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.employeeId.message}
                    </p>
                  )}
                </div>

                {/* Bureau */}
                <div>
                  <label className={labelClass}>Bureau</label>
                  <input
                    placeholder="e.g. Bureau 12"
                    {...register("bureau")}
                    className={inputClass}
                  />
                </div>

                {/* Block */}
                <div>
                  <label className={labelClass}>Block / Location</label>
                  <select
                    {...register("block")}
                    className={inputClass}
                  >
                    <option value="">Select a location</option>
                    {blocks.map((block) => (
                      <option key={block} value={block}>
                        {block.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hostname */}
                <div>
                  <label className={labelClass}>Hostname</label>
                  <input
                    placeholder="e.g. DRIA-PC-001"
                    {...register("hostName")}
                    className={inputClass}
                  />
                </div>

                {/* Condition */}
                <div>
                  <label className={labelClass}>Condition *</label>
                  <select
                    {...register("condition", {
                      required: "Condition is required",
                    })}
                    className={inputClass}
                  >
                    {conditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {condition.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assigned Date */}
                <div>
                  <label className={labelClass}>Assigned Date *</label>
                  <input
                    type="date"
                    {...register("assignedAt", {
                      required: "Assigned date is required",
                    })}
                    className={inputClass}
                  />
                  {errors.assignedAt && (
                    <p className="mt-1 text-sm text-red-500">
                      {errors.assignedAt.message}
                    </p>
                  )}
                </div>

                {/* Returned Date */}
                <div>
                  <label className={labelClass}>Returned Date</label>
                  <input
                    type="date"
                    {...register("returnedAt")}
                    className={inputClass}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Leave empty if the device has not been returned.
                  </p>
                </div>

                {/* Note */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>Note</label>
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
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
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
                      : "Add Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}