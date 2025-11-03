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

interface Transcript {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

function InterviewControls({ sessionId, transcripts }: { sessionId: string; transcripts: Transcript[] }) {
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

  // Auto-scroll transcript to bottom
  useEffect(() => {
    const container = document.getElementById('transcript-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="space-y-4">
      {/* Live Transcript Panel */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>Live Transcript</span>
          </h3>
        </div>
        
        <div 
          id="transcript-container"
          className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {transcripts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>Transcript will appear here as you speak...</p>
            </div>
          ) : (
            transcripts.map((transcript, idx) => (
              <div
                key={idx}
                className={`flex ${transcript.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-2 ${
                    transcript.speaker === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200'
                  }`}
                >
                  <p className="text-xs font-semibold mb-1 opacity-70">
                    {transcript.speaker === 'user' ? 'You' : 'LyraAI'}
                  </p>
                  <p className="text-sm">{transcript.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* End Interview Button */}
      <button
        onClick={endInterview}
        disabled={ending}
        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
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
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRoomToken();
  }, [roomName]);

  useEffect(() => {
    // Poll for transcripts from database
    if (!sessionId) return;

    const pollTranscripts = async () => {
      try {
        const response = await fetch(`/api/interview/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.session?.transcripts) {
            // Sort by timestamp (oldest first)
            const sortedTranscripts = data.session.transcripts
              .map((t: any) => ({
                speaker: t.speaker,
                text: t.text,
                timestamp: new Date(t.timestamp),
              }))
              .sort((a: Transcript, b: Transcript) => 
                a.timestamp.getTime() - b.timestamp.getTime()
              );
            setTranscripts(sortedTranscripts);
          }
        }
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollTranscripts, 2000);
    pollTranscripts(); // Initial fetch

    return () => clearInterval(interval);
  }, [sessionId]);

  const fetchRoomToken = async () => {
    try {
      const sessionResponse = await fetch(`/api/interview/by-room/${roomName}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        const realSessionId = sessionData.session.id;
        setSessionId(realSessionId);
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
      
      if (typeof data.token !== 'string') {
        throw new Error('Invalid token format received');
      }

      setToken(data.token);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching room token:', err);
      setError(err.message || 'Failed to connect to interview room');
      setLoading(false);
    }
  };

  const typeInfo = INTERVIEW_TYPE_INFO[interviewType as keyof typeof INTERVIEW_TYPE_INFO] || INTERVIEW_TYPE_INFO.behavioral;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to interview room...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LiveKitRoom
          token={token}
          serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
          connect={true}
          audio={true}
          video={false}
          className="h-full"
        >
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 shadow-xl">
                <div className="text-center space-y-6">
                  <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mx-auto flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Connected to Interview</h2>
                    <p className="text-indigo-100">The AI interviewer will speak first. Listen carefully and respond naturally.</p>
                  </div>
                  
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold">Microphone Active</p>
                      <p className="text-indigo-100 text-sm">Speak naturally - the AI is listening</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <InterviewControls sessionId={sessionId} transcripts={transcripts} />
            </div>
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      </main>
    </div>
  );
}
