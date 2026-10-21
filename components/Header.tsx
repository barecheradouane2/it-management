
"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { LogOut, ChevronDown, UserRound } from "lucide-react";

import Link from "next/link";

type HeaderProps = {
  fullname: string;
  email: string;
  role: string;
};

export default function Header({
  fullname,
  email,
  role,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = fullname
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm sm:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-slate-800">
          IT Management
        </h1>
        <p className="hidden text-xs text-slate-500 sm:block">
          SARPI IT equipment and employee management
        </p>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label="Open user menu"
          className="flex items-center gap-2 rounded-lg p-2 hover:bg-slate-100"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-semibold text-white">
            {initials || <UserRound size={20} />}
          </span>

          <span className="hidden text-left sm:block">
            <span className="block max-w-40 truncate text-sm font-medium text-slate-800">
              {fullname}
            </span>
            <span className="block text-xs text-slate-500">
              {role === "ADMIN" ? "Administrator" : "User"}
            </span>
          </span>

          <ChevronDown
            size={16}
            className="hidden text-slate-500 sm:block"
          />
        </button>

        {menuOpen && (
          <>
            <button
              type="button"
              aria-label="Close user menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setMenuOpen(false)}
            />

            <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {fullname}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {email}
                </p>
                <p className="mt-1 text-xs font-medium text-blue-700">
                  {role === "ADMIN" ? "Administrator" : "User"}
                </p>
              </div>

              <Link
  href="/settings"
  onClick={() => setMenuOpen(false)}
  className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
>
  <UserRound size={17} />
  Profile & Settings
</Link>

              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
