import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { MaterialNature } from "@prisma/client";

import AddEditTransferModal from "@/components/Modals/AddEditTransferModal";
import Pagination from "@/components/Pagination";
import DeleteButton from "@/components/DeleteButton";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import PrintTransferButton from "@/components/PrintTransferButton";

import { deleteTransfer } from "@/lib/actions/transfer";

type TransfersPageProps = {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
};

export default async function TransfersPage({
  searchParams,
}: TransfersPageProps) {
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const search = params.search?.trim() || "";

  // Check if search query matches any MaterialNature enum value
  const isEnumNature = Object.values(MaterialNature).includes(
    search.toUpperCase() as MaterialNature
  );

  const where = search
    ? {
        OR: [
          {
            siteExpediteur: {
              contains: search,
              mode: "insensitive" as const,
            },
          },
          {
            siteDestinataire: {
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
          // Search in linked device details
          {
            items: {
              some: {
                device: {
                  OR: [
                    {
                      codeSarpi: {
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
          },
          // Only filter by nature if the search string is actually a valid enum value
          ...(isEnumNature
            ? [
                {
                  nature: {
                    equals: search.toUpperCase() as MaterialNature,
                  },
                },
              ]
            : []),
        ],
      }
    : {};

  const columns = [
  
    { header: "Expéditeur", accessor: "siteExpediteur", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Date Expédition", accessor: "dateExpediteur", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Destinataire", accessor: "siteDestinataire", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Date Réception", accessor: "dateDestinataire", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Nature", accessor: "nature", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Matériels", accessor: "items", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Note", accessor: "note", className: "px-6 py-2 text-left border-b-1 border-black" },
    { header: "Action", accessor: "action", className: "px-6 py-2 text-left border-b-1 border-black" },
  ];

  const [transfers, count] = await prisma.$transaction([
    prisma.transfer.findMany({
      where,
      include: {
        items: {
          include: {
            device: true,
          },
        },
      },
      orderBy: {
        dateExpediteur: "desc",
      },
      skip: ITEM_PER_PAGE * (page - 1),
      take: ITEM_PER_PAGE,
    }),
    prisma.transfer.count({
      where,
    }),
  ]);

  const renderRow = (transfer: (typeof transfers)[number], index: number) => {
    
   const itemNumber = (page - 1) * ITEM_PER_PAGE + index + 1;

     return (

    <tr
      key={transfer.id}
      className="border-b border-gray-200 text-sm hover:bg-slate-50"
    >
      <td className="px-6 py-4 font-medium">
        {itemNumber}
      </td>

      <td className="px-6 py-4 font-medium">
        {transfer.siteExpediteur}
      </td>

      <td className="px-6 py-4">
        {new Date(transfer.dateExpediteur).toLocaleDateString("fr-FR")}
      </td>

      <td className="px-6 py-4">
        {transfer.siteDestinataire}
      </td>

      <td className="px-6 py-4">
        {transfer.dateDestinataire
          ? new Date(transfer.dateDestinataire).toLocaleDateString("fr-FR")
          : "-"}
      </td>

      <td className="px-6 py-4">
        {transfer.nature}
      </td>

      <td className="px-6 py-4">
        <div className="space-y-1">
          {transfer.items.length > 0 ? (
            transfer.items.map((item) => (
              <div key={item.id}>
                <span className="font-medium">
                  {item.device.type.replaceAll("_", " ")}
                </span>
                <span className="ml-2 text-slate-500">
                  x{item.quantity}
                </span>
              </div>
            ))
          ) : (
            "-"
          )}
        </div>
      </td>

      <td className="px-6 py-4">
        {transfer.note || "-"}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <AddEditTransferModal transfer={transfer} />
          <DeleteButton
            id={transfer.id}
            itemName="transfer"
            deleteAction={deleteTransfer}
          />
          <PrintTransferButton transferId={transfer.id} />
        </div>
      </td>
    </tr>
    )
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5">
      <div className="mx-auto max-w-8xl">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Transfers</h1>
            <p className="mt-2 text-slate-500">
              Manage IT equipment transfers between sites.
            </p>
          </div>
        </div>

        {/* Transfers Card */}
        <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h1 className="text-lg font-semibold">Transfers List</h1>
            </div>

            <div className="flex flex-1 items-center justify-end gap-2">
              <TableSearch />
              <AddEditTransferModal />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table
              columns={columns}
              renderRow={renderRow}
              data={transfers}
            />
          </div>
        </div>

        {/* Pagination */}
        <Pagination page={page} count={count} />
      </div>
    </main>
  );
}