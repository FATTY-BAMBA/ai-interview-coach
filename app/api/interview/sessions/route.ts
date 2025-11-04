import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/db';
import { interviewSessions, transcripts } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all sessions for the user
    const sessions = await db
      .select({
        id: interviewSessions.id,
        interviewType: interviewSessions.interviewType,
        status: interviewSessions.status,
        createdAt: interviewSessions.createdAt,
        updatedAt: interviewSessions.updatedAt,
        roomName: interviewSessions.roomName,
      })
      .from(interviewSessions)
      .where(eq(interviewSessions.userEmail, session.user.email))
      .orderBy(desc(interviewSessions.createdAt))
      .limit(50);

    // Get transcript count for each session
    const sessionsWithCounts = await Promise.all(
      sessions.map(async (s) => {
        const transcriptCount = await db
          .select()
          .from(transcripts)
          .where(eq(transcripts.sessionId, s.id));
        
        return {
          ...s,
          transcripts: transcriptCount,
        };
      })
    );

    return NextResponse.json({ sessions: sessionsWithCounts });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
