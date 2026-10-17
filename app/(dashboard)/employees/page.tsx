import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Phone , Printer } from "lucide-react";
import { ITEM_PER_PAGE } from "@/lib/settings";
import AddEditEmployeeModal from "@/components/Modals/AddEditEmployeeModal";

import Pagination from "@/components/Pagination";

import DeleteButton from "@/components/DeleteButton";
import { deleteEmployee } from "@/lib/actions/employee";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import PrintEmployeeButton from "@/components/PrintEmployeeButton";





type EmployeesPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function EmployeesPage({
  searchParams,
}: EmployeesPageProps) {
 
   const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);

    const search = params.search?.trim() || "";

    const where = search
    ? {
        OR: [
          {
            fullname: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            phone: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            function: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : {};

    const columns = [

  { header: "Fullname", accessor: "fullname" ,className: "px-6  text-left  border-b-1 border-black " },
  { header: "Function", accessor: "function" ,className: "px-6  text-left   border-b-1 border-black" },
  { header: "Service", accessor: "service" ,className: "px-6  text-left  border-b-1 border-black " },
  { header: "Email", accessor: "email" ,className: "px-6 text-left  border-b-1 border-black " },
  { header: "Phone", accessor: "phone" ,className: "px-6  text-left   border-b-1 border-black" },
  { header: "Action", accessor: "action" ,className: "px-6  text-left  border-b-1 border-black  " },
     ];

const renderRow = (employee: (typeof employees)[number],index: number) => {
  

  return (
    <tr
      key={employee.id}
      className="border-b border-gray-200 text-sm hover:bg-slate-50"
    >
      <td className="px-6 py-4">{index + 1}</td>
      <td className="px-6 py-4 font-medium">{employee.fullname}</td>
      <td className="px-6 py-4">{employee.function || "-"}</td>
      <td className="px-6 py-4">{employee.service || "-"}</td>
      <td className="px-6 py-4">{employee.email || "-"}</td>
      <td className="px-6 py-4">{employee.phone || "-"}</td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <AddEditEmployeeModal employee={employee} />

          <DeleteButton
            id={employee.id}
            itemName="employee"
            deleteAction={deleteEmployee}
          />

          <PrintEmployeeButton employeeId={employee.id} />
        </div>
      </td>
    </tr>
  );
};




    const [employees, count] = await prisma.$transaction([
    prisma.employee.findMany({
      where,

      include: {
        assignments: {
          where: {
            returnedAt: null,
          },
        },
      },

      orderBy: {
        fullname: "asc",
      },

      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),

    prisma.employee.count({
      where,
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-8xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Employees
            </h1>

            <p className="mt-2 text-slate-500">
              Manage employees and their IT equipment.
            </p>
          </div>

        
        </div>

        

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h1 className="text-lg font-semibold">
              Employees List
            </h1>

            </div>

            <div className="flex flex-1 justify-end item-center  gap-2">
              {/* <EmployeeSearch /> */}
              <TableSearch />


             <AddEditEmployeeModal/>
            </div>
            
            

          </div>
         

        <Table
           columns={columns}
               renderRow={renderRow}
               data={employees}
              />
        </div>

          <Pagination page={page} count={count} />
      </div>
    </main>
  );
}