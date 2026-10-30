"use client";

import { FileSpreadsheet } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ExportRecensementButton({
  deviceId,
  label = "Export Excel",
  variant = "button",
}: {
  deviceId?: string;
  label?: string;
  variant?: "button" | "icon";
}) {
  const searchParams = useSearchParams();

  const handleExport = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (deviceId) {
      params.set("deviceId", deviceId);
    }
    window.location.href = `/devices/export-recensement?${params.toString()}`;
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        title="Export Fiche Recensement"
        onClick={handleExport}
        className="text-slate-600 transition-colors hover:text-green-700"
      >
        <FileSpreadsheet size={20} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
    >
      <FileSpreadsheet size={18} className="text-emerald-600" />
      <span>{label}</span>
    </button>
  );
}