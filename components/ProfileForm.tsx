
"use client";

import { useState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { Save, LockKeyhole, UserRound } from "lucide-react";

type Props = {
  fullname: string;
  email: string;
  role: string;
};

export default function ProfileForm({ fullname, email, role }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();

  const form = event.currentTarget;
  const formData = new FormData(form);

  setLoading(true);
  setMessage("");

  try {
    const result = await updateProfile(formData);

    setSuccess(result.success);
    setMessage(result.message);

    if (result.success) {
      window.location.reload();
    }
  } catch {
    setSuccess(false);
    setMessage("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
}

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
            <UserRound size={21} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-800">Personal information</h2>
            <p className="text-sm text-slate-500">
              Update your name and email address.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Username / Full name
            <input
              name="fullname"
              defaultValue={fullname}
              required
              minLength={2}
              maxLength={80}
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email address
            <input
              name="email"
              type="email"
              defaultValue={email}
              required
              maxLength={254}
              autoComplete="email"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Account role</span>
            <p className="mt-1 text-slate-500">
              {role === "ADMIN" ? "Administrator" : "User"} — managed by an administrator.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="rounded-lg bg-amber-50 p-2 text-amber-700">
            <LockKeyhole size={21} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-800">Change password</h2>
            <p className="text-sm text-slate-500">
              Leave these fields empty if you do not want to change your password.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
            Current password
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              name="newPassword"
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              name="confirmPassword"
              type="password"
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>
      </section>

      {message && (
        <p
          role="status"
          className={`rounded-lg p-3 text-sm ${
            success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message}
        </p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={17} />
          {loading ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
