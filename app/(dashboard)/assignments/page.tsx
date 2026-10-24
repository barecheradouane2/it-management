import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";

import AddEditAssignmentModal from "@/components/Modals/AddEditAssignmentModal";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

import { deleteAssignment } from "@/lib/actions/assignment";

type AssignmentsPageProps = {
searchParams: Promise<{
page?: string;
search?: string;
}>;
};

export default async function AssignmentsPage({
searchParams,
}: AssignmentsPageProps) {
const params = await searchParams;

const page = Math.max(1, Number(params.page) || 1);
const search = params.search?.trim() || "";

const where = search
? {
OR: [
{
bureau: {
contains: search,
mode: "insensitive" as const,
},
},
{
hostName: {
contains: search,
mode: "insensitive" as const,
},
},
{
note: {
contains: search,
mode: "insensitive" as const,
},
},
{
device: {
is: {
OR: [
{
codeSarpi: {
contains: search,
mode: "insensitive" as const,
},
},
{
serialNumber: {
contains: search,
mode: "insensitive" as const,
},
},
{
brand: {
contains: search,
mode: "insensitive" as const,
},
},
{
model: {
contains: search,
mode: "insensitive" as const,
},
},
],
},
},
},
{
employee: {
is: {
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
],
},
},
},
],
}
: {};

const [devices, employees] = await Promise.all([
  prisma.device.findMany({

    //  where: {
    //   state: "en_Stock",
    //   qty: {
    //     gt: 0,
    //   },
    // },
    
    select: {
      id: true,
      codeSarpi: true,
      brand: true,
      model: true,
      state:true,
      qty:true,
      type: true

    },
    orderBy: {
      codeSarpi: "asc",
    },
  }),

  prisma.employee.findMany({
    select: {
      id: true,
      fullname: true,
    },
    orderBy: {
      fullname: "asc",
    },
  }),
]);

const [assignments, count] = await prisma.$transaction([
prisma.assignment.findMany({
where,
include: {
device: true,
employee: true,
},
orderBy: {
assignedAt: "desc",
},
skip: ITEM_PER_PAGE * (page - 1),
take: ITEM_PER_PAGE,
}),


prisma.assignment.count({ where }),


]);

const columns = [

{ header: "Device Code", accessor: "device" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Employee", accessor: "employee" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Qty", accessor: "qty", className: "px-6 py-2 text-left border-b-1 border-black" },
{ header: "Bureau", accessor: "bureau" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Block", accessor: "block" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Hostname", accessor: "hostName" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Condition", accessor: "condition" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Assigned At", accessor: "assignedAt" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Returned At", accessor: "returnedAt" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Status", accessor: "status" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
{ header: "Action", accessor: "action" ,className: "px-6 py-2  text-left  border-b-1 border-black" },
];

const renderRow = (
assignment: (typeof assignments)[number]
) => {

    const index = assignments.findIndex((d) => d.id === assignment.id);
  
  return ( <tr
   key={assignment.id}
   className="border-b border-gray-200 text-sm hover:bg-slate-50"
 > 
 <td className="px-5 py-4">{index + 1}</td>


  <td className="px-5 py-4 font-medium">
    {assignment.device.codeSarpi}
    <div className="text-xs text-slate-500">
      {assignment.device.type ?? " "}{" "}
      {assignment.device.brand}
      
    </div>
  </td>

  <td className="px-5 py-4">
    {assignment.employee.fullname}
  </td>

  <td className="px-5 py-4 font-semibold">{assignment.qty}</td>

  <td className="px-5 py-4">
    {assignment.bureau || "-"}
  </td>

  <td className="px-5 py-4">
    {assignment.block
      ? assignment.block.replaceAll("_", " ")
      : "-"}
  </td>

  <td className="px-5 py-4">
    {assignment.hostName || "-"}
  </td>

  <td className="px-5 py-4">
    {assignment.condition.replaceAll("_", " ")}
  </td>

  <td className="px-5 py-4">
    {assignment.assignedAt.toLocaleDateString("en-GB")}
  </td>

  <td className="px-5 py-4">
    {assignment.returnedAt
      ? assignment.returnedAt.toLocaleDateString("en-GB")
      : "-"}
  </td>

  <td className="px-5 py-4">
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

  <td className="px-5 py-4">
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


); };

return ( <main className="min-h-screen bg-slate-50 p-8"> <div className="mx-auto max-w-8xl"> <div> <h1 className="text-3xl font-bold">Assignments</h1>


      <p className="mt-2 text-slate-500">
        Manage assigned IT equipment and employee allocations.
      </p>
    </div>

    <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b p-4">
        <h2 className="text-lg font-semibold">
          Assignments List
        </h2>

        <div className="flex flex-1 items-center justify-end gap-2">
          <TableSearch />
          <AddEditAssignmentModal devices={devices} employees={employees} />
        </div>
      </div>

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
