"use client";

import { Printer } from "lucide-react";

type Props = {
  employeeId: number;
};

export default function PrintEmployeeButton({
  employeeId,
}: Props) {
  const handlePrint = () => {
    window.open(
      `/employees/${employeeId}/decharge`,
      "_blank"
    );
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      title="Print lettre de décharge"
      className="text-blue-600 hover:text-blue-800"
    >
      <Printer size={20} />
    </button>
  );
}