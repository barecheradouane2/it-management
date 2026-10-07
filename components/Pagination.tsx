"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { useRouter } from "next/navigation";

type PaginationProps = {
  page: number;
  count: number;
};

const Pagination = ({ page, count }: PaginationProps) => {
  const router = useRouter();

  const totalPages = Math.ceil(count / ITEM_PER_PAGE);

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);

    params.set("page", newPage.toString());

    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-4 justify-end border-t p-4 text-gray-500">
      {/* Previous */}
      <button
        disabled={!hasPrev}
        onClick={() => changePage(page - 1)}
        className="rounded-md bg-slate-200 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Prev
      </button>

      {/* Page numbers */}
      <div className="flex items-center gap-2 text-sm">
        {Array.from(
          { length: totalPages },
          (_, index) => {
            const pageIndex = index + 1;

            return (
              <button
                key={pageIndex}
                onClick={() => changePage(pageIndex)}
                className={`min-w-8 rounded-md px-2 py-1 ${
                  page === pageIndex
                    ? "bg-slate-900 text-white"
                    : "hover:bg-slate-100"
                }`}
              >
                {pageIndex}
              </button>
            );
          }
        )}
      </div>

      {/* Next */}
      <button
        disabled={!hasNext}
        onClick={() => changePage(page + 1)}
        className="rounded-md bg-slate-200 px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;