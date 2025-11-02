import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  try {
    const { roomName } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error('LiveKit credentials missing:', { apiKey: !!apiKey, apiSecret: !!apiSecret });
      return NextResponse.json(
        { error: 'LiveKit credentials not configured' },
        { status: 500 }
      );
    }

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: `user-${Math.random().toString(36).substring(7)}`,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // Generate JWT token string
    const jwt = await at.toJwt();
    
    // Ensure it's a string
    if (typeof jwt !== 'string') {
      console.error('Token is not a string:', typeof jwt, jwt);
      throw new Error('Invalid token generated');
    }

    console.log('Generated token for room:', roomName, 'Token length:', jwt.length);

    return NextResponse.json({ token: jwt });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
