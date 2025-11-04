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

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      analytics.userLoggedIn(session.user.id);
    }
  }, [session]);

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
      analytics.interviewStarted(data.sessionId, type);
      router.push(`/interview/${data.roomName}`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert('Failed to start interview. Please try again.');
      setCreating(null);
    }
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
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Interview Type
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Practice with AI-powered interviews. Get real-time feedback and improve your skills.
          </p>
        </div>

        {/* Interview Type Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {INTERVIEW_TYPES.map((type) => (
            <div
              key={type.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 transform hover:scale-105"
            >
              <div className={`h-2 bg-gradient-to-r ${type.color}`}></div>
              <div className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="text-5xl">{type.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      {type.name}
                    </h3>
                    <p className="text-gray-600 mb-6">{type.description}</p>
                    <button
                      onClick={() => startInterview(type.id)}
                      disabled={creating !== null}
                      className={`w-full bg-gradient-to-r ${type.color} text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:scale-105 active:scale-95`}
                    >
                      {creating === type.id ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Starting...
                        </span>
                      ) : (
                        'Start Interview'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Past Interviews Section (Coming Soon) */}
        <div className="mt-16 text-center">
          <div className="inline-block bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              📊 Interview History Coming Soon
            </h3>
            <p className="text-gray-600">
              Track your progress, review past interviews, and see your improvement over time.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
