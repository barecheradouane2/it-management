
"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guard";

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const fullname = String(formData.get("fullname") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleValue = String(formData.get("role") ?? "USER");

  if (!fullname || !email || password.length < 12) {
    redirect("/admin/users?error=invalid");
  }

  if (!["ADMIN", "USER"].includes(roleValue)) {
    redirect("/admin/users?error=invalid");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.create({
      data: {
        fullname,
        email,
        passwordHash,
        role: roleValue as "ADMIN" | "USER",
        isActive: true,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      redirect("/admin/users?error=email");
    }

    throw error;
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function toggleUserStatusAction(
  formData: FormData
) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    redirect("/admin/users?error=invalid");
  }

  if (id === admin.id) {
    redirect("/admin/users?error=self");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, isActive: true },
  });

  if (!target) {
    redirect("/admin/users?error=notfound");
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}

export async function updateUserRoleAction(
  formData: FormData
) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const role = String(formData.get("role") ?? "");

  if (!Number.isSafeInteger(id) || id <= 0) {
    redirect("/admin/users?error=invalid");
  }

  if (id === admin.id) {
    redirect("/admin/users?error=self");
  }

  if (role !== "ADMIN" && role !== "USER") {
    redirect("/admin/users?error=invalid");
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!target) {
    redirect("/admin/users?error=notfound");
  }

  await prisma.user.update({
    where: { id },
    data: { role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=1");
}
