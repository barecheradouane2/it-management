import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

import AddEditAssignmentModal from "@/components/Modals/AddEditAssignmentModal";
import AssignmentFilters from "@/components/AssignmentFilters";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

import { deleteAssignment } from "@/lib/actions/assignment";

type AssignmentsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    deviceId?: string;
    employeeId?: string;
  }>;
};

export default async function AssignmentsPage({
  searchParams,
}: AssignmentsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";
  const filterDeviceId = params.deviceId ? Number(params.deviceId) : undefined;
  const filterEmployeeId = params.employeeId ? Number(params.employeeId) : undefined;

  const conditions: Prisma.AssignmentWhereInput[] = [];

  if (search) {
    conditions.push({
      OR: [
        {
          note: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          device: {
            OR: [
              { codeSarpi: { contains: search, mode: "insensitive" } },
              { serialNumber: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { hostName: { contains: search, mode: "insensitive" } }, // Search hostName on Device
              { location: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          employee: {
            OR: [
              { fullname: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }

  if (filterDeviceId) {
    conditions.push({ deviceId: filterDeviceId });
  }

  if (filterEmployeeId) {
    conditions.push({ employeeId: filterEmployeeId });
  }

  const where: Prisma.AssignmentWhereInput = {
    AND: conditions,
  };

  // Run all read queries in parallel via Promise.all
  const [devices, employees, assignments, count, filterDevices, filterEmployees] =
    await Promise.all([
      // Devices for modal selector
      prisma.device.findMany({
        select: {
          id: true,
          codeSarpi: true,
          brand: true,
          model: true,
          hostName: true,
          location: true,
          state: true,
          qty: true,
          type: true,
        },
        orderBy: {
          codeSarpi: "asc",
        },
      }),

      // Employees for modal selector
      prisma.employee.findMany({
        select: {
          id: true,
          fullname: true,
        },
        orderBy: {
          fullname: "asc",
        },
      }),

      // Paginated assignments
      prisma.assignment.findMany({
        where,
        include: {
          device: {
            select: {
              id: true,
              codeSarpi: true,
              brand: true,
              model: true,
              type: true,
              hostName: true,
              location: true,
            },
          },
          employee: {
            select: {
              id: true,
              fullname: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
        skip: ITEM_PER_PAGE * (page - 1),
        take: ITEM_PER_PAGE,
      }),

      // Count
      prisma.assignment.count({ where }),

      // Devices for filter dropdown
      prisma.device.findMany({
        where: { codeSarpi: { not: null } },
        select: { id: true, codeSarpi: true },
        orderBy: { codeSarpi: "asc" },
      }),

      // Employees for filter dropdown
      prisma.employee.findMany({
        select: { id: true, fullname: true },
        orderBy: { fullname: "asc" },
      }),
    ]);

  const columns = [
   
    { header: "Device", accessor: "device", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Employee", accessor: "employee", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Qty", accessor: "qty", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Location (Bureau)", accessor: "location", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Block", accessor: "block", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Hostname", accessor: "hostName", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Condition", accessor: "condition", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Assigned At", accessor: "assignedAt", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Returned At", accessor: "returnedAt", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Status", accessor: "status", className: "px-6 py-2 text-left border-b border-black" },
    { header: "Action", accessor: "action", className: "px-6 py-2 text-left border-b border-black" },
  ];

  const renderRow = (
    assignment: (typeof assignments)[number],
    index: number
  ) => {
    const itemNumber = (page - 1) * ITEM_PER_PAGE + index + 1;

    return (
      <tr
        key={assignment.id}
        className="border-b border-gray-200 text-sm hover:bg-slate-50"
      >
        <td className="px-6 py-4 font-medium">{itemNumber}</td>

        <td className="px-6 py-4 font-medium">
          <div>
            <p className="font-semibold text-slate-900">
              {assignment.device.brand} {assignment.device.model ?? ""}
            </p>
            <p className="text-xs text-slate-500">
              {/* {assignment.device.type.replaceAll("_", " ")} | SARPI:{" "} */}
              {assignment.device.codeSarpi || "-"}
            </p>
          </div>
        </td>

        <td className="px-6 py-4">{assignment.employee.fullname}</td>

        <td className="px-6 py-4 font-semibold">{assignment.qty}</td>

        <td className="px-6 py-4 text-slate-600">
          {assignment.device.location || "-"}
        </td>

        <td className="px-6 py-4">
          {assignment.block ? assignment.block.replaceAll("_", " ") : "-"}
        </td>

        <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-800">
          {assignment.device.hostName || "-"}
        </td>

        <td className="px-6 py-4">
          {assignment.condition.replaceAll("_", " ")}
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          {new Date(assignment.assignedAt).toLocaleDateString("en-GB")}
        </td>

        <td className="px-6 py-4 whitespace-nowrap">
          {assignment.returnedAt
            ? new Date(assignment.returnedAt).toLocaleDateString("en-GB")
            : "-"}
        </td>

        <td className="px-6 py-4">
          <span
            className={
              assignment.returnedAt
                ? "rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600"
                : "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
            }
          >
            {assignment.returnedAt ? "Returned" : "Active"}
          </span>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <AddEditAssignmentModal
              assignment={assignment}
              devices={devices}
              employees={employees}
            />
            <DeleteButton
              id={assignment.id}
              itemName="assignment"
              deleteAction={deleteAssignment}
            />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-8xl">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="mt-2 text-slate-500">
            Manage assigned IT equipment and employee allocations.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Assignments List</h2>
              <p className="text-sm text-slate-500">
                {count} assignment{count !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <TableSearch />
              <AddEditAssignmentModal devices={devices} employees={employees} />
            </div>
          </div>

          <AssignmentFilters
            devices={filterDevices as { id: number; codeSarpi: string }[]}
            employees={filterEmployees}
          />

          <Table
            columns={columns}
            renderRow={renderRow}
            data={assignments}
          />
        </div>

        <Pagination page={page} count={count} />
      </div>
    </main>
  );
}