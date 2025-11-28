// app/api/interview/upload-recording/route.ts
// Handle audio recording uploads using Vercel Blob

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;

    if (!audioFile || !sessionId) {
      return NextResponse.json(
        { error: 'Missing audio file or session ID' },
        { status: 400 }
      );
    }

    // Verify session exists
    const interviewSession = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
    });

    if (!interviewSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Upload to Vercel Blob
    const filename = `recordings/interview-${sessionId}.webm`;
    
    const blob = await put(filename, audioFile, {
      access: 'public',
      contentType: 'audio/webm',
    });

    console.log(`✅ Recording uploaded to Vercel Blob: ${blob.url}`);

    // Update session with recording URL
    await db.update(interviewSessions)
      .set({ recordingUrl: blob.url })
      .where(eq(interviewSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      recordingUrl: blob.url,
    });

  } catch (error) {
    console.error('Error uploading recording:', error);
    return NextResponse.json(
      { error: 'Failed to upload recording' },
      { status: 500 }
    );
  }
}