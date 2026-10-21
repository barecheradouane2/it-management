
import { requireUser } from "@/lib/auth-guard";
import ProfileForm from "@/components/ProfileForm";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="text-blue-700" size={25} />
          <h1 className="text-2xl font-bold text-slate-800">
            Profile & Settings
          </h1>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Manage your personal information and account security.
        </p>
      </div>

      <ProfileForm
        fullname={user.fullname}
        email={user.email}
        role={user.role}
      />
    </div>
  );
}
