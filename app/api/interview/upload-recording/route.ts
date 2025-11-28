// app/api/interview/upload-recording/route.ts
// Handle audio recording uploads

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

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

    // Convert file to buffer
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create recordings directory if it doesn't exist
    const recordingsDir = path.join(process.cwd(), 'public', 'recordings');
    try {
      await mkdir(recordingsDir, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }

    // Generate filename
    const filename = `interview-${sessionId}.webm`;
    const filepath = path.join(recordingsDir, filename);

    // Write file
    await writeFile(filepath, buffer);

    // Generate URL (relative to public folder)
    const recordingUrl = `/recordings/${filename}`;

    // Update session with recording URL
    await db.update(interviewSessions)
      .set({ recordingUrl })
      .where(eq(interviewSessions.id, sessionId));

    console.log(`✅ Recording saved for session ${sessionId}: ${recordingUrl}`);

    return NextResponse.json({
      success: true,
      recordingUrl,
    });

  } catch (error) {
    console.error('Error uploading recording:', error);
    return NextResponse.json(
      { error: 'Failed to upload recording' },
      { status: 500 }
    );
  }
}