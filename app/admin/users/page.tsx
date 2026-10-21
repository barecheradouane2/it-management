
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";
import {
  createUserAction,
  toggleUserStatusAction,
  updateUserRoleAction,
} from "./actions";
import { LogoutButton } from "@/components/logout-button";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdmin();

  const params = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  const messages: Record<string, string> = {
    created: "User created successfully.",
    updated: "User updated successfully.",
    invalid: "Please check the submitted information.",
    email: "That email address is already registered.",
    self: "You cannot change your own role or disable your own account.",
    notfound: "User not found.",
  };

  const error = Array.isArray(params.error)
    ? params.error[0]
    : params.error;

  const success = Array.isArray(params.created)
    ? params.created[0]
    : params.created;

  const updated = Array.isArray(params.updated)
    ? params.updated[0]
    : params.updated;

  const messageKey = error ?? (success ? "created" : updated ? "updated" : "");

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="mt-1 text-gray-600">
              SARPI IT Management — administrator
            </p>
          </div>
          <LogoutButton />
        </header>

        {messageKey && (
          <p
            role="status"
            className={`rounded-md p-3 text-sm ${
              error
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {messages[messageKey] ?? "Operation completed."}
          </p>
        )}

        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold">
            Create a user
          </h2>

          <form
            action={createUserAction}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div>
              <label htmlFor="fullname" className="mb-1 block text-sm font-medium">
                Full name
              </label>
              <input
                id="fullname"
                name="fullname"
                required
                maxLength={120}
                className="w-full rounded-md border p-2"
                placeholder="Full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                maxLength={254}
                className="w-full rounded-md border p-2"
                placeholder="user@sarpi-dz.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium">
                Temporary password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                className="w-full rounded-md border p-2"
                placeholder="At least 12 characters"
              />
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium">
                Role
              </label>
              <select
                id="role"
                name="role"
                defaultValue="USER"
                className="w-full rounded-md border p-2"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-md bg-blue-700 px-5 py-2 font-medium text-white hover:bg-blue-800"
              >
                Create account
              </button>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-semibold">Registered users</h2>
            <p className="mt-1 text-sm text-gray-500">
              {users.length} account(s)
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3 font-medium">
                      {user.fullname}
                    </td>
                    <td className="p-3">{user.email}</td>
                    <td className="p-3">
                      <form
                        action={updateUserRoleAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="id"
                          value={user.id}
                        />
                        <select
                          name="role"
                          defaultValue={user.role}
                          aria-label={`Role for ${user.fullname}`}
                          disabled={user.role === "ADMIN" && users.length === 1}
                          className="rounded border p-1"
                        >
                          <option value="USER">User</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <button
                          type="submit"
                          className="text-blue-700 hover:underline"
                        >
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          user.isActive
                            ? "font-medium text-green-700"
                            : "font-medium text-red-700"
                        }
                      >
                        {user.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3">
                      {user.createdAt.toLocaleDateString("en-GB")}
                    </td>
                    <td className="p-3">
                      <form action={toggleUserStatusAction}>
                        <input
                          type="hidden"
                          name="id"
                          value={user.id}
                        />
                        <button
                          type="submit"
                          disabled={users.length === 1}
                          className="whitespace-nowrap rounded border px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
                        >
                          {user.isActive ? "Disable" : "Enable"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}

                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-gray-500"
                    >
                      No user accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
