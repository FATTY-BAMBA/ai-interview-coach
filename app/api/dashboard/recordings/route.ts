// app/api/dashboard/recordings/route.ts
// Fetch latest 3 recordings for the current user

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, users } from '@/lib/db/schema';
import { eq, desc, isNotNull, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch latest 3 sessions that have recordings
    const sessionsWithRecordings = await db.query.interviewSessions.findMany({
      where: and(
        eq(interviewSessions.userId, user.id),
        isNotNull(interviewSessions.recordingUrl)
      ),
      orderBy: [desc(interviewSessions.createdAt)],
      limit: 3,
    });

    // Format response
    const recordings = sessionsWithRecordings.map(s => ({
      sessionId: s.id,
      interviewType: s.interviewType,
      recordingUrl: s.recordingUrl,
      createdAt: s.createdAt,
      duration: s.duration,
    }));

    console.log(`🎧 Found ${recordings.length} recordings for user ${user.id}`);

    return NextResponse.json({
      recordings,
    });

  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}