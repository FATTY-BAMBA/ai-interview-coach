export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { RoomServiceClient } from 'livekit-server-sdk';
import { isValidLanguage } from '@/lib/types/language';
import type { SupportedLanguage } from '@/lib/types/language';

const VALID_INTERVIEW_TYPES = ['behavioral', 'technical', 'system-design', 'case-study'] as const;
const VALID_SENIORITY_LEVELS = ['junior', 'mid', 'senior', 'lead', 'executive'] as const;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { 
      interviewType, 
      spokenLanguage = 'zh-TW',
      // NEW: Candidate Profile Fields
      candidateRole,
      candidateSeniority = 'mid',
      candidateIndustry = 'tech',
      candidateYearsExperience = 3,
    } = await req.json();

    // Validate interview type
    if (!interviewType || !VALID_INTERVIEW_TYPES.includes(interviewType)) {
      return NextResponse.json(
        { error: 'Invalid interview type' },
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

    // Validate seniority (if provided)
    if (candidateSeniority && !VALID_SENIORITY_LEVELS.includes(candidateSeniority)) {
      return NextResponse.json(
        { error: 'Invalid seniority level' },
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

    // Create interview session with language AND candidate profile
    const newSession = await db.insert(interviewSessions).values({
      userId: user.id,
      roomName,
      interviewType,
      spokenLanguage: spokenLanguage as SupportedLanguage,
      targetRole: candidateRole || 'Software Engineer', // Use candidateRole for targetRole too
      difficulty: 'medium',
      status: 'scheduled',
      // NEW: Candidate Profile Fields
      candidateRole: candidateRole || null,
      candidateSeniority: candidateSeniority || 'mid',
      candidateIndustry: candidateIndustry || 'tech',
      candidateYearsExperience: candidateYearsExperience || 3,
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
        metadata: JSON.stringify({
          interviewType,
          spokenLanguage,
          userId: user.id,
          // NEW: Include candidate profile in room metadata
          candidateRole,
          candidateSeniority,
          candidateIndustry,
          candidateYearsExperience,
        }),
      });

      console.log(`✅ Created LiveKit room: ${roomName}`);
      console.log(`   Language: ${spokenLanguage}`);
      console.log(`   Role: ${candidateRole}, Seniority: ${candidateSeniority}`);
      console.log(`   Industry: ${candidateIndustry}, Years: ${candidateYearsExperience}`);
      
      // NOTIFY AGENT TO JOIN ROOM (with language AND profile info)
      try {
        const agentResponse = await fetch('https://python-agent-snowy-tree-6698.fly.dev/join-room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            room_name: roomName,
            spoken_language: spokenLanguage,
            interview_type: interviewType,
            // NEW: Pass candidate profile to agent
            candidate_role: candidateRole,
            candidate_seniority: candidateSeniority,
            candidate_industry: candidateIndustry,
            candidate_years_experience: candidateYearsExperience,
          }),
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

    console.log('✅ Interview session created:', {
      sessionId: newSession[0].id,
      roomName,
      type: interviewType,
      language: spokenLanguage,
      candidateRole,
      candidateSeniority,
      candidateIndustry,
      userId: user.id,
    });

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