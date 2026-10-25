import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import type { Prisma, DeviceType, Service } from "@prisma/client";
import { Printer } from "lucide-react";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import AddEditConsumptionModal from "@/components/Modals/AddEditConsumptionModal";
import ConsumptionFilters from "@/components/ConsumptionFilters";
import { deleteConsumption } from "@/lib/actions/consumption";

type ConsumptionsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    service?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

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

const serviceOptions: Service[] = [
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

export default async function ConsumptionsPage({
  searchParams,
}: ConsumptionsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  // Validate filter values
  const selectedType = typeOptions.find((value) => value === params.type);
  const selectedService = serviceOptions.find(
    (value) => value === params.service
  );

  // Build combined search and filter conditions
  const conditions: Prisma.ConsumptionWhereInput[] = [];

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
            ],
          },
        },
        {
          employee: {
            fullname: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          user: {
            fullname: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    });
  }

  if (selectedType) {
    conditions.push({
      device: {
        type: selectedType,
      },
    });
  }

  if (selectedService) {
    conditions.push({
      employee: {
        service: selectedService,
      },
    });
  }

  if (params.startDate || params.endDate) {
    conditions.push({
      consumedAt: {
        ...(params.startDate && { gte: new Date(params.startDate) }),
        ...(params.endDate && { lte: new Date(params.endDate) }),
      },
    });
  }

  const where: Prisma.ConsumptionWhereInput = {
    AND: conditions,
  };

  // Run all read queries concurrently via Promise.all to avoid pg client pipelining conflicts
  const [consumptions, count, availableDevices, employees] = await Promise.all([
    prisma.consumption.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            brand: true,
            model: true,
            type: true,
            codeSarpi: true,
            serialNumber: true,
            qty: true,
          },
        },
        employee: {
          select: {
            id: true,
            fullname: true,
            service: true,
          },
        },
        user: {
          select: {
            id: true,
            fullname: true,
          },
        },
      },
      orderBy: {
        consumedAt: "desc",
      },
      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),

    prisma.consumption.count({
      where,
    }),

    prisma.device.findMany({
      where: {
        qty: { gt: 0 },
      },
      select: {
        id: true,
        brand: true,
        model: true,
        type: true,
        qty: true,
      },
      orderBy: {
        brand: "asc",
      },
    }),

    prisma.employee.findMany({
      select: {
        id: true,
        fullname: true,
        service: true,
      },
      orderBy: {
        fullname: "asc",
      },
    }),
  ]);

  const columns = [
   
    {
      header: "Device",
      accessor: "device",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Type",
      accessor: "type",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Consumed Qty",
      accessor: "quantity",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Beneficiary (Employee)",
      accessor: "employee",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Service",
      accessor: "service",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Recorded By",
      accessor: "user",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Date",
      accessor: "consumedAt",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Note",
      accessor: "note",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Action",
      accessor: "action",
      className: "px-6 py-2 text-left border-b border-black",
    },
  ];

  const renderRow = (
    item: (typeof consumptions)[number],
    index: number
  ) => {
    const itemNumber = (page - 1) * ITEM_PER_PAGE + index + 1;

    return (
      <tr
        key={item.id}
        className="border-b border-gray-200 text-sm hover:bg-slate-50"
      >
        <td className="px-6 py-4 font-medium">{itemNumber}</td>

        <td className="px-6 py-4 font-medium">
          <div>
            <p className="font-semibold text-slate-900">
              {item.device.brand} {item.device.model ?? ""}
            </p>
            <p className="text-xs text-slate-500">
              SARPI: {item.device.codeSarpi || "-"} | SN:{" "}
              {item.device.serialNumber || "-"}
            </p>
          </div>
        </td>

        <td className="px-6 py-4">{item.device.type}</td>

        <td className="px-6 py-4 font-semibold text-red-600">
          -{item.quantity}
        </td>

        <td className="px-6 py-4">
          {item.employee?.fullname || <span className="text-slate-400">-</span>}
        </td>

        <td className="px-6 py-4">
          {item.employee?.service ? (
            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {item.employee.service}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>

        <td className="px-6 py-4 text-slate-600">
          {item.user?.fullname || "-"}
        </td>

        <td className="px-6 py-4 whitespace-nowrap text-slate-600">
          {new Date(item.consumedAt).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </td>

        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
          {item.note || "-"}
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <AddEditConsumptionModal
              consumption={item}
              devices={availableDevices}
              employees={employees}
            />

            <DeleteButton
              id={item.id}
              itemName="consumption log"
              deleteAction={deleteConsumption}
            />

            <Printer
              size={20}
              className="cursor-pointer text-slate-600 hover:text-black"
            />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5">
      <div className="mx-auto max-w-8xl">
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">Consumptions List</h2>
              <p className="mt-1 text-sm text-slate-500">
                {count} record{count !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <TableSearch />

              <AddEditConsumptionModal
                devices={availableDevices}
                employees={employees}
              />
            </div>
          </div>

          <ConsumptionFilters
            types={typeOptions}
            services={serviceOptions}
          />

          <Table
            columns={columns}
            renderRow={renderRow}
            data={consumptions}
          />
        </div>

        <Pagination page={page} count={count} />
      </div>
    </main>
  );
}