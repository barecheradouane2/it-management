import { prisma } from "@/lib/prisma";
import { Printer } from "lucide-react";
import { ITEM_PER_PAGE } from "@/lib/settings";
import type { Prisma, DeviceType, DeviceCondition, DeviceState } from "@prisma/client";
import ExportRecensementButton from "@/components/ExportRecensementButton";

import AddEditDeviceModal from "@/components/Modals/AddEditDeviceModal";
import DeviceFilters from "@/components/DeviceFilters";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import { deleteDevice } from "@/lib/actions/device";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";

type DevicesPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    state?: string;
    condition?: string;
    type?: string;
    brand?: string;
  }>;
};

const stateOptions: DeviceState[] = ["en_Service", "Transfert", "en_Stock"];
const conditionOptions: DeviceCondition[] = ["NEUF", "ANCIEN", "EN_PANNE"];
const typeOptions: DeviceType[] = [
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
  "BATTERIE",
  "ADAPTATEUR_WIFI",
  "HARD_DISK_EXTERN",
];

export default async function DevicesPage({
  searchParams,
}: DevicesPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  const selectedState = stateOptions.find((value) => value === params.state);
  const selectedCondition = conditionOptions.find((value) => value === params.condition);
  const selectedType = typeOptions.find((value) => value === params.type);
  const selectedBrand = params.brand?.trim() || "";

  const conditions: Prisma.DeviceWhereInput[] = [];

  if (search) {
    conditions.push({
      OR: [
        { codeSarpi: { contains: search, mode: "insensitive" } },
        { serialNumber: { contains: search, mode: "insensitive" } },
        { hostName: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { model: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (selectedState) {
    conditions.push({ state: selectedState });
  }

  if (selectedCondition) {
    conditions.push({ condition: selectedCondition });
  }

  if (selectedType) {
    conditions.push({ type: selectedType });
  }

  if (selectedBrand) {
    conditions.push({ brand: selectedBrand });
  }

  const where: Prisma.DeviceWhereInput = {
    AND: conditions,
  };

  // Run read queries in parallel via Promise.all
  const [devices, count, brandRecords] = await Promise.all([
    prisma.device.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),
    prisma.device.count({ where }),
    prisma.device.findMany({
      where: { brand: { not: "" } },
      select: { brand: true },
      distinct: ["brand"],
      orderBy: { brand: "asc" },
    }),
  ]);

  const brands = brandRecords.map((d) => d.brand);

  const columns = [
   
    {
      header: "Code-SARPI",
      accessor: "codeSarpi",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Type",
      accessor: "type",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Brand / Model",
      accessor: "brand",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Hostname / Serial",
      accessor: "serialNumber",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Location",
      accessor: "location",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Condition",
      accessor: "condition",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Qty",
      accessor: "qty",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "State",
      accessor: "state",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Action",
      accessor: "action",
      className: "px-6 py-2 text-left border-b border-black",
    },
  ];

  const getStateStyle = (state: string) => {
    switch (state) {
      case "en_Stock":
        return "bg-green-100 text-green-800 border border-green-300";
      case "en_Service":
        return "bg-blue-100 text-blue-800 border border-blue-300";
      case "Transfert":
        return "bg-orange-100 text-orange-800 border border-orange-300";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-300";
    }
  };

  const renderRow = (device: (typeof devices)[number], index: number) => {
    const itemNumber = (page - 1) * ITEM_PER_PAGE + index + 1;

    return (
      <tr
        key={device.id}
        className="border-b border-gray-200 text-sm hover:bg-slate-50"
      >
        <td className="px-6 py-4 font-medium">{itemNumber}</td>

        <td className="px-6 py-4 font-medium">
          {device.codeSarpi || "-"}
        </td>

        <td className="px-6 py-4">{device.type.replaceAll("_", " ")}</td>

        <td className="px-6 py-4">
          <p className="font-semibold text-slate-900">{device.brand}</p>
          <p className="text-xs text-slate-500">{device.model || "-"}</p>
        </td>

        <td className="px-6 py-4">
          <p className="font-mono text-xs font-semibold text-slate-800">
            {device.hostName || "-"}
          </p>
          <p className="text-xs text-slate-400">
            SN: {device.serialNumber || "-"}
          </p>
        </td>

        <td className="px-6 py-4">{device.location || "-"}</td>

        <td className="px-6 py-4">{device.condition}</td>

        <td className="px-6 py-4 font-semibold">{device.qty}</td>

        <td className="px-6 py-4">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStateStyle(
              device.state
            )}`}
          >
            {device.state}
          </span>
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <AddEditDeviceModal device={device} />
            <DeleteButton
              id={device.id}
              itemName="device"
              deleteAction={deleteDevice}
            />
            <Printer size={20} className="cursor-pointer text-slate-600 hover:text-black" />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-8xl">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Devices List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {count} device{count !== 1 ? "s" : ""} found
              </p>
            </div>

           <div className="flex flex-1 items-center justify-end gap-2">
  <TableSearch />
  <ExportRecensementButton label="Fiche Recensement" />
  <AddEditDeviceModal />
</div>
          </div>

          <DeviceFilters brands={brands} />

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