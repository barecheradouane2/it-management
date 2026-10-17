import type { ReactNode } from "react";

const Table = ({
  columns,
  renderRow,
  data,
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any, index: number) => ReactNode;
  data: any[];
}) => {
  return (
    <table className="w-full mt-2">
      <thead>
        <tr className="text-gray-500 text-sm">
          <th className="px-6 py-2 text-left border-b border-black">
            ID
          </th>

          {columns.map((col) => (
            <th key={col.accessor} className={col.className}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((item, index) => renderRow(item, index))}
      </tbody>
    </table>
  );
};

export default Table;