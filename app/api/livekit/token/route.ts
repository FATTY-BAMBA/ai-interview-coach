import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { auth } from '@/lib/auth';
import { isValidLanguage } from '@/lib/types/language';
import type { SupportedLanguage } from '@/lib/types/language';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { roomName, spokenLanguage = 'zh-TW' } = await req.json();

    if (!roomName) {
      return NextResponse.json(
        { error: 'Room name is required' },
        { status: 400 }
      );
    }

    // Validate language
    if (!isValidLanguage(spokenLanguage)) {
      return NextResponse.json(
        { error: 'Invalid language. Must be zh-TW or en-US' },
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

    // Create access token with user identity
    const at = new AccessToken(apiKey, apiSecret, {
      identity: session.user.email, // Use real user email
      name: session.user.name || session.user.email,
      metadata: JSON.stringify({
        userId: session.user.id,
        email: session.user.email,
        spokenLanguage: spokenLanguage as SupportedLanguage, // Pass language
      }),
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

    console.log('✅ Generated token for room:', roomName, 'User:', session.user.email, 'Language:', spokenLanguage);

    return NextResponse.json({ 
      token: jwt,
      spokenLanguage, // Return language for client reference
      url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
    });
  } catch (error) {
    console.error('Error generating token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
