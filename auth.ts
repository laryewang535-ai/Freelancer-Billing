import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validators/auth";
import type { NextAuthConfig } from "next-auth";
import type { Plan } from "@prisma/client";
import { getUserPlan } from "@/lib/billing/plan-limits";

const providers: NonNullable<NextAuthConfig["providers"]> = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const { email, password } = parsed.data;
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { subscription: true },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        plan: await getUserPlan(user.id),
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.plan = user.plan ?? "FREE";
      }

      if (trigger === "update" && session?.plan) {
        token.plan = session.plan as Plan;
      }

      if (token.id) {
        token.plan = await getUserPlan(token.id);
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.plan = token.plan;
      }
      return session;
    },
    async signIn({ user, account }) {
      // OAuth 登录时确保有订阅记录；数据库异常时不阻断登录
      if (account?.provider !== "credentials" && user.id) {
        try {
          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {},
            create: { userId: user.id, plan: "FREE" },
          });
        } catch (error) {
          console.error("[auth signIn] subscription upsert failed:", error);
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      try {
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id, plan: "FREE" },
        });
      } catch (error) {
        console.error("[auth createUser] subscription upsert failed:", error);
      }
    },
  },
  trustHost: true,
});
