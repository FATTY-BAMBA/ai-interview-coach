'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';

interface Evaluation {
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;
  
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (sessionId) {
      analytics.evaluationViewed(sessionId);
      loadEvaluation();
    }
  }, [sessionId]);

  const loadEvaluation = async () => {
    try {
      const response = await fetch(`/api/interview/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        
        // Check if evaluation already exists
        if (data.session.evaluationReports && data.session.evaluationReports.length > 0) {
          setEvaluation(data.session.evaluationReports[0]);
          setLoading(false);
        } else {
          // Auto-generate evaluation if it doesn't exist
          await generateEvaluation();
        }
      }
    } catch (error) {
      console.error('Error fetching evaluation:', error);
      setLoading(false);
    }
  };

  const generateEvaluation = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (response.ok) {
        const data = await response.json();
        setEvaluation(data.evaluation);
      } else {
        console.error('Failed to generate evaluation');
      }
    } catch (error) {
      console.error('Error generating evaluation:', error);
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => {
    const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
    const bgColor = score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100';
    return (
      <div className="text-center">
        <div className={`w-24 h-24 mx-auto rounded-full ${bgColor} flex items-center justify-center mb-3`}>
          <div className={`text-3xl font-bold ${color}`}>{score}</div>
        </div>
        <div className="text-sm font-medium text-gray-700">{label}</div>
      </div>
    );
  };

  if (loading || generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-gray-900 mb-2">
            {generating ? 'Analyzing Your Performance...' : 'Loading Evaluation...'}
          </p>
          <p className="text-gray-600">This may take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Interview Evaluation</h1>
              <p className="text-sm text-gray-600 mt-1">Detailed performance analysis and feedback</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {evaluation ? (
          <div className="space-y-8">
            {/* Overall Scores */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Performance Scores</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <ScoreCircle score={evaluation.overallScore} label="Overall" />
                <ScoreCircle score={evaluation.clarityScore} label="Clarity" />
                <ScoreCircle score={evaluation.structureScore} label="Structure" />
                <ScoreCircle score={evaluation.confidenceScore} label="Confidence" />
              </div>
            </div>

            {/* Detailed Feedback */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Feedback</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 text-lg leading-relaxed">{evaluation.detailedFeedback}</p>
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg p-8 border-2 border-green-200">
                <h3 className="text-xl font-bold text-green-900 mb-6 flex items-center">
                  <span className="text-3xl mr-3">✅</span>
                  Key Strengths
                </h3>
                <ul className="space-y-4">
                  {evaluation.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-600 text-xl mr-3 mt-1">•</span>
                      <span className="text-gray-800 text-base leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg p-8 border-2 border-blue-200">
                <h3 className="text-xl font-bold text-blue-900 mb-6 flex items-center">
                  <span className="text-3xl mr-3">💡</span>
                  Areas for Growth
                </h3>
                <ul className="space-y-4">
                  {evaluation.improvements.map((improvement, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-blue-600 text-xl mr-3 mt-1">•</span>
                      <span className="text-gray-800 text-base leading-relaxed">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Transcript */}
            {session?.conversationTurns && session.conversationTurns.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Full Transcript</h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4">
                  {session.conversationTurns.map((turn: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl ${
                        turn.role === 'user' 
                          ? 'bg-indigo-50 border-l-4 border-indigo-500 ml-8' 
                          : 'bg-gray-50 border-l-4 border-gray-400 mr-8'
                      }`}
                    >
                      <p className="font-semibold text-sm text-gray-700 mb-2">
                        {turn.role === 'user' ? '👤 You' : '🤖 LyraAI'}
                      </p>
                      <p className="text-gray-900 leading-relaxed">{turn.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                Practice Another Interview
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              No Evaluation Available
            </h2>
            <p className="text-gray-600 mb-8">
              Unable to generate evaluation. Please ensure the interview has transcript data.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
