import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const row = await db.query.users.findFirst({
          where: eq(users.email, email),
          columns: { id: true, name: true, email: true, passwordHash: true },
        });

        if (!row?.passwordHash) return null;
        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        return { id: String(row.id), name: row.name ?? null, email: row.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" as const }, // <-- optional literal cast
};

// Lazy initialization to prevent early NextAuth execution
export const getAuth = () => NextAuth(authConfig);
export const { handlers, signIn, signOut, auth } = getAuth();
