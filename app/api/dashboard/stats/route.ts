import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { interviewSessions, evaluationReports, users } from '@/lib/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

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

    // Get all sessions for the user
    const allSessions = await db.query.interviewSessions.findMany({
      where: eq(interviewSessions.userId, user.id),
      orderBy: [desc(interviewSessions.createdAt)],
      with: {
        evaluationReports: true,
      },
    });

    // Calculate total interviews
    const totalInterviews = allSessions.length;

    // Calculate average duration (in minutes)
    const durationsInMinutes = allSessions.map(s => {
      const start = new Date(s.createdAt);
      const end = new Date(s.updatedAt);
      return Math.floor((end.getTime() - start.getTime()) / 60000);
    });
    const avgDuration = durationsInMinutes.length > 0
      ? Math.round(durationsInMinutes.reduce((a, b) => a + b, 0) / durationsInMinutes.length)
      : 0;

    // Find most practiced interview type
    const typeCounts: Record<string, number> = {};
    allSessions.forEach(s => {
      typeCounts[s.interviewType] = (typeCounts[s.interviewType] || 0) + 1;
    });
    const mostPracticedType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'behavioral';

    // Calculate overall improvement score (average of all evaluation scores)
    const evaluatedSessions = allSessions.filter(s => s.evaluationReports && s.evaluationReports.length > 0);
    const allScores = evaluatedSessions.map(s => s.evaluationReports[0].overallScore);
    const overallScore = allScores.length > 0
      ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : null;

    // Get interviews from last 7 days for weekly activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSessions = allSessions.filter(s => new Date(s.createdAt) >= sevenDaysAgo);

    // Group by day
    const dailyActivity: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyActivity[dateKey] = 0;
    }

    recentSessions.forEach(s => {
      const dateKey = new Date(s.createdAt).toISOString().split('T')[0];
      if (dateKey in dailyActivity) {
        dailyActivity[dateKey]++;
      }
    });

    // Convert to array for chart
    const weeklyActivity = Object.entries(dailyActivity).map(([date, count]) => ({
      date,
      interviews: count,
      dayName: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    }));

    // Find best performing day
    const dayOfWeekCounts: Record<string, { count: number; scores: number[] }> = {
      'Monday': { count: 0, scores: [] },
      'Tuesday': { count: 0, scores: [] },
      'Wednesday': { count: 0, scores: [] },
      'Thursday': { count: 0, scores: [] },
      'Friday': { count: 0, scores: [] },
      'Saturday': { count: 0, scores: [] },
      'Sunday': { count: 0, scores: [] },
    };

    evaluatedSessions.forEach(s => {
      const dayName = new Date(s.createdAt).toLocaleDateString('en-US', { weekday: 'long' });
      dayOfWeekCounts[dayName].count++;
      dayOfWeekCounts[dayName].scores.push(s.evaluationReports[0].overallScore);
    });

    // Find day with highest average score
    let bestDay = 'Monday';
    let bestScore = 0;
    Object.entries(dayOfWeekCounts).forEach(([day, data]) => {
      if (data.scores.length > 0) {
        const avgScore = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestDay = day;
        }
      }
    });

    // Calculate current streak
    let currentStreak = 0;
    const sortedByDate = [...allSessions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    if (sortedByDate.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let checkDate = new Date(today);
      const sessionDates = new Set(
        sortedByDate.map(s => new Date(s.createdAt).toISOString().split('T')[0])
      );

      // Check if there's a session today or yesterday
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (sessionDates.has(todayStr) || sessionDates.has(yesterdayStr)) {
        // Start counting streak
        while (true) {
          const dateStr = checkDate.toISOString().split('T')[0];
          if (sessionDates.has(dateStr)) {
            currentStreak++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Interviews this week
    const interviewsThisWeek = recentSessions.length;

    // Total practice time (in hours)
    const totalMinutes = durationsInMinutes.reduce((a, b) => a + b, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal

    return NextResponse.json({
      totalInterviews,
      avgDuration,
      mostPracticedType,
      overallScore,
      weeklyActivity,
      bestDay,
      currentStreak,
      interviewsThisWeek,
      totalHours,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
