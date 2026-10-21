
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { requireUser } from "@/lib/auth-guard";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <main className="min-h-screen pt-16 lg:ml-64 lg:pt-0">
        <Header
          fullname={user.fullname}
          email={user.email ?? ""}
          role={user.role}
        />

        <div className="py-2 ">
          {children}
        </div>
      </main>
    </div>
  );
}
