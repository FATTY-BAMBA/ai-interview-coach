import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/livekit/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomName, participantName } = body;

    if (!roomName || !participantName) {
      return NextResponse.json(
        { error: 'roomName and participantName required' },
        { status: 400 }
      );
    }

    const token = await generateToken(roomName, participantName);

    return NextResponse.json({ token });

  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
