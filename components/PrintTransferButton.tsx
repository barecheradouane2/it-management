
"use client";

import { Printer } from "lucide-react";

type Props = {
  transferId: number;
};

export default function PrintTransferButton({
  transferId,
}: Props) {
  const handlePrint = () => {
    window.open(
      `/Transfer/${transferId}/print`,
      "_blank"
    );
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      title="Print transfer"
      className="text-blue-600 hover:text-blue-800"
    >
      <Printer size={20} />
    </button>
  );
}

