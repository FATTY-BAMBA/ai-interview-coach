import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, conversationTurns, evaluationReports, users } from '@/lib/db/schema';
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

    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const sessions = await db.query.interviewSessions.findMany({
      where: eq(interviewSessions.userId, user.id),
      orderBy: [desc(interviewSessions.createdAt)],
      limit: 50,
      with: {
        conversationTurns: true,
        evaluationReports: true,
      },
    });

    // Format for response
    const formattedSessions = sessions.map(s => ({
      id: s.id,
      interviewType: s.interviewType,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      roomName: s.roomName,
      transcripts: s.conversationTurns,
      evaluationReports: s.evaluationReports,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
