import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { SupplyRequestStatus } from "@prisma/client";

import AddEditSupplyRequestModal from "@/components/Modals/AddEditSupplyRequestModal";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import PrintSupplyRequestButton from "@/components/PrintSupplyRequestButton";

import { deleteSupplyRequest } from "@/lib/actions/supplyRequest";

type SupplyRequestsPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function SupplyRequestsPage({
  searchParams,
}: SupplyRequestsPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  // Validate at runtime whether the search query matches a valid enum value
  const isEnumStatus = Object.values(SupplyRequestStatus).includes(
    search.toUpperCase() as SupplyRequestStatus
  );

  const where = search
    ? {
        OR: [
          {
            requestNumber: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            purpose: {
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
            items: {
              some: {
                designation: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          },
          {
            items: {
              some: {
                referenceCode: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            },
          },
          // Only add the status filter if the search string is actually a valid enum member
          ...(isEnumStatus
            ? [
                {
                  status: {
                    equals: search.toUpperCase() as SupplyRequestStatus,
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  const columns = [
    { header: "N° Demande", accessor: "requestNumber", className: "px-6 text-left border-b-1 border-black" },
    { header: "Objet", accessor: "purpose", className: "px-6 text-left border-b-1 border-black" },
    { header: "Date Demande", accessor: "requestDate", className: "px-6 text-left border-b-1 border-black" },
    { header: "Échéance Souhaitée", accessor: "desiredDeadline", className: "px-6 text-left border-b-1 border-black" },
    { header: "Statut", accessor: "status", className: "px-6 text-left border-b-1 border-black" },
    { header: "Articles", accessor: "items", className: "px-6 text-left border-b-1 border-black" },
    { header: "Note", accessor: "note", className: "px-6 text-left border-b-1 border-black" },
    { header: "Actions", accessor: "action", className: "px-6 text-left border-b-1 border-black" },
  ];

  const [supplyRequests, count] = await prisma.$transaction([
    prisma.supplyRequest.findMany({
      where,
      include: {
        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        requestDate: "desc",
      },
      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),

    prisma.supplyRequest.count({
      where,
    }),
  ]);

  const formatDate = (date: Date | null | undefined) =>
    date ? new Date(date).toLocaleDateString("fr-FR") : "-";

  const statusLabels: Record<string, string> = {
    BROUILLON: "Brouillon",
    EN_ATTENTE: "En attente",
    APPROUVEE: "Approuvée",
    PARTIELLEMENT_APPROUVEE: "Partiellement approuvée",
    REJETEE: "Rejetée",
    LIVREE: "Livrée",
  };

  const statusStyles: Record<string, string> = {
    BROUILLON: "bg-gray-100 text-gray-700",
    EN_ATTENTE: "bg-amber-100 text-amber-800",
    APPROUVEE: "bg-blue-100 text-blue-800",
    PARTIELLEMENT_APPROUVEE: "bg-purple-100 text-purple-800",
    REJETEE: "bg-red-100 text-red-800",
    LIVREE: "bg-green-100 text-green-800",
  };

  const renderRow = (
    request: (typeof supplyRequests)[number],
    index: number
  ) => (
    <tr
      key={request.id}
      className="border-b border-gray-200 text-sm hover:bg-slate-50"
    >
      {/* Index calculation with pagination */}
      <td className="px-6 py-4">{ITEM_PER_PAGE * (page - 1) + index + 1}</td>

      {/* Request Number */}
      <td className="px-6 py-4 font-medium whitespace-nowrap">
        {request.requestNumber}
      </td>

      {/* Purpose */}
      <td className="px-6 py-4 min-w-48">
        {request.purpose}
      </td>

      {/* Request Date */}
      <td className="px-6 py-4 whitespace-nowrap">
        {formatDate(request.requestDate)}
      </td>

      {/* Desired Deadline */}
      <td className="px-6 py-4 whitespace-nowrap">
        {formatDate(request.desiredDeadline)}
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
            statusStyles[request.status] ??
            "bg-gray-100 text-gray-700"
          }`}
        >
          {statusLabels[request.status] ?? request.status}
        </span>
      </td>

      {/* Items */}
      <td className="px-6 py-4 min-w-64">
        <div className="space-y-2">
          {request.items.length > 0 ? (
            request.items.map((item) => (
              <div
                key={item.id}
                className="border-b border-gray-100 pb-2 last:border-0 last:pb-0"
              >
                <div className="font-medium">
                  {item.designation}
                </div>

                {item.referenceCode && (
                  <div className="text-xs text-slate-500">
                    Réf. : {item.referenceCode}
                  </div>
                )}

                <div className="text-xs text-slate-600">
                  Demandée : {item.requestedQuantity}{" "}
                  {item.unit}
                  {" · "}
                  Approuvée : {item.approvedQuantity ?? "-"}
                </div>
              </div>
            ))
          ) : (
            "-"
          )}
        </div>
      </td>

      {/* Note */}
      <td className="px-6 py-4 min-w-40">
        {request.note || "-"}
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <AddEditSupplyRequestModal
            supplyRequest={request}
          />

          <DeleteButton
            id={request.id}
            itemName="supplyRequest"
            deleteAction={deleteSupplyRequest}
          />

          <PrintSupplyRequestButton
            supplyRequestId={request.id}
          />
        </div>
      </td>
    </tr>
  );

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-8xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              Supply Requests
            </h1>

            <p className="mt-2 text-slate-500">
              Manage supply requests, requested quantities,
              approvals, and delivery status.
            </p>
          </div>
        </div>

        {/* Supply Requests Card */}
        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h2 className="text-lg font-semibold">
                Supply Requests List
              </h2>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <TableSearch />
              <AddEditSupplyRequestModal />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              renderRow={renderRow}
              data={supplyRequests}
            />
          </div>
        </div>

        {/* Pagination */}
        <Pagination
          page={page}
          count={count}
        />
      </div>
    </main>
  );
}