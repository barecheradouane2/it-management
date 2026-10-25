import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import type { Prisma, DeviceType } from "@prisma/client";
import { Wifi, ShieldAlert, Laptop } from "lucide-react";

import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import AddEditNetworkDeviceModal from "@/components/Modals/AddNetworkDeviceModal";
import NetworkDeviceFilters from "@/components/NetworkDeviceFilter";
import { deleteNetworkDevice } from "@/lib/actions/networkdevice";

type NetworkDevicesPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    hasWifi?: string;
    isLinked?: string;
  }>;
};

const networkRelevantTypes: DeviceType[] = [
  "POINT_ACCES",
  "SWITCH",
  "IMPRIMANTE",
  "UNITE",
  "LAPTOP",
  "ADAPTATEUR_WIFI",
];

export default async function NetworkDevicesPage({
  searchParams,
}: NetworkDevicesPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  const selectedType = networkRelevantTypes.find((t) => t === params.type);
  const hasWifi = params.hasWifi;
  const isLinked = params.isLinked;

  const conditions: Prisma.NetworkDeviceWhereInput[] = [];

  // Search filter
  if (search) {
    conditions.push({
      OR: [
        { host: { contains: search, mode: "insensitive" } },
        { wifiSsid: { contains: search, mode: "insensitive" } },
        { adminLogin: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        {
          device: {
            OR: [
              { codeSarpi: { contains: search, mode: "insensitive" } },
              { serialNumber: { contains: search, mode: "insensitive" } },
              { brand: { contains: search, mode: "insensitive" } },
              { model: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    });
  }

  // Type filter
  if (selectedType) {
    conditions.push({
      device: {
        type: selectedType,
      },
    });
  }

  // Wi-Fi filter
  if (hasWifi === "true") {
    conditions.push({ wifiSsid: { not: null } });
  } else if (hasWifi === "false") {
    conditions.push({ wifiSsid: null });
  }

  // Linked to physical inventory filter
  if (isLinked === "true") {
    conditions.push({ deviceId: { not: null } });
  } else if (isLinked === "false") {
    conditions.push({ deviceId: null });
  }

  const where: Prisma.NetworkDeviceWhereInput = {
    AND: conditions,
  };

  // Run read queries concurrently via Promise.all
  const [networkDevices, count, devices] = await Promise.all([
    prisma.networkDevice.findMany({
      where,
      include: {
        device: {
          select: {
            id: true,
            codeSarpi: true,
            serialNumber: true,
            brand: true,
            model: true,
            type: true,
            location: true,
            state: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),

    prisma.networkDevice.count({ where }),

    // Fetch devices for the link selector
    prisma.device.findMany({
      select: {
        id: true,
        codeSarpi: true,
        serialNumber: true,
        brand: true,
        model: true,
        type: true,
        location: true,
      },
      orderBy: { brand: "asc" },
    }),
  ]);

  const columns = [
    
    {
      header: "Device / Hardware",
      accessor: "device",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Host / IP",
      accessor: "host",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Location (Bureau)",
      accessor: "location",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Wi-Fi (SSID / Pass)",
      accessor: "wifi",
      className: "px-6 py-2 text-left border-b border-black",
    },
    {
      header: "Admin Credentials",
      accessor: "admin",
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
    item: (typeof networkDevices)[number],
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
          {item.device ? (
            <div>
              <p className="font-semibold text-slate-900">
                {item.device.brand} {item.device.model ?? ""}
              </p>
              <p className="text-xs text-slate-500">
                {item.device.type.replaceAll("_", " ")} | SARPI:{" "}
                {item.device.codeSarpi || "-"} | SN: {item.device.serialNumber || "-"}
              </p>
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs italic text-slate-400">
              <Laptop size={14} /> Standalone (Non lié)
            </span>
          )}
        </td>

        <td className="px-6 py-4 font-mono font-medium text-slate-800">
          {item.host || "-"}
        </td>

        <td className="px-6 py-4 text-slate-600">
          {item.device?.location || "-"}
        </td>

        <td className="px-6 py-4">
          {item.wifiSsid ? (
            <div>
              <p className="flex items-center gap-1 font-medium text-slate-900">
                <Wifi size={14} className="text-blue-500" />
                {item.wifiSsid}
              </p>
              <p className="font-mono text-xs text-slate-500">
                Pass: {item.wifiPassword || "Non configuré"}
              </p>
            </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>

        <td className="px-6 py-4">
          {item.adminLogin || item.adminPassword ? (
            <div>
              <p className="flex items-center gap-1 font-medium text-slate-800">
                <ShieldAlert size={14} className="text-amber-500" />
                User: {item.adminLogin || "-"}
              </p>
              <p className="font-mono text-xs text-slate-500">
                Pass: {item.adminPassword || "-"}
              </p>
            </div>
          ) : (
            <span className="text-slate-400">-</span>
          )}
        </td>

        <td className="px-6 py-4 text-slate-500 max-w-xs truncate">
          {item.note || "-"}
        </td>

        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <AddEditNetworkDeviceModal
              networkDevice={item}
              devices={devices}
            />

            <DeleteButton
              id={item.id}
              itemName="équipement réseau"
              deleteAction={deleteNetworkDevice}
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
              <h2 className="text-lg font-semibold">Network Devices & Wi-Fi</h2>
              <p className="mt-1 text-sm text-slate-500">
                {count} équipement{count !== 1 ? "s" : ""} enregistré{count !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <TableSearch />
              <AddEditNetworkDeviceModal devices={devices} />
            </div>
          </div>

          <NetworkDeviceFilters deviceTypes={networkRelevantTypes} />

          <Table
            columns={columns}
            renderRow={renderRow}
            data={networkDevices}
          />
        </div>

        <Pagination page={page} count={count} />
      </div>
    </main>
  );
}