'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export async function signInWithCredentials(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' };
  }

  try {
    await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });
    redirect('/');
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === 'CredentialsSignin') {
        return { success: false, error: 'Invalid email or password' };
      }
      return { success: false, error: 'Authentication failed' };
    }
    throw error;
  }
}

export async function signInWithGoogle() {
  await signIn('google', { redirectTo: '/' });
}

export async function registerUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, email.trim()),
  });
  
  if (existing) {
    return { success: false, error: 'Email already in use' };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(users).values({
    name: name.trim(),
    email: email.trim(),
    passwordHash,
  });

  try {
    await signIn('credentials', {
      email: email.trim(),
      password,
      redirect: false,
    });
    redirect('/');
  } catch {
    return { success: true, message: 'Account created. Please sign in.' };
  }
}
