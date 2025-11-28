// app/api/interview/recording/stop/route.ts
// Stop LiveKit Egress recording

import { NextRequest, NextResponse } from 'next/server';
import { EgressClient } from 'livekit-server-sdk';
import { auth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { egressId, sessionId } = await req.json();

    if (!egressId) {
      // No egress to stop - this is fine if server recording wasn't started
      return NextResponse.json({ success: true, message: 'No egress to stop' });
    }

    // Check LiveKit credentials
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return NextResponse.json({ 
        success: false, 
        message: 'LiveKit not configured' 
      });
    }

    // Initialize Egress client
    const egressClient = new EgressClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    // Stop the egress
    const egressInfo = await egressClient.stopEgress(egressId);

    console.log(`🛑 Server recording stopped for egress ${egressId}, status: ${egressInfo.status}`);

    return NextResponse.json({
      success: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
    });

  } catch (error: any) {
    console.error('Error stopping server recording:', error);
    
    // Don't fail if stop fails - recording will stop when room closes anyway
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to stop recording',
    });
  }
}