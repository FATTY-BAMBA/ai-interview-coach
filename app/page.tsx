'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

type InterviewType = 'behavioral' | 'technical' | 'system-design' | 'case-study';

const INTERVIEW_TYPES = [
  {
    id: 'behavioral' as InterviewType,
    name: 'Behavioral Interview',
    icon: '🗣️',
    description: 'STAR-method questions about past experiences and situations',
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700',
  },
  {
    id: 'technical' as InterviewType,
    name: 'Technical Interview',
    icon: '💻',
    description: 'Coding problems, algorithms, and data structures questions',
    color: 'from-green-500 to-green-600',
    hoverColor: 'hover:from-green-600 hover:to-green-700',
  },
  {
    id: 'system-design' as InterviewType,
    name: 'System Design',
    icon: '🏗️',
    description: 'Architecture and scalability questions for senior roles',
    color: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:from-purple-600 hover:to-purple-700',
  },
  {
    id: 'case-study' as InterviewType,
    name: 'Case Study',
    icon: '📊',
    description: 'Business problems and analytical thinking exercises',
    color: 'from-orange-500 to-orange-600',
    hoverColor: 'hover:from-orange-600 hover:to-orange-700',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [selectedType, setSelectedType] = useState<InterviewType>('behavioral');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startInterview = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewType: selectedType }),
      });

      if (!response.ok) {
        throw new Error('Failed to create interview');
      }

      const data = await response.json();
      router.push(`/interview/${data.session.roomName}`);
    } catch (err: any) {
      console.error('Error creating interview:', err);
      setError(err.message || 'Failed to start interview');
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎤</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">AI Interview Coach</h1>
            </div>
            <div className="flex items-center space-x-4">
              {session?.user && (
                <>
                  <span className="text-sm text-gray-600">
                    👋 {session.user.name || session.user.email}
                  </span>
                  <button
                    onClick={() => signOut()}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Practice Interviews with AI
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get real-time feedback and improve your interview skills with our AI-powered coach.
            Choose your interview type and start practicing!
          </p>
        </div>

        {/* Interview Type Selection */}
        <div className="max-w-5xl mx-auto mb-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Choose Interview Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`relative p-6 rounded-2xl text-left transition-all duration-200 ${
                  selectedType === type.id
                    ? `bg-gradient-to-br ${type.color} text-white shadow-xl scale-105`
                    : 'bg-white text-gray-900 shadow-md hover:shadow-lg hover:scale-102'
                }`}
              >
                {selectedType === type.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                <div className="flex items-start space-x-4">
                  <div className="text-4xl">{type.icon}</div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold mb-2">{type.name}</h4>
                    <p className={`text-sm ${selectedType === type.id ? 'text-white/90' : 'text-gray-600'}`}>
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <div className="text-center">
          <button
            onClick={startInterview}
            disabled={loading}
            className="inline-flex items-center px-8 py-4 rounded-xl text-lg font-semibold bg-gray-900 text-white shadow-lg transition-all duration-200 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Interview...
              </>
            ) : (
              <>
                <span className="text-2xl mr-3">🎤</span>
                Start {INTERVIEW_TYPES.find((t) => t.id === selectedType)?.name}
              </>
            )}
          </button>
        </div>

        {/* Features */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice-Based</h3>
            <p className="text-gray-600">Practice with real voice conversations, just like a real interview</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Feedback</h3>
            <p className="text-gray-600">Get detailed evaluation reports with scores and improvements</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bilingual Support</h3>
            <p className="text-gray-600">Practice in English or Traditional Chinese (Taiwan)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
