'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';

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
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      analytics.userLoggedIn(session.user.id);
      fetchSessions();
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
      
      // Fix: Use data.session.id and data.session.roomName
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
        {/* Start New Interview Section */}
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

        {/* Interview History Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Interview History</h2>
            <p className="text-sm text-gray-600 mt-1">Review your past practice sessions</p>
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
                  {sessions.map((session) => {
                    const typeInfo = getInterviewTypeInfo(session.interviewType);
                    return (
                      <tr 
                        key={session.id}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => router.push(`/evaluation/${session.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{typeInfo.icon}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {typeInfo.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {session.transcripts?.length || 0} messages
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(session.createdAt)}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(session.createdAt).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getDuration(session.createdAt, session.updatedAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(session.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/evaluation/${session.id}`);
                            }}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            View Details →
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
