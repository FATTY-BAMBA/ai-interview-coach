import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions, conversationTurns, evaluationReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get interview session
    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Interview session not found' },
        { status: 404 }
      );
    }

    // Get conversation transcript
    const transcript = await db.query.conversationTurns.findMany({
      where: eq(conversationTurns.sessionId, sessionId),
      orderBy: (conversationTurns, { asc }) => [asc(conversationTurns.timestamp)],
    });

    if (transcript.length === 0) {
      return NextResponse.json(
        { error: 'No transcript found for this session' },
        { status: 404 }
      );
    }

    // Format transcript for GPT-4
    const formattedTranscript = transcript
      .map((turn) => `${turn.role === 'user' ? 'Candidate' : 'Interviewer'}: ${turn.text}`)
      .join('\n\n');

    // Generate evaluation using GPT-4
    const evaluation = await generateEvaluation(
      formattedTranscript,
      session.interviewType,
      session.targetRole
    );

    // Save evaluation to database
    const savedEvaluation = await db.insert(evaluationReports).values({
      sessionId: sessionId,
      overallScore: evaluation.overallScore,
      clarityScore: evaluation.clarityScore,
      structureScore: evaluation.structureScore,
      confidenceScore: evaluation.confidenceScore,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      detailedFeedback: evaluation.detailedFeedback,
      generatedAt: new Date(),
    }).returning();

    return NextResponse.json({
      success: true,
      evaluation: savedEvaluation[0],
    });
  } catch (error) {
    console.error('Error generating evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to generate evaluation' },
      { status: 500 }
    );
  }
}

async function generateEvaluation(
  transcript: string,
  interviewType: string,
  targetRole: string
): Promise<{
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}> {
  const prompt = `You are an expert interview evaluator. Analyze this ${interviewType} interview for a ${targetRole} position.

TRANSCRIPT:
${transcript}

Provide a comprehensive evaluation with:
1. Overall Score (0-10): Holistic assessment
2. Clarity Score (0-10): Communication clarity and articulation
3. Structure Score (0-10): Use of STAR method (Situation, Task, Action, Result) and logical flow
4. Confidence Score (0-10): Confidence level and professional demeanor

5. Strengths (3-5 bullet points): What the candidate did well
6. Areas for Improvement (3-5 bullet points): Specific actionable improvements
7. Detailed Feedback (2-3 paragraphs): In-depth analysis with examples from the interview

Format your response as JSON:
{
  "overallScore": number,
  "clarityScore": number,
  "structureScore": number,
  "confidenceScore": number,
  "strengths": ["strength1", "strength2", ...],
  "improvements": ["improvement1", "improvement2", ...],
  "detailedFeedback": "detailed paragraph..."
}

Be encouraging but honest. Provide actionable, specific feedback.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert interview coach and evaluator. Provide constructive, actionable feedback.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');

  return {
    overallScore: Math.min(10, Math.max(0, result.overallScore || 5)),
    clarityScore: Math.min(10, Math.max(0, result.clarityScore || 5)),
    structureScore: Math.min(10, Math.max(0, result.structureScore || 5)),
    confidenceScore: Math.min(10, Math.max(0, result.confidenceScore || 5)),
    strengths: result.strengths || [],
    improvements: result.improvements || [],
    detailedFeedback: result.detailedFeedback || 'No detailed feedback available.',
  };
}
