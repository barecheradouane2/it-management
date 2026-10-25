"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { DeviceType, Service } from "@prisma/client";

type Props = {
  types: DeviceType[];
  services: Service[];
};

export default function ConsumptionFilters({ types, services }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilterChange = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }

      // Reset to page 1 on filter modification
      params.set("page", "1");

      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("service");
    params.delete("startDate");
    params.delete("endDate");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    Boolean(searchParams.get("type")) ||
    Boolean(searchParams.get("service")) ||
    Boolean(searchParams.get("startDate")) ||
    Boolean(searchParams.get("endDate"));

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Type:</span>
        <select
          value={searchParams.get("type") || ""}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Service:</span>
        <select
          value={searchParams.get("service") || ""}
          onChange={(e) => handleFilterChange("service", e.target.value)}
          className={selectClass}
        >
          <option value="">All Services</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">From:</span>
        <input
          type="date"
          value={searchParams.get("startDate") || ""}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          className={selectClass}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">To:</span>
        <input
          type="date"
          value={searchParams.get("endDate") || ""}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          className={selectClass}
        />
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="text-xs font-medium text-red-600 hover:underline ml-auto"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}