// app/api/interview/recording/start/route.ts
// Start LiveKit Egress recording - captures full conversation (user + AI)

import { NextRequest, NextResponse } from 'next/server';
import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomName, sessionId } = await req.json();

    if (!roomName || !sessionId) {
      return NextResponse.json(
        { error: 'Missing roomName or sessionId' },
        { status: 400 }
      );
    }

    // Check R2 credentials
    if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || 
        !process.env.R2_ENDPOINT || !process.env.R2_BUCKET) {
      console.warn('⚠️ R2 credentials not configured, skipping server recording');
      return NextResponse.json({ 
        success: false, 
        message: 'Server recording not configured' 
      });
    }

    // Check LiveKit credentials
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      console.warn('⚠️ LiveKit credentials not configured');
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

    // Create S3-compatible upload config for Cloudflare R2
    const s3Upload = new S3Upload({
      accessKey: process.env.R2_ACCESS_KEY_ID,
      secret: process.env.R2_SECRET_ACCESS_KEY,
      bucket: process.env.R2_BUCKET,
      endpoint: process.env.R2_ENDPOINT,
      region: 'auto', // R2 uses 'auto' for region
      forcePathStyle: true, // Required for non-AWS S3
    });

    // Create file output - audio only MP4
    const timestamp = Date.now();
    const filepath = `recordings/${sessionId}/interview-${timestamp}.mp4`;
    
    const fileOutput = new EncodedFileOutput({
      fileType: EncodedFileType.MP4,
      filepath: filepath,
      s3: s3Upload,
    });

    // Start audio-only room composite egress
    const egressInfo = await egressClient.startRoomCompositeEgress(
      roomName,
      { file: fileOutput },
      { audioOnly: true } // Audio only - no video
    );

    console.log(`🎙️ Server recording started for room ${roomName}, egress ID: ${egressInfo.egressId}`);

    // Store egress ID in database
    await db.update(interviewSessions)
      .set({ egressId: egressInfo.egressId })
      .where(eq(interviewSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      egressId: egressInfo.egressId,
      status: egressInfo.status,
    });

  } catch (error: any) {
    console.error('Error starting server recording:', error);
    
    // Don't fail the interview if recording fails
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to start recording',
    });
  }
}