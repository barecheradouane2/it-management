
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "Email and Password",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string"
            ? credentials.email.trim().toLowerCase()
            : "";

        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : "";

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.isActive) return null;

        const validPassword = await bcrypt.compare(
          password,
          user.passwordHash
        );

        if (!validPassword) return null;

        return {
          id: String(user.id),
          name: user.fullname,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }

      if (token.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { id: Number(token.sub) },
          select: {
            fullname: true,
            email: true,
            role: true,
            isActive: true,
          },
        });

        if (dbUser) {
          token.name = dbUser.fullname;
          token.email = dbUser.email;
          token.role = dbUser.role  as UserRole;
          token.isActive = dbUser.isActive;
        } else {
          token.isActive = false;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = (token.role as UserRole) ?? UserRole.USER;
session.user.isActive = token.isActive === true;
      }

      return session;
    },
  },
});
