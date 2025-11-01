import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Must be a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Check if the email already exists
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    // Hash and insert (adjust the column name if your schema differs)
    const passwordHash = await bcrypt.hash(password, 12);

    await db.insert(users).values({
      name,
      email,
      // If your schema column is named `password` instead, change this:
      passwordHash,
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("Signup error:", err);
    return NextResponse.json({ ok: false, error: "Failed to create user" }, { status: 500 });
  }
}
