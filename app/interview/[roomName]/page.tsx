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

function InterviewControls({ sessionId }: { sessionId: string }) {
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
      // FIXED: Fetch real session UUID using room name
      const sessionResponse = await fetch(`/api/interview/by-room/${roomName}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const realSessionId = sessionData.session.id;
        setSessionId(realSessionId); // Use real UUID!
        setInterviewType(sessionData.session.interviewType || 'behavioral');
      } else {
        throw new Error('Failed to fetch session data');
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
      console.log('Token response:', { hasToken: !!data.token, tokenType: typeof data.token, tokenLength: data.token?.length });
      
      if (typeof data.token !== 'string') {
        console.error('Invalid token type:', typeof data.token, data.token);
        throw new Error('Invalid token format received');
      }

      setToken(data.token);
      console.log('Token set successfully, length:', data.token.length);
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

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Waiting for token...</p>
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
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg font-bold">L</span>
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LyraAI
                </span>
              </div>
              <div className="h-6 w-px bg-gray-300"></div>
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{typeInfo.icon}</div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{typeInfo.name}</h1>
                  <p className="text-sm text-gray-500">Room: {roomName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live</span>
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

              <InterviewControls sessionId={sessionId} />
            </div>
          </div>
        </LiveKitRoom>
      </main>
    </div>
  );
}
