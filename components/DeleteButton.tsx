"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

type Props = {
id: number;
itemName: string;
deleteAction: (id: number) => Promise<{
success: boolean;
error?: string;
}>;
};

export default function DeleteButton({
id,
itemName,
deleteAction,
}: Props) {
const [deleting, setDeleting] = useState(false);

const handleDelete = async () => {
const confirmed = window.confirm(
`Are you sure you want to delete this ${itemName}?`
);


if (!confirmed) return;

setDeleting(true);

try {
  const result = await deleteAction(id);

  if (!result.success) {
    toast.error(result.error || `Failed to delete ${itemName}.`);
    return;
  }

  toast.success(`${itemName} deleted successfully!`);
} catch (error) {
  console.error(`Error deleting ${itemName}:`, error);
  toast.error(`Something went wrong while deleting ${itemName}.`);
} finally {
  setDeleting(false);
}

};

return (
<button
type="button"
onClick={handleDelete}
disabled={deleting}
title={`Delete ${itemName}`}
aria-label={`Delete ${itemName}`}
className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
> <Trash2 size={16} />
{deleting ? "Deleting..." : ""} </button>
);
}
