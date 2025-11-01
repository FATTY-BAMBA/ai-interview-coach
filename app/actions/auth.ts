'use server';

import { signIn as nextAuthSignIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function signInWithCredentials(email: string, password: string) {
  try {
    await nextAuthSignIn('credentials', {
      email,
      password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid credentials' };
    }
    return { success: false, error: 'An error occurred' };
  }
}

export async function signInWithGoogle() {
  await nextAuthSignIn('google', { redirectTo: '/' });
}

export async function registerUser(
  name: string,
  email: string,
  password: string
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    return { success: false, error: 'Email already in use' };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(users).values({ name, email, passwordHash });

  try {
    await nextAuthSignIn('credentials', { email, password, redirect: false });
  } catch {
    // Account created even if auto-login fails
  }
  return { success: true };
}
