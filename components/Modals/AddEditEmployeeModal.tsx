"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, SquarePen, X } from "lucide-react";
import { toast } from "sonner";

import {
  createEmployee,
  updateEmployee,
  type EmployeeFormData,
} from "@/lib/actions/employee";

type Employee = {
  id?: number;
  fullname: string;
  function?: string | null;
  email?: string | null;
  phone?: string | null;
  service?: string | null;
};

const deviceTypes = [
  "UNITE",
  "ECRAN",
  "ONDULEUR",
  "IMPRIMANTE",
  "LAPTOP",
  "DATASHOW",
];





type Props = {
  employee?: Employee;
  onSuccess?: () => void;
};

export default function AddEditEmployeeModal({
  employee,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);

  const isEdit = !!employee;

  const services = [
  "RH",
  "BET",
  "IT",
  "QAQC",
  "SMI",
  "COMPTABLE",
  "FINANCE",
  "CND",
  "COST",
  "ENGINEERING",
  "GDS",
  "TOPO",
  "PLANNING",
  "HSE",
  "LOGISTIC",
  "ARCHIVES",
  "CONSTRUCTION",
  "DCC",
  "SAS",
  "OTHER",
];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    defaultValues: {
      fullname: "",
      function: "",
      email: "",
      phone: "",
      service: "",
    },
  });

  // Load employee data when editing
  useEffect(() => {
    if (employee) {
      reset({
        fullname: employee.fullname,
        function: employee.function ?? "",
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        service: employee.service ?? "",
      });
    }
  }, [employee, reset]);

  const openModal = () => {
    if (employee) {
      reset({
        fullname: employee.fullname,
        function: employee.function ?? "",
        email: employee.email ?? "",
        phone: employee.phone ?? "",
        service: employee.service ?? "",
      });
    } else {
      reset({
        fullname: "",
        function: "",
        email: "",
        phone: "",
        service: "",
      });
    }

    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    reset();
  };

  
  const onSubmit = async (data: EmployeeFormData) => {
         try {
           const result = isEdit
            ? await updateEmployee(employee.id!, data)
             : await createEmployee(data);


               if (!result.success) {
                  toast.error(result.error);
                   return;
                }

              toast.success(
                    isEdit
                   ? "Employee updated successfully!"
                 : "Employee added successfully!"
              );

             closeModal();
             onSuccess?.();


              
          } catch (error) {
               console.error("Error saving employee:", error);
                toast.error("Something went wrong. Please try again.");
          }
 };


  return (
    <>
      {/* Button */}
      {isEdit ? (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Pencil size={16} />
        </button>
      ) : (
        <button
          type="button"
          onClick={openModal}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          + Add Employee
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-xl  text-left font-semibold text-slate-900">
                  {isEdit ? "Edit Employee" : "Add Employee"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEdit
                    ? "Update employee information"
                    : "Add a new SARPI employee"}
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
              {/* Fullname */}
              <div>
                <label className="mb-2 block text-left text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  type="text"
                  placeholder="Enter employee full name"
                  {...register("fullname", {
                    required: "Full name is required",
                  })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                {errors.fullname && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.fullname.message}
                  </p>
                )}
              </div>

              {/* Function */}
              <div>
                <label className="mb-2 block text-left text-sm font-medium text-slate-700">
                  Function
                </label>

                <input
                  type="text"
                  placeholder="e.g. IT Engineer"
                  {...register("function")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block  text-left text-sm font-medium text-slate-700">
                  Email
                </label>

                <input
                  type="email"
                  placeholder="employee@sarpi.dz"
                  {...register("email", {
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="mb-2 block  text-left text-sm font-medium text-slate-700">
                  Phone
                </label>

                <input
                  type="tel"
                  placeholder="e.g. 0550 00 00 00"
                  {...register("phone")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* Service */}
             <select
               {...register("service")}
                   className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                 >
              <option value="">Select a service</option>

                 {services.map((service) => (
                    <option key={service} value={service}>
                   {service}
                     </option>
                    ))}
                </select>

              {/* Buttons */}
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
                      : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}