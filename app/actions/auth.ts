export const runtime = 'nodejs';

'use server';

import { signIn as serverSignIn, signOut as serverSignOut } from '@/lib/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function clean(s: string) {
  return (s ?? '').trim();
}

export async function signInWithCredentials(email: string, password: string) {
  const e = clean(email);
  const p = password ?? '';

  if (!e || !p) {
    return { success: false as const, error: 'Email and password are required' };
  }

  try {
    // Auth.js v5 server helper; keep redirect false so the client page can route after success.
    await serverSignIn('credentials', {
      email: e,
      password: p,
      redirect: false,
    });
    return { success: true as const };
  } catch (err) {
    const aerr = err as AuthError;
    const msg =
      aerr?.type === 'CredentialsSignin'
        ? 'Invalid email or password'
        : aerr?.type === 'CallbackRouteError'
        ? 'Sign-in failed. Please try again.'
        : 'Unexpected error during sign-in';
    return { success: false as const, error: msg };
  }
}

export async function signInWithGoogle(callbackUrl = '/') {
  // For OAuth, redirect immediately on the server.
  await serverSignIn('google', { redirectTo: callbackUrl });
}

export async function signOut() {
  await serverSignOut({ redirectTo: '/login' });
}

/**
 * Create a user and sign them in (credentials).
 * Assumes your table has: id, name, email, passwordHash (change below if your column is named `password`).
 */
export async function registerUser(name: string, email: string, password: string) {
  const n = clean(name);
  const e = clean(email);
  const p = password ?? '';

  if (!n || !e || !p) {
    return { success: false as const, error: 'Name, email and password are required' };
  }
  if (p.length < 6) {
    return { success: false as const, error: 'Password must be at least 6 characters' };
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, e) });
  if (existing) {
    return { success: false as const, error: 'Email already in use' };
  }

  const passwordHash = await bcrypt.hash(p, 12);

  // If your schema column is `password` (not `passwordHash`), change the key below accordingly.
  await db.insert(users).values({ name: n, email: e, passwordHash });

  // Auto-login (non-fatal if it fails)
  try {
    await serverSignIn('credentials', { email: e, password: p, redirect: false });
  } catch {}

  return { success: true as const };
}
