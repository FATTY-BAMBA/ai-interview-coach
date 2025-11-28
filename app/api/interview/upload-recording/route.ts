// app/api/interview/upload-recording/route.ts
// Handle audio recording uploads using Vercel Blob
// Auto-deletes old recordings to keep only 3 per user

import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, users } from '@/lib/db/schema';
import { eq, desc, isNotNull, and } from 'drizzle-orm';

const MAX_RECORDINGS_PER_USER = 3;

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

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    // Verify session exists and belongs to user
    const interviewSession = await db.query.interviewSessions.findFirst({
      where: and(
        eq(interviewSessions.id, sessionId),
        eq(interviewSessions.userId, user.id)
      ),
    });

    if (!interviewSession) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Upload to Vercel Blob
    const filename = `recordings/${user.id}/interview-${sessionId}.webm`;
    
    const blob = await put(filename, audioFile, {
      access: 'public',
      contentType: 'audio/webm',
    });

    console.log(`✅ Recording uploaded to Vercel Blob: ${blob.url}`);

    // Update session with recording URL
    await db.update(interviewSessions)
      .set({ recordingUrl: blob.url })
      .where(eq(interviewSessions.id, sessionId));

    // ============================================
    // AUTO-DELETE OLD RECORDINGS (keep only 3)
    // ============================================
    
    // Get all sessions with recordings for this user, ordered by newest first
    const allRecordings = await db.query.interviewSessions.findMany({
      where: and(
        eq(interviewSessions.userId, user.id),
        isNotNull(interviewSessions.recordingUrl)
      ),
      orderBy: [desc(interviewSessions.createdAt)],
    });

    // If more than MAX_RECORDINGS_PER_USER, delete the oldest ones
    if (allRecordings.length > MAX_RECORDINGS_PER_USER) {
      const recordingsToDelete = allRecordings.slice(MAX_RECORDINGS_PER_USER);
      
      for (const oldRecording of recordingsToDelete) {
        try {
          // Delete from Vercel Blob
          if (oldRecording.recordingUrl) {
            await del(oldRecording.recordingUrl);
            console.log(`🗑️ Deleted old recording from Blob: ${oldRecording.recordingUrl}`);
          }
          
          // Clear the URL from database
          await db.update(interviewSessions)
            .set({ recordingUrl: null })
            .where(eq(interviewSessions.id, oldRecording.id));
            
          console.log(`🗑️ Cleared recording URL for session: ${oldRecording.id}`);
        } catch (deleteError) {
          console.error(`Failed to delete old recording ${oldRecording.id}:`, deleteError);
          // Continue with other deletions even if one fails
        }
      }
      
      console.log(`🧹 Cleaned up ${recordingsToDelete.length} old recording(s)`);
    }

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