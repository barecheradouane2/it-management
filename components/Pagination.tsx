"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type PaginationProps = {
  page: number;
  count: number;
};

const Pagination = ({ page, count }: PaginationProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(count / ITEM_PER_PAGE);

  // If there are no pages or just 1 page, don't show pagination
  if (totalPages <= 1) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  // Generate pagination items with ellipses (e.g., [1, '...', 4, 5, 6, '...', 20])
  const getVisiblePages = () => {
    const delta = 1; // Number of pages to show around the current page
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-3 border-t p-4 text-gray-500 sm:justify-end">
      {/* Mobile-only page info indicator */}
      <div className="text-xs text-gray-600 sm:hidden">
        Page <span className="font-semibold text-gray-900">{page}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalPages}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          disabled={!hasPrev}
          onClick={() => changePage(page - 1)}
          className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous page"
        >
          Prev
        </button>

        {/* Page numbers (hidden on mobile, shown on tablet/desktop) */}
        <div className="hidden items-center gap-1 sm:flex">
          {getVisiblePages().map((item, index) => {
            if (item === "...") {
              return (
                <span key={`dots-${index}`} className="px-2 text-xs text-gray-400 select-none">
                  ...
                </span>
              );
            }

            const pageNum = Number(item);
            const isActive = page === pageNum;

            return (
              <button
                key={pageNum}
                onClick={() => changePage(pageNum)}
                className={`min-w-8 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  isActive
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          disabled={!hasNext}
          onClick={() => changePage(page + 1)}
          className="rounded-md bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Pagination;