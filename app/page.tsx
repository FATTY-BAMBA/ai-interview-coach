'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleSignIn = () => {
    router.push('/api/auth/signin');
  };

  const handleGetStarted = () => {
    router.push('/dashboard');
  };

  const handleStartPracticing = () => {
    if (session?.user) {
      router.push('/start');
    } else {
      router.push('/api/auth/signin');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl font-bold">L</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                LyraAI
              </span>
            </div>
            <div>
              {session?.user ? (
                <button
                  onClick={handleGetStarted}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                >
                  Go to Dashboard
                </button>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg transition-all duration-200 border-2 border-indigo-200"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></span>
              <span>AI-Powered Interview Coaching</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="block text-gray-900">Master Your Next</span>
              <span className="block bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Interview with AI
              </span>
            </h1>

            {/* Subheading */}
            <p className="max-w-2xl mx-auto text-xl text-gray-600">
              Practice behavioral, technical, system design, and case study interviews with our AI coach. Get real-time feedback and improve your skills.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <button
                onClick={handleStartPracticing}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-2xl transition-all duration-200 transform hover:scale-105"
              >
                {session?.user ? 'Start Practicing' : 'Get Started Free'}
              </button>
              <button className="w-full sm:w-auto bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-lg transition-all duration-200 border-2 border-indigo-200">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interview Types */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: '🗣️',
                title: 'Behavioral',
                description: 'STAR method questions and expert feedback',
              },
              {
                icon: '💻',
                title: 'Technical',
                description: 'Coding challenges and algorithm practice',
              },
              {
                icon: '🏗️',
                title: 'System Design',
                description: 'Scalability and architecture discussions',
              },
              {
                icon: '📊',
                title: 'Case Study',
                description: 'Business problems and analytical thinking',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose LyraAI */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Why Choose LyraAI?</h2>
            <p className="text-lg text-gray-600">Powered by cutting-edge AI technology</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            {/* Voice-Based */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Voice-Based</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Practice with real voice conversations, just like a real interview</p>
            </div>

            {/* AI Feedback */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">AI Feedback</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Get detailed evaluation reports with scores and improvements</p>
            </div>

            {/* Bilingual Support */}
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Bilingual Support</h3>
              <p className="text-gray-600 text-lg leading-relaxed">Practice in English or Traditional Chinese (Taiwan)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p>© 2025 LyraAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
