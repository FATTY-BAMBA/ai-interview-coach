import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, evaluationReports, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Get all sessions with evaluations, ordered by date
    const sessions = await db.query.interviewSessions.findMany({
      where: eq(interviewSessions.userId, user.id),
      orderBy: [desc(interviewSessions.createdAt)],
      with: {
        evaluationReports: true,
      },
    });

    // Filter sessions that have evaluations and format for chart
    const evaluatedSessions = sessions
      .filter(s => s.evaluationReports && s.evaluationReports.length > 0)
      .reverse() // Show oldest to newest for trend
      .slice(-10); // Last 10 interviews

    if (evaluatedSessions.length === 0) {
      return NextResponse.json({
        trends: [],
        averages: {
          clarity: null,
          structure: null,
          confidence: null,
          overall: null,
        },
      });
    }

    // Format data for charts
    const trends = evaluatedSessions.map((session, index) => {
      const report = session.evaluationReports[0];
      const date = new Date(session.createdAt);
      
      return {
        interview: `#${index + 1}`,
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDate: date.toISOString(),
        clarity: report.clarityScore,
        structure: report.structureScore,
        confidence: report.confidenceScore,
        overall: report.overallScore,
      };
    });

    // Calculate averages
    const totals = trends.reduce(
      (acc, curr) => ({
        clarity: acc.clarity + curr.clarity,
        structure: acc.structure + curr.structure,
        confidence: acc.confidence + curr.confidence,
        overall: acc.overall + curr.overall,
      }),
      { clarity: 0, structure: 0, confidence: 0, overall: 0 }
    );

    const count = trends.length;
    const averages = {
      clarity: Math.round(totals.clarity / count),
      structure: Math.round(totals.structure / count),
      confidence: Math.round(totals.confidence / count),
      overall: Math.round(totals.overall / count),
    };

    // Calculate improvement (first vs last)
    const improvement = {
      clarity: trends[trends.length - 1].clarity - trends[0].clarity,
      structure: trends[trends.length - 1].structure - trends[0].structure,
      confidence: trends[trends.length - 1].confidence - trends[0].confidence,
      overall: trends[trends.length - 1].overall - trends[0].overall,
    };

    return NextResponse.json({
      trends,
      averages,
      improvement,
      totalEvaluations: count,
    });
  } catch (error) {
    console.error('Error fetching skill trends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
