import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./lib/db/client";
import * as schema from "./lib/db/schema";
import { ilike } from "drizzle-orm";
import { authConfig } from "./auth.config";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    username: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const usernameInput = String(credentials.username).trim();
        const passwordInput = String(credentials.password);

        try {
          const matchedUsers = await db
            .select()
            .from(schema.users)
            .where(ilike(schema.users.username, usernameInput))
            .limit(1);

          if (!matchedUsers || matchedUsers.length === 0) {
            return null;
          }

          const user = matchedUsers[0];

          // Support both bcrypt hashes and fallback for legacy plaintext passwords
          let isValid = false;
          if (
            user.password.startsWith("$2a$") ||
            user.password.startsWith("$2b$") ||
            user.password.startsWith("$2y$")
          ) {
            isValid = await bcrypt.compare(passwordInput, user.password);
          } else {
            isValid = user.password === passwordInput;
          }

          if (!isValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.username,
            username: user.username,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
});
