import { prisma } from "@/lib/prisma";
import { Printer } from "lucide-react";
import { ITEM_PER_PAGE } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

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

const stateOptions = ["en_Service", "Transfert", "en_Stock"] as const;

const conditionOptions = ["NEUF", "ANCIEN", "EN_PANNE"] as const;

const typeOptions = [
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
] as const;

export default async function DevicesPage({
  searchParams,
}: DevicesPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  // Validate filter values against the allowed options.
  const selectedState = stateOptions.find(
    (value) => value === params.state
  );

  const selectedCondition = conditionOptions.find(
    (value) => value === params.condition
  );

  const selectedType = typeOptions.find(
    (value) => value === params.type
  );

  const selectedBrand = params.brand?.trim() || "";

  // Build combined search and filter conditions.
  const conditions: Prisma.DeviceWhereInput[] = [];

  if (search) {
    conditions.push({
      OR: [
        {
          codeSarpi: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          serialNumber: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          brand: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          model: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          siteProject: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          note: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (selectedState) {
    conditions.push({
      state: selectedState,
    });
  }

  if (selectedCondition) {
    conditions.push({
      condition: selectedCondition,
    });
  }

  if (selectedType) {
    conditions.push({
      type: selectedType,
    });
  }

  if (selectedBrand) {
    conditions.push({
      brand: selectedBrand,
    });
  }

  const where: Prisma.DeviceWhereInput = {
    AND: conditions,
  };

  // Fetch devices, count and distinct brands in parallel.
  const [devices, count, brandRecords] = await prisma.$transaction([
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

    prisma.device.findMany({
      where: {
        brand: {
          not: "",
        },
      },
      select: {
        brand: true,
      },
      distinct: ["brand"],
      orderBy: {
        brand: "asc",
      },
    }),
  ]);

  const brands = brandRecords.map((device) => device.brand);

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
      header: "Brand",
      accessor: "brand",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Model",
      accessor: "model",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Serial Number",
      accessor: "serialNumber",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Site / Project",
      accessor: "siteProject",
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

  const renderRow = (device: (typeof devices)[number],index: number) => {
   // Adjust index based on the current page
    return (
      <tr
        key={device.id}
        className="border-b border-gray-200 text-sm hover:bg-slate-50"
      >

        <td className="px-6 py-4 font-medium">
          {index +1}
        </td>
        

        <td className="px-6 py-4 font-medium">
          {device.codeSarpi || "-"}
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
         <td className="px-6 py-4">{device.qty}</td>

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

            <Printer size={20} />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-8xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Devices</h1>

            <p className="mt-2 text-slate-500">
              Manage SARPI IT equipment inventory.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b p-4">
             <div>
                <h2 className="text-lg font-semibold">
                  Devices List
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {count} device{count !== 1 ? "s" : ""} found
                </p>
              </div>

              <div className="flex  items-center flex-1 justify-end gap-2">
                <TableSearch />

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