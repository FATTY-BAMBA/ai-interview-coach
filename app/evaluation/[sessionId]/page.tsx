'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [evaluation, setEvaluation] = useState<any>(null);

  useEffect(() => {
    if (sessionId) {
      analytics.evaluationViewed(sessionId);
    }
    fetchEvaluation();
  }, [sessionId]);

  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`/api/interview/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setEvaluation(data.session);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Interview Evaluation</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold mb-4">Session: {sessionId}</h2>
          <p className="text-gray-600">
            Evaluation results will appear here once AI processing is complete.
          </p>
          
          {evaluation?.transcripts && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4">Transcript</h3>
              <div className="space-y-3">
                {evaluation.transcripts.map((t: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-indigo-500 pl-4 py-2">
                    <p className="font-semibold text-sm text-gray-700">
                      {t.speaker === 'user' ? 'You' : 'LyraAI'}
                    </p>
                    <p className="text-gray-900">{t.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
