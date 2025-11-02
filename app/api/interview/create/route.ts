export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { RoomServiceClient } from 'livekit-server-sdk';

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

    // Create LiveKit room
    try {
      const livekitHost = process.env.LIVEKIT_URL || '';
      const apiKey = process.env.LIVEKIT_API_KEY || '';
      const apiSecret = process.env.LIVEKIT_API_SECRET || '';
      
      const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
      
      await roomService.createRoom({
        name: roomName,
        emptyTimeout: 300,
        maxParticipants: 10,
      });

      console.log(`✅ Created LiveKit room: ${roomName}`);
      
      // NOTIFY AGENT TO JOIN ROOM
      try {
        const agentResponse = await fetch('https://python-agent-snowy-tree-6698.fly.dev/join-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_name: roomName }),
        });
        
        if (agentResponse.ok) {
          console.log(`🤖 Agent notified to join room: ${roomName}`);
        } else {
          console.error(`⚠️ Agent notification failed:`, await agentResponse.text());
        }
      } catch (agentError) {
        console.error('⚠️ Error notifying agent:', agentError);
        // Don't fail the request - room still works without agent initially
      }
      
    } catch (error) {
      console.error('Error with LiveKit setup:', error);
    }

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
