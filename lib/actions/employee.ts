"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Service } from "@prisma/client";

export type EmployeeFormData = {
  fullname: string;
  function: string;
  email: string;
  phone: string;
  service: string;
};


function parseService(value: string | null): Service | null {
  if (!value) return null;

  if (Object.values(Service).includes(value as Service)) {
    return value as Service;
  }

  throw new Error(`Invalid service: ${value}`);
}
// CREATE
export async function createEmployee(data: EmployeeFormData) {
  try {
    const employee = await prisma.employee.create({
      data: {
        fullname: data.fullname,
        function: data.function || null,
        email: data.email || null,
        phone: data.phone || null,
        service: parseService(data.service),
      },
    });

    revalidatePath("/employees");

    return {
      success: true,
      employee,
    };
  } catch (error) {
    console.error("Error creating employee:", error);

    return {
      success: false,
      error: "Failed to create employee",
    };
  }
}

// UPDATE
export async function updateEmployee(
  id: number,
  data: EmployeeFormData
) {
  try {
    const employee = await prisma.employee.update({
      where: {
        id,
      },
      data: {
        fullname: data.fullname,
        function: data.function || null,
        email: data.email || null,
        phone: data.phone || null,
        service: parseService(data.service),
      },
    });

    revalidatePath("/employees");

    return {
      success: true,
      employee,
    };
  } catch (error) {
    console.error("Error updating employee:", error);

    return {
      success: false,
      error: "Failed to update employee",
    };
  }
}

export async function deleteEmployee(id: number) {
  try {
    await prisma.employee.delete({
      where: {
        id,
      },
    });

    revalidatePath("/employees");

    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting employee:", error);

    return {
      success: false,
      error: "Failed to delete employee",
    };
  }
}