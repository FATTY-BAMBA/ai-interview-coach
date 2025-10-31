import { NextRequest, NextResponse } from 'next/server';
import { db, users } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Create a test user
    const [user] = await db.insert(users).values({
      name: 'Test User',
      email: 'test@example.com',
    }).returning();

    return NextResponse.json({ 
      success: true, 
      user 
    });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
