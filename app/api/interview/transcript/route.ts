import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversationTurns } from '@/lib/db/schema';

export async function POST(req: NextRequest) {
  try {
    const { sessionId, role, text } = await req.json();

    if (!sessionId || !role || !text) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Save to database
    await db.insert(conversationTurns).values({
      sessionId,
      role,
      text,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving transcript:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript' },
      { status: 500 }
    );
  }
}
