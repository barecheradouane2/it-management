"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type DeviceFiltersProps = {
  brands: string[];
};

const states = ["en_Service", "Transfert", "en_Stock"];
const conditions = ["NEUF", "ANCIEN", "EN_PANNE"];
const types = [
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

const selectClass =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

export default function DeviceFilters({ brands }: DeviceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("state");
    params.delete("condition");
    params.delete("type");
    params.delete("brand");
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 py-4 px-4 bg-slate-50/50 border-b border-slate-100">
      <select
        value={searchParams.get("state") ?? ""}
        onChange={(event) => updateFilter("state", event.target.value)}
        className={selectClass}
        aria-label="Filter by state"
      >
        <option value="">All states</option>
        {states.map((state) => (
          <option key={state} value={state}>
            {state}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("condition") ?? ""}
        onChange={(event) => updateFilter("condition", event.target.value)}
        className={selectClass}
        aria-label="Filter by condition"
      >
        <option value="">All conditions</option>
        {conditions.map((condition) => (
          <option key={condition} value={condition}>
            {condition}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("type") ?? ""}
        onChange={(event) => updateFilter("type", event.target.value)}
        className={selectClass}
        aria-label="Filter by type"
      >
        <option value="">All types</option>
        {types.map((type) => (
          <option key={type} value={type}>
            {type.replaceAll("_", " ")}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("brand") ?? ""}
        onChange={(event) => updateFilter("brand", event.target.value)}
        className={selectClass}
        aria-label="Filter by brand"
      >
        <option value="">All brands</option>
        {brands.map((brand) => (
          <option key={brand} value={brand}>
            {brand}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={clearFilters}
        className="rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-700 transition hover:bg-gray-100 ml-auto"
      >
        Clear filters
      </button>
    </div>
  );
}