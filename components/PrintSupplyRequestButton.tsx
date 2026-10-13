
"use client";

import { Printer } from "lucide-react";

type Props = {
  supplyRequestId: number;
};

export default function PrintSupplyRequestButton({
  supplyRequestId,
}: Props) {
  const handlePrint = () => {
    window.open(
      `/supplyrequest/${supplyRequestId}/print`,
      "_blank"
    );
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      title="Print supply request"
      className="text-blue-600 hover:text-blue-800"
    >
      <Printer size={20} />
    </button>
  );
}
