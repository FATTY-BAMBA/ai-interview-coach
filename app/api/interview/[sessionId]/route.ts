import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions, conversationTurns } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    // Query session with transcripts
    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
      with: {
        conversationTurns: {
          orderBy: [desc(conversationTurns.timestamp)],
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Format transcripts for frontend
    const transcripts = session.conversationTurns.map((turn: any) => ({
      speaker: turn.role === 'assistant' ? 'ai' : 'user',
      text: turn.text,
      timestamp: turn.timestamp,
    }));

    return NextResponse.json({ 
      session: {
        ...session,
        transcripts,
      }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await req.json();

    const updated = await db
      .update(interviewSessions)
      .set({
        status: body.status,
        endedAt: body.status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(interviewSessions.id, sessionId))
      .returning();

    return NextResponse.json({ session: updated[0] });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}
