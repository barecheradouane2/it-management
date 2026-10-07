import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {

     const [
      employees,
      devices,
      assignments,
      brokenDevices,
      archivedDevices,
    ] = await Promise.all([
      prisma.employee.count(),
      prisma.device.count(),
      prisma.assignment.count({
        where: {
          returnedAt: null,
        },
      }),
      prisma.device.count({
        where: {
          condition: "EN_PANNE",
        },
      }),
      prisma.device.count({
        where: {
          state: "ARCHIVES",
        },
      }),
    ]);
  
    const cards = [
      {
        title: "Employees",
        value: employees,
      },
      {
        title: "Devices",
        value: devices,
      },
      {
        title: "Assigned Devices",
        value: assignments,
      },
      {
        title: "Broken Devices",
        value: brokenDevices,
      },
      {
        title: "Archived",
        value: archivedDevices,
      },
    ];
 

  return (

    <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-8xl">
          <h1 className="text-3xl font-bold text-slate-900">
            Dashboard
          </h1>
  
          <p className="mt-2 text-slate-500">
            Overview of the SARPI IT inventory
          </p>
  
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map((card) => (
              <div
                key={card.title}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <p className="text-sm text-slate-500">
                  {card.title}
                </p>
  
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {card.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    
  );
}