import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { interviewType } = await req.json();

    if (!interviewType) {
      return NextResponse.json(
        { error: 'Interview type is required' },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const roomName = `interview-${nanoid(16)}`;

    const newSession = await db.insert(interviewSessions).values({
      userId: user.id,
      roomName,
      interviewType,
      targetRole: 'Software Engineer',
      difficulty: 'medium',
      status: 'scheduled',
    }).returning();

    return NextResponse.json({
      success: true,
      session: newSession[0],
    });
  } catch (error) {
    console.error('Error creating interview:', error);
    return NextResponse.json(
      { error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}
