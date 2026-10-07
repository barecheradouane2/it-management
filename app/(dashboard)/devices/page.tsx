import { prisma } from "@/lib/prisma";
import { Printer } from "lucide-react";
import { ITEM_PER_PAGE } from "@/lib/settings";

import AddEditDeviceModal from "@/components/Modals/AddEditDeviceModal";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import { deleteDevice } from "@/lib/actions/device";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

type DevicesPageProps = {
searchParams: Promise<{
page?: string;
search?: string;
}>;
};

export default async function DevicesPage({
searchParams,
}: DevicesPageProps) {
const params = await searchParams;

const page = Math.max(1, Number(params.page) || 1);
const search = params.search?.trim() || "";

const where = search
? {
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
{
siteProject: {
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
],
}
: {};

const [devices, count] = await prisma.$transaction([
prisma.device.findMany({
where,
orderBy: {
createdAt: "desc",
},
skip: ITEM_PER_PAGE * (page - 1),
take: ITEM_PER_PAGE,
}),


prisma.device.count({
  where,
}),


]);

const columns = [
{ header: "ID", accessor: "id" },
{ header: "Code-SARPI", accessor: "codeSarpi" },
{ header: "Type", accessor: "type" },
{ header: "Brand", accessor: "brand" },
{ header: "Model", accessor: "model" },
{ header: "Serial Number", accessor: "serialNumber" },
{ header: "Site / Project", accessor: "siteProject" },
{ header: "Condition", accessor: "condition" },
{ header: "State", accessor: "state" },
{ header: "Action", accessor: "action" },
];

const renderRow = (device: (typeof devices)[number]) => ( <tr
   key={device.id}
   className="border-b border-gray-200 text-sm hover:bg-slate-50"
 > <td className="px-6 py-4">{device.id}</td>


  <td className="px-6 py-4 font-medium">
    {device.codeSarpi}
  </td>

  <td className="px-6 py-4">{device.type}</td>

  <td className="px-6 py-4">{device.brand}</td>

  <td className="px-6 py-4">{device.model || "-"}</td>

  <td className="px-6 py-4">
    {device.serialNumber || "-"}
  </td>

  <td className="px-6 py-4">
    {device.siteProject || "-"}
  </td>

  <td className="px-6 py-4">{device.condition}</td>

  <td className="px-6 py-4">{device.state}</td>

  <td className="px-6 py-4">
    <div className="flex items-center gap-3">
      <AddEditDeviceModal device={device} />

      <DeleteButton
        id={device.id}
        itemName="device"
        deleteAction={deleteDevice}
      />

      <Printer size={20} />
    </div>
  </td>
</tr>


);

return ( <main className="min-h-screen bg-slate-50 p-8"> <div className="mx-auto max-w-8xl"> <div className="flex items-center justify-between"> <div> <h1 className="text-3xl font-bold">Devices</h1>


        <p className="mt-2 text-slate-500">
          Manage SARPI IT equipment inventory.
        </p>
      </div>
    </div>

    <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">
            Devices List
          </h2>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          <TableSearch />

          <AddEditDeviceModal />
        </div>
      </div>

      <Table
        columns={columns}
        renderRow={renderRow}
        data={devices}
      />
    </div>

    <Pagination page={page} count={count} />
  </div>
</main>


);
}
