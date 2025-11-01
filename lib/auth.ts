import NextAuth from "next-auth";
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

export const { handlers, signIn, signOut, auth } = NextAuth({
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
        // 1) Validate inputs
        const parsed = credentialsSchema.safeParse(creds);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // 2) Fetch user with only needed columns
        const row = await db.query.users.findFirst({
          where: eq(users.email, email),
          columns: {
            id: true,
            name: true,
            email: true,
            // adjust this line if your schema uses `password` instead of `passwordHash`
            passwordHash: true,
          },
        });

        if (!row || !row.passwordHash) return null;

        // 3) Verify password
        const ok = await bcrypt.compare(password, row.passwordHash);
        if (!ok) return null;

        // 4) Return minimal user
        return { id: String(row.id), name: row.name ?? null, email: row.email };
      },
    }),
  ],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
});
