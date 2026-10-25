"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { DeviceType } from "@prisma/client";

type Props = {
  deviceTypes: DeviceType[];
};

export default function NetworkDeviceFilters({ deviceTypes }: Props) {
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

      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const resetFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("type");
    params.delete("hasWifi");
    params.delete("isLinked");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const hasActiveFilters =
    Boolean(searchParams.get("type")) ||
    Boolean(searchParams.get("hasWifi")) ||
    Boolean(searchParams.get("isLinked"));

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none transition focus:border-slate-500 focus:ring-1 focus:ring-slate-500";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-slate-50/50 p-4">
      {/* Device Type Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Device Type:</span>
        <select
          value={searchParams.get("type") || ""}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className={selectClass}
        >
          <option value="">All Types</option>
          {deviceTypes.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Has Wi-Fi Configured */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Wi-Fi:</span>
        <select
          value={searchParams.get("hasWifi") || ""}
          onChange={(e) => handleFilterChange("hasWifi", e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="true">With Wi-Fi Config</option>
          <option value="false">Without Wi-Fi Config</option>
        </select>
      </div>

      {/* Linked to physical Device */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500">Inventory Status:</span>
        <select
          value={searchParams.get("isLinked") || ""}
          onChange={(e) => handleFilterChange("isLinked", e.target.value)}
          className={selectClass}
        >
          <option value="">All</option>
          <option value="true">Linked to Inventory Device</option>
          <option value="false">Standalone (No Device Link)</option>
        </select>
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