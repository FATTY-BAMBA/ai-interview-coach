import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

const payloadSchema = z.object({
  name: z.string().min(1).default("Test User"),
  email: z.string().email().default("test@example.com"),
  password: z.string().min(6).default("test1234!"),
});

/**
 * POST /api/user/create-test
 * Optional JSON body: { name, email, password }
 */
export async function POST(req: NextRequest) {
  try {
    const json = (await req.json().catch(() => ({}))) as unknown;
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid payload", issues: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, email, password } = parsed.data;

    // 1) Duplicate check
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    // 2) Hash password and insert into passwordHash column
    const passwordHash = await bcrypt.hash(password, 12);

    const [created] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash, // <-- matches your schema
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        // include timestamps only if they exist in your schema
      });

    return NextResponse.json({ success: true, user: created }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
        { success: false, error: "Failed to create user" },
        { status: 500 }
    );
  }
}
