"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Monitor,
  ClipboardList,
  Menu,
  X,
  Settings,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/employees",
    icon: Users,
  },
  {
    name: "Devices",
    href: "/devices",
    icon: Monitor,
  },
  {
    name: "Assignments",
    href: "/assignments",
    icon: ClipboardList,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-white px-4 lg:hidden">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            IT Management
          </h1>
          <p className="text-xs text-slate-500">SARPI</p>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen w-64 flex-col
          bg-slate-900 text-white
          transition-transform duration-300
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="flex h-20 items-center justify-between border-b border-slate-700 px-6">
          <div>
            <h1 className="text-xl font-bold">
              IT Management
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              SARPI
            </p>
          </div>

          {/* Close button - mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Management
          </p>

          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 rounded-lg px-3 py-3
                    text-sm font-medium transition
                    ${
                      isActive
                        ? "bg-slate-700 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }
                  `}
                >
                  <Icon size={20} />

                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-slate-700 p-4">
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}