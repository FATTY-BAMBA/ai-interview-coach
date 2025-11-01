import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Query by roomName instead of id (sessionId is actually the roomName from the URL)
    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.roomName, sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
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

    // Query by roomName instead of id
    const updated = await db
      .update(interviewSessions)
      .set({
        status: body.status,
        endedAt: body.status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(interviewSessions.roomName, sessionId))
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
