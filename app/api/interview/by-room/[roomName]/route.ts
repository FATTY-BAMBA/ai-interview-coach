import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: { roomName: string } }
) {
  try {
    const { roomName } = params;

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    // Find session by room name
    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.roomName, roomName),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Found session for room ${roomName}:`, {
      id: session.id,
      interviewType: session.interviewType,
      spokenLanguage: session.spokenLanguage,
      feedbackMode: session.feedbackMode,
    });

    return NextResponse.json({
      session: {
        id: session.id,
        interviewType: session.interviewType,
        spokenLanguage: session.spokenLanguage || 'zh-TW',
        feedbackMode: session.feedbackMode || 'real', // NEW
        roomName: session.roomName,
        status: session.status,
        // Candidate Profile Fields
        candidateRole: session.candidateRole,
        candidateSeniority: session.candidateSeniority,
        candidateIndustry: session.candidateIndustry,
        candidateYearsExperience: session.candidateYearsExperience,
      },
    });
  } catch (error) {
    console.error('Error fetching session by room:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}