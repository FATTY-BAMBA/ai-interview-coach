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

export default function StartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

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
      {/* Header - EXACT SAME as Dashboard */}
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
                onClick={() => router.push('/dashboard')}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title Section - SAME STYLE as Dashboard sections */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Start a New Interview
          </h2>
          <p className="text-gray-600">
            Choose an interview type to begin practicing
          </p>
        </div>

        {/* Interview Type Cards - EXACT SAME DESIGN as Dashboard */}
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

        {/* Customization Section - THIS IS WHERE WE'LL ADD OPTIONS NEXT */}
        {/* Coming next: Difficulty, Duration, Company Style, Interviewer Personality */}
      </main>
    </div>
  );
}
