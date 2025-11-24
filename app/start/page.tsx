'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { LANGUAGE_OPTIONS } from '@/lib/config/languages';
import type { SupportedLanguage } from '@/lib/types/language';
import { isValidLanguage } from '@/lib/types/language';

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

const STORAGE_KEY = 'lyraai-preferred-language';

export default function StartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('zh-TW');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login'); // Keep your custom login page
    }
  }, [status, router]);

  // Load saved language preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidLanguage(saved)) {
        setSelectedLanguage(saved);
      }
    } catch (error) {
      console.warn('Could not load language preference:', error);
    }
  }, []);

  // Save language preference when changed
  const handleLanguageChange = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn('Could not save language preference:', error);
    }
  };

  const startInterview = async (type: string) => {
    setCreating(type);
    try {
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          interviewType: type,
          spokenLanguage: selectedLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create interview session');
      }

      const data = await response.json();
      
      const sessionId = data.session.id;
      const roomName = data.session.roomName;
      
      analytics.interviewStarted(sessionId, type);
      router.push(`/interview/${roomName}`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert(error instanceof Error ? error.message : 'Failed to start interview. Please try again.');
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LyraAI
                </h1>
                <p className="text-sm text-gray-500">Your AI Interview Coach</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{session.user?.name || session.user?.email}</span>
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Start a New Interview
          </h2>
          <p className="text-gray-600">
            Choose your language and interview type to begin practicing
          </p>
        </div>

        {/* Language Selector */}
        <div className="mb-12 bg-white rounded-2xl shadow-lg p-8 border-2 border-indigo-100">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
              <span className="mr-2">🌐</span>
              Interview Language / 面試語言
            </h3>
            <p className="text-sm text-gray-600">
              Select the language you'll speak during the interview
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {LANGUAGE_OPTIONS.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                  selectedLanguage === language.code
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-4">
                  <div className="text-5xl">{language.flag}</div>
                  <div className="flex-1">
                    <div className="font-bold text-lg text-gray-900 mb-1">
                      {language.nativeName}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {language.name}
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                      {language.description}
                    </div>
                    
                    {language.helperText && (
                      <div className="text-xs text-indigo-600 font-medium mb-2">
                        {language.helperText}
                      </div>
                    )}

                    {selectedLanguage === language.code && (
                      <div className="flex items-center text-indigo-600 font-semibold text-sm">
                        <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Selected
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Language Lock Notice */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">
                  Language will be locked during interview
                </p>
                <p className="text-blue-800">
                  The AI interviewer will conduct the entire session in your selected language 
                  and won't switch languages mid-conversation. This ensures accurate 
                  transcription and a professional interview experience.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Type Selection */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Choose Interview Type
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {INTERVIEW_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => startInterview(type.id)}
                disabled={creating !== null}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-left border border-gray-100 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <div className="text-4xl mb-3">{type.icon}</div>
                <h4 className="text-lg font-bold text-gray-900 mb-1">
                  {type.name}
                </h4>
                <p className="text-sm text-gray-600 mb-4">{type.description}</p>
                <div className={`w-full bg-gradient-to-r ${type.color} text-white px-4 py-2 rounded-lg text-center text-sm font-semibold`}>
                  {creating === type.id ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Starting...
                    </span>
                  ) : (
                    'Start'
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
