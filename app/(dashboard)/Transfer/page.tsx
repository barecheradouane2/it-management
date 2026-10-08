
import { prisma } from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";

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
          {
            nature: {
              equals: search as any,
            },
          },
        ],
      }
    : {};

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Expéditeur", accessor: "siteExpediteur" },
    { header: "Date Expédition", accessor: "dateExpediteur" },
    { header: "Destinataire", accessor: "siteDestinataire" },
    { header: "Date Réception", accessor: "dateDestinataire" },
    { header: "Nature", accessor: "nature" },
    { header: "Matériels", accessor: "items" },
    { header: "Note", accessor: "note" },
    { header: "Action", accessor: "action" },
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

  const renderRow = (transfer: (typeof transfers)[number]) => (
    <tr
      key={transfer.id}
      className="border-b border-gray-200 text-sm hover:bg-slate-50"
    >
      {/* ID */}
      <td className="px-6 py-4">
        {transfer.id}
      </td>

      {/* Site Expéditeur */}
      <td className="px-6 py-4 font-medium">
        {transfer.siteExpediteur}
      </td>

      {/* Date Expédition */}
      <td className="px-6 py-4">
        {new Date(transfer.dateExpediteur).toLocaleDateString("fr-FR")}
      </td>

      {/* Site Destinataire */}
      <td className="px-6 py-4">
        {transfer.siteDestinataire}
      </td>

      {/* Date Destinataire */}
      <td className="px-6 py-4">
        {transfer.dateDestinataire
          ? new Date(
              transfer.dateDestinataire
            ).toLocaleDateString("fr-FR")
          : "-"}
      </td>

      {/* Nature */}
      <td className="px-6 py-4">
        {transfer.nature}
      </td>

      {/* Devices */}
      <td className="px-6 py-4">
        <div className="space-y-1">
          {transfer.items.length > 0 ? (
            transfer.items.map((item) => (
              <div key={item.id}>
                <span className="font-medium">
                  {item.device.type}
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

      {/* Note */}
      <td className="px-6 py-4">
        {transfer.note || "-"}
      </td>

      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">

          <AddEditTransferModal
            transfer={transfer}
          />

          <DeleteButton
            id={transfer.id}
            itemName="transfer"
            deleteAction={deleteTransfer}
          />

          <PrintTransferButton
            transferId={transfer.id}
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
              Transfers
            </h1>

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
              <h1 className="text-lg font-semibold">
                Transfers List
              </h1>
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
        <Pagination
          page={page}
          count={count}
        />

      </div>
    </main>
  );
}

