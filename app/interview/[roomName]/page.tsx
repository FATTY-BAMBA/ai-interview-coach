'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';

const INTERVIEW_TYPE_INFO = {
  behavioral: { name: 'Behavioral Interview', icon: '🗣️', color: 'blue' },
  technical: { name: 'Technical Interview', icon: '💻', color: 'green' },
  'system-design': { name: 'System Design', icon: '🏗️', color: 'purple' },
  'case-study': { name: 'Case Study', icon: '📊', color: 'orange' },
};

function InterviewControls({ sessionId, roomName }: { sessionId: string; roomName: string }) {
  const router = useRouter();
  const room = useRoomContext();
  const [ending, setEnding] = useState(false);

  const endInterview = async () => {
    if (!confirm('Are you sure you want to end the interview?')) {
      return;
    }

    setEnding(true);

    try {
      await fetch(`/api/interview/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      room?.disconnect();
      router.push(`/evaluation/${sessionId}`);
    } catch (error) {
      console.error('Error ending interview:', error);
      setEnding(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button
        onClick={endInterview}
        disabled={ending}
        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
      >
        {ending ? 'Ending Interview...' : '🏁 End Interview & Get Feedback'}
      </button>
    </div>
  );
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const roomName = params.roomName as string;

  const [token, setToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [interviewType, setInterviewType] = useState<string>('behavioral');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoomToken();
  }, [roomName]);

  const fetchRoomToken = async () => {
    try {
      const extractedSessionId = roomName.replace('interview-', '');
      setSessionId(extractedSessionId);

      const sessionResponse = await fetch(`/api/interview/${extractedSessionId}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setInterviewType(sessionData.session.interviewType || 'behavioral');
      }

      const response = await fetch('/api/livekit/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName }),
      });

      if (!response.ok) {
        throw new Error('Failed to get room token');
      }

      const data = await response.json();
      setToken(data.token);
    } catch (err: any) {
      console.error('Error fetching room token:', err);
      setError(err.message || 'Failed to join interview');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Connecting to interview room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const typeInfo = INTERVIEW_TYPE_INFO[interviewType as keyof typeof INTERVIEW_TYPE_INFO] || INTERVIEW_TYPE_INFO.behavioral;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{typeInfo.icon}</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{typeInfo.name}</h1>
                <p className="text-sm text-gray-500">Room: {roomName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
        >
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8 text-white text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-16 h-16 bg-white/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">Connected to Interview</h2>
              <p className="text-indigo-100">
                The AI interviewer will speak first. Listen carefully and respond naturally.
              </p>
            </div>

            <div className="p-6 bg-blue-50 border-b border-blue-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Interview Tips:</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Speak clearly and take your time to think before answering</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Use the STAR method: Situation, Task, Action, Result</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Be specific with examples and numbers when possible</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>It's okay to ask for clarification if needed</span>
                </li>
              </ul>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">Microphone Active</p>
                    <p className="text-xs text-gray-500">Speak naturally - the AI is listening</p>
                  </div>
                </div>
                <RoomAudioRenderer />
              </div>

              <InterviewControls sessionId={sessionId} roomName={roomName} />
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              🎯 What happens next?
            </h3>
            <ol className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold text-indigo-600 mr-2">1.</span>
                <span>Answer 3-4 interview questions from the AI coach</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-indigo-600 mr-2">2.</span>
                <span>Click "End Interview" when you're ready to finish</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold text-indigo-600 mr-2">3.</span>
                <span>Get your detailed evaluation report with scores and feedback</span>
              </li>
            </ol>
          </div>
        </LiveKitRoom>
      </main>
    </div>
  );
}
EOF  
cat > app/evaluation/\[sessionId\]/page.tsx << 'EOF'
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface EvaluationData {
  id: string;
  sessionId: string;
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
  generatedAt: string;
}

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchEvaluation();
    }
  }, [sessionId]);

  const fetchEvaluation = async () => {
    try {
      const response = await fetch(`/api/interview/${sessionId}/evaluation`);
      
      if (response.ok) {
        const data = await response.json();
        setEvaluation(data.evaluation);
      } else if (response.status === 404) {
        setEvaluation(null);
      } else {
        setError('Failed to load evaluation');
      }
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      setError('Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  const generateEvaluation = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate evaluation');
      }

      const data = await response.json();
      setEvaluation(data.evaluation);
    } catch (err: any) {
      console.error('Error generating evaluation:', err);
      setError(err.message || 'Failed to generate evaluation');
    } finally {
      setGenerating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Evaluation Report</h1>
            <p className="text-gray-600">
              Your interview is complete! Click below to generate a detailed evaluation report with personalized feedback.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={generateEvaluation}
            disabled={generating}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {generating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Report...
              </span>
            ) : (
              'Generate Evaluation Report'
            )}
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full mt-3 text-gray-600 hover:text-gray-800 py-2 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Interview Evaluation Report</h1>
            <div className="text-sm text-gray-500">
              {new Date(evaluation.generatedAt).toLocaleDateString()}
            </div>
          </div>
          <p className="text-gray-600">
            Here's your personalized feedback and performance analysis.
          </p>
        </div>

        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 mb-6 text-white">
          <div className="text-center">
            <div className="text-6xl font-bold mb-2">{evaluation.overallScore}/10</div>
            <div className="text-xl font-semibold mb-1">Overall Performance</div>
            <div className="text-indigo-100">{getScoreLabel(evaluation.overallScore)}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Score Breakdown</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ScoreCard
              title="Clarity"
              score={evaluation.clarityScore}
              description="Communication & articulation"
            />
            <ScoreCard
              title="Structure"
              score={evaluation.structureScore}
              description="STAR method & organization"
            />
            <ScoreCard
              title="Confidence"
              score={evaluation.confidenceScore}
              description="Professional demeanor"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Strengths</h2>
          </div>
          <ul className="space-y-3">
            {evaluation.strengths.map((strength, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Areas for Improvement</h2>
          </div>
          <ul className="space-y-3">
            {evaluation.improvements.map((improvement, index) => (
              <li key={index} className="flex items-start">
                <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-gray-700">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Detailed Feedback</h2>
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {evaluation.detailedFeedback}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Start New Interview
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            Download Report
          </button>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ title, score, description }: { title: string; score: number; description: string }) {
  const getColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="text-center p-6 bg-gray-50 rounded-xl">
      <div className="text-4xl font-bold text-gray-900 mb-2">{score}/10</div>
      <div className="text-lg font-semibold text-gray-800 mb-1">{title}</div>
      <div className="text-sm text-gray-600 mb-3">{description}</div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${getColor(score)}`}
          style={{ width: `${score * 10}%` }}
        ></div>
      </div>
    </div>
  );
}
