
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function main() {
  const fullname = process.env.ADMIN_FULLNAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!fullname || !email || !password) {
    throw new Error(
      "Set ADMIN_FULLNAME, ADMIN_EMAIL and ADMIN_PASSWORD."
    );
  }

  if (password.length < 12) {
    throw new Error("Use a password of at least 12 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error(
      "This email already exists. No account was changed."
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      fullname,
      email,
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
    select: {
      id: true,
      fullname: true,
      email: true,
      role: true,
    },
  });

  console.log("Administrator created:", user);
}

main()
  .catch((error) => {
    console.error("Admin creation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
