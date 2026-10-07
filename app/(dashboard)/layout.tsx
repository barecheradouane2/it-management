import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-h-screen pt-16 lg:ml-64 lg:pt-0">
        {children}
      </main>
    </div>
  );
}