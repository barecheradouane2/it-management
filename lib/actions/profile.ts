
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export type ProfileResult = {
  success: boolean;
  message: string;
};

export async function updateProfile(
  formData: FormData
): Promise<ProfileResult> {
  try {
    const session = await auth();
    const userId = Number(session?.user?.id);

    if (!session?.user?.id || !Number.isSafeInteger(userId) || userId <= 0) {
      return { success: false, message: "Please sign in again." };
    }

    const fullname = String(formData.get("fullname") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const currentPassword = String(
      formData.get("currentPassword") ?? ""
    );
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(
      formData.get("confirmPassword") ?? ""
    );

    if (fullname.length < 2 || fullname.length > 80) {
      return {
        success: false,
        message: "Name must contain between 2 and 80 characters.",
      };
    }

    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return { success: false, message: "Enter a valid email address." };
    }

    const changingPassword =
      currentPassword.length > 0 ||
      newPassword.length > 0 ||
      confirmPassword.length > 0;

    if (changingPassword) {
      if (!currentPassword || !newPassword || !confirmPassword) {
        return {
          success: false,
          message: "Complete all three password fields to change your password.",
        };
      }

      if (newPassword.length < 8 || newPassword.length > 72) {
        return {
          success: false,
          message: "New password must contain 8–72 characters.",
        };
      }

      if (newPassword !== confirmPassword) {
        return {
          success: false,
          message: "The new passwords do not match.",
        };
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return { success: false, message: "Account not found or inactive." };
    }

    // Verify the current password before changing the password.
    if (changingPassword) {
      const valid = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!valid) {
        return {
          success: false,
          message: "Your current password is incorrect.",
        };
      }
    }

    const existingEmail = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (existingEmail) {
      return {
        success: false,
        message: "This email address is already used by another account.",
      };
    }

    const data: {
      fullname: string;
      email: string;
      passwordHash?: string;
    } = { fullname, email };

    if (changingPassword) {
      data.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    await prisma.user.update({
      where: { id: userId },
      data,
    });

    revalidatePath("/");
    revalidatePath("/settings");

    return {
      success: true,
      message: "Your profile has been updated successfully.",
    };
  } catch (error) {
    console.error("Profile update error:", error);

    return {
      success: false,
      message: "Unable to update your profile. Please try again.",
    };
  }
}
