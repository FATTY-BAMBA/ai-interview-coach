'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const INTERVIEW_TYPES = [
  {
    id: 'behavioral',
    name: 'Behavioral Interview',
    description: 'Practice STAR-method answers for behavioral questions',
    icon: '🗣️',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'technical',
    name: 'Technical Interview',
    description: 'Code and algorithm questions with real-time feedback',
    icon: '💻',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'system-design',
    name: 'System Design',
    description: 'Architecture discussions and scalability questions',
    icon: '🏗️',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Business analysis and consulting-style interviews',
    icon: '📊',
    color: 'from-orange-500 to-orange-600',
  },
];

const getInterviewTypeInfo = (type: string) => {
  return INTERVIEW_TYPES.find(t => t.id === type) || INTERVIEW_TYPES[0];
};

interface InterviewSession {
  id: string;
  interviewType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  roomName: string;
  transcripts?: any[];
  evaluationReports?: any[];
}

interface DashboardStats {
  totalInterviews: number;
  avgDuration: number;
  mostPracticedType: string;
  overallScore: number | null;
  weeklyActivity: Array<{ date: string; interviews: number; dayName: string }>;
  bestDay: string;
  currentStreak: number;
  interviewsThisWeek: number;
  totalHours: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      analytics.userLoggedIn(session.user.id);
      fetchSessions();
      fetchStats();
    }
  }, [session]);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/interview/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const startInterview = async (type: string) => {
    setCreating(type);
    try {
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewType: type }),
      });

      if (!response.ok) {
        throw new Error('Failed to create interview session');
      }

      const data = await response.json();
      
      const sessionId = data.session.id;
      const roomName = data.session.roomName;
      
      analytics.interviewStarted(sessionId, type);
      router.push(`/interview/${roomName}`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert('Failed to start interview. Please try again.');
      setCreating(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDuration = (createdAt: string, updatedAt: string) => {
    const start = new Date(createdAt);
    const end = new Date(updatedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      scheduled: 'bg-gray-100 text-gray-800',
    };
    
    const labels = {
      completed: 'Completed',
      in_progress: 'In Progress',
      scheduled: 'Scheduled',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || styles.scheduled}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const mostPracticedTypeInfo = stats ? getInterviewTypeInfo(stats.mostPracticedType) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LyraAI
                </h1>
                <p className="text-sm text-gray-500">Your AI Interview Coach</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{session.user?.name || session.user?.email}</span>
              </span>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 1. Start New Interview Section - NOW FIRST! */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Start a New Interview
            </h2>
            <p className="text-gray-600">
              Choose an interview type to begin practicing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => startInterview(type.id)}
                disabled={creating !== null}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-left border border-gray-100 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-4xl mb-3">{type.icon}</div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {type.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                <div className={`w-full bg-gradient-to-r ${type.color} text-white px-4 py-2 rounded-lg text-center text-sm font-semibold`}>
                  {creating === type.id ? 'Starting...' : 'Start'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Progress Metrics Cards - NOW SECOND! */}
        {!loadingStats && stats && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Your Progress</h2>
            
            {/* Top Row - Main Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Total Interviews */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Total Interviews</span>
                  <span className="text-3xl">🎯</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalInterviews}</div>
                <p className="text-xs text-gray-500 mt-1">All-time practice sessions</p>
              </div>

              {/* Average Duration */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Avg Duration</span>
                  <span className="text-3xl">⏱️</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">{stats.avgDuration} min</div>
                <p className="text-xs text-gray-500 mt-1">Average interview length</p>
              </div>

              {/* Most Practiced Type */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Most Practiced</span>
                  <span className="text-3xl">{mostPracticedTypeInfo?.icon}</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{mostPracticedTypeInfo?.name}</div>
                <p className="text-xs text-gray-500 mt-1">Your focus area</p>
              </div>

              {/* Overall Score */}
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-sm font-medium">Overall Score</span>
                  <span className="text-3xl">📊</span>
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.overallScore !== null ? stats.overallScore : 'N/A'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.overallScore !== null ? 'Average performance' : 'Complete an interview'}
                </p>
              </div>
            </div>

            {/* Bottom Row - Weekly Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* This Week */}
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-md p-6 border-2 border-indigo-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-indigo-900 text-sm font-semibold">This Week</span>
                  <span className="text-3xl">📅</span>
                </div>
                <div className="text-3xl font-bold text-indigo-900">{stats.interviewsThisWeek}</div>
                <p className="text-xs text-indigo-700 mt-1">Interviews completed</p>
              </div>

              {/* Current Streak */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow-md p-6 border-2 border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-orange-900 text-sm font-semibold">Current Streak</span>
                  <span className="text-3xl">🔥</span>
                </div>
                <div className="text-3xl font-bold text-orange-900">{stats.currentStreak} days</div>
                <p className="text-xs text-orange-700 mt-1">Keep it going!</p>
              </div>

              {/* Total Practice Time */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border-2 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-green-900 text-sm font-semibold">Practice Time</span>
                  <span className="text-3xl">⏰</span>
                </div>
                <div className="text-3xl font-bold text-green-900">{stats.totalHours}h</div>
                <p className="text-xs text-green-700 mt-1">Total time invested</p>
              </div>
            </div>
          </div>
        )}

        {/* 3. Weekly Activity Chart - NOW THIRD! */}
        {!loadingStats && stats && stats.weeklyActivity.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Weekly Activity</h2>
                <p className="text-sm text-gray-600 mt-1">Your practice consistency over the last 7 days</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-600">Best Day</div>
                <div className="text-lg font-bold text-indigo-600">{stats.bestDay}</div>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="dayName" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="interviews" 
                  stroke="#6366f1" 
                  strokeWidth={3}
                  dot={{ fill: '#6366f1', r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 4. Interview History Section - STAYS AT BOTTOM */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Interview History</h2>
            <p className="text-sm text-gray-600 mt-1">Review your past practice sessions and evaluations</p>
          </div>

          {loadingSessions ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading your interviews...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No interviews yet</h3>
              <p className="text-gray-600">Start your first practice interview above to begin!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessions.map((sessionItem) => {
                    const typeInfo = getInterviewTypeInfo(sessionItem.interviewType);
                    hasEvaluation = sessionItem.evaluationReports && sessionItem.evaluationReports.length > 0;
                    
                    return (
                      <tr 
                        key={sessionItem.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/evaluation/${sessionItem.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{typeInfo.icon}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {typeInfo.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {sessionItem.transcripts?.length || 0} messages
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(sessionItem.createdAt)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(sessionItem.createdAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getDuration(sessionItem.createdAt, sessionItem.updatedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(sessionItem.status)}
                            {hasEvaluation && (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                                ✓ Evaluated
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/evaluation/${sessionItem.id}`);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            {hasEvaluation ? 'View Evaluation →' : 'View Details →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
