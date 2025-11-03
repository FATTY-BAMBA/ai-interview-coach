'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const INTERVIEW_TYPES = [
  {
    id: 'behavioral',
    name: 'Behavioral Interview',
    description: 'STAR method questions about your past experiences',
    icon: '🗣️',
    color: 'from-blue-500 to-blue-600',
    hoverColor: 'hover:from-blue-600 hover:to-blue-700',
  },
  {
    id: 'technical',
    name: 'Technical Interview',
    description: 'Coding challenges and algorithm questions',
    icon: '💻',
    color: 'from-green-500 to-green-600',
    hoverColor: 'hover:from-green-600 hover:to-green-700',
  },
  {
    id: 'system-design',
    name: 'System Design',
    description: 'Architecture and scalability discussions',
    icon: '🏗️',
    color: 'from-purple-500 to-purple-600',
    hoverColor: 'hover:from-purple-600 hover:to-purple-700',
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Business problems and analytical thinking',
    icon: '📊',
    color: 'from-orange-500 to-orange-600',
    hoverColor: 'hover:from-orange-600 hover:to-orange-700',
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!data?.user) {
          router.push('/api/auth/signin');
        } else {
          setUser(data.user);
        }
        setLoading(false);
      });
  }, [router]);

  const startInterview = async (type: string) => {
    setCreating(true);
    try {
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewType: type }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/interview/${data.session.roomName}`);
      }
    } catch (error) {
      console.error('Error creating interview:', error);
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">L</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                LyraAI
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 font-medium">{user?.name}</span>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-xl text-gray-600">
            Choose an interview type to start practicing
          </p>
        </div>

        {/* Interview Types Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {INTERVIEW_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => startInterview(type.id)}
              disabled={creating}
              className={`relative group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-200 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed text-left`}
            >
              <div className="flex items-start space-x-4">
                <div className="text-5xl">{type.icon}</div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">{type.name}</h2>
                  <p className="text-gray-600 mb-4">{type.description}</p>
                  <div className={`inline-flex items-center space-x-2 bg-gradient-to-r ${type.color} text-white px-6 py-3 rounded-xl font-semibold ${type.hoverColor} transition-all`}>
                    <span>{creating ? 'Creating...' : 'Start Interview'}</span>
                    <span>→</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
