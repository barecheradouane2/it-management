"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AssignmentFiltersProps = {
  devices: {
    id: number;
    codeSarpi: string;
  }[];
  employees: {
    id: number;
    fullname: string;
  }[];
};

export default function AssignmentFilters({
  devices,
  employees,
}: AssignmentFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const deviceId = searchParams.get("deviceId") || "";
  const employeeId = searchParams.get("employeeId") || "";

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    // Return to page 1 when a filter changes.
    params.delete("page");

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
      <select
        value={deviceId}
        onChange={(e) => updateFilter("deviceId", e.target.value)}
        className="min-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        <option value="">All devices</option>

        {devices.map((device) => (
          <option key={device.id} value={device.id}>
            {device.codeSarpi}
          </option>
        ))}
      </select>

      <select
        value={employeeId}
        onChange={(e) => updateFilter("employeeId", e.target.value)}
        className="min-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      >
        <option value="">All employees</option>

        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullname}
          </option>
        ))}
      </select>

      {(deviceId || employeeId) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("deviceId");
            params.delete("employeeId");
            params.delete("page");

            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname);
          }}
          className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}