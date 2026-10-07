"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

const TableSearch = () => {
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const value = (e.currentTarget[0] as HTMLInputElement).value;

    const params = new URLSearchParams(window.location.search);
    params.set("search", value);
    router.push(`${window.location.pathname}?${params}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-md"
    >

      <Search
        size={18}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />

      
      <input
        type="text"
        placeholder="Search..."
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      />
    </form>
  );
};

export default TableSearch;