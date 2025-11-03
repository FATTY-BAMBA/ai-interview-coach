'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { LiveKitRoom, useRoomContext, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';

const INTERVIEW_TYPES = {
  behavioral: { name: 'Behavioral Interview', icon: '🗣️' },
  technical: { name: 'Technical Interview', icon: '💻' },
  'system-design': { name: 'System Design Interview', icon: '🏗️' },
  'case-study': { name: 'Case Study Interview', icon: '📊' },
};

interface Transcript {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

function InterviewRoom({ roomName, token, interviewType }: any) {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [isEnding, setIsEnding] = useState(false);
  const router = useRouter();
  const room = useRoomContext();

  // Listen to transcription events from LiveKit
  useEffect(() => {
    if (!room) return;

    const handleTranscription = (
      segments: any[],
      participant: any,
      publication: any
    ) => {
      segments.forEach((segment) => {
        const isAI = participant?.identity?.includes('agent');
        setTranscripts((prev) => [
          ...prev,
          {
            speaker: isAI ? 'ai' : 'user',
            text: segment.text,
            timestamp: new Date(),
          },
        ]);
      });
    };

    room.on('transcriptionReceived', handleTranscription);

    return () => {
      room.off('transcriptionReceived', handleTranscription);
    };
  }, [room]);

  // Auto-scroll to latest transcript
  useEffect(() => {
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
      transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
    }
  }, [transcripts]);

  const handleEndInterview = async () => {
    setIsEnding(true);
    try {
      const sessionId = roomName.replace('interview-', '');
      
      await fetch('/api/interview/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName,
          status: 'completed' 
        }),
      });

      room?.disconnect();
      router.push(`/evaluation/${sessionId}`);
    } catch (error) {
      console.error('Error ending interview:', error);
      setIsEnding(false);
    }
  };

  const typeInfo = INTERVIEW_TYPES[interviewType as keyof typeof INTERVIEW_TYPES] || INTERVIEW_TYPES.behavioral;

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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video/Audio Section */}
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

            <button
              onClick={handleEndInterview}
              disabled={isEnding}
              className="mt-6 w-full bg-red-500 hover:bg-red-600 text-white px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>{isEnding ? 'Ending Interview...' : 'End Interview & Get Feedback'}</span>
            </button>
          </div>

          {/* Live Transcript Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[600px] flex flex-col">
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
                className="flex-1 overflow-y-auto p-4 space-y-3"
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
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {transcript.speaker === 'user' ? 'You' : 'AI Interviewer'}
                        </p>
                        <p className="text-sm">{transcript.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function InterviewPage() {
  const params = useParams();
  const roomName = params?.roomName as string;
  const [token, setToken] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomName) return;

    const initInterview = async () => {
      try {
        const response = await fetch('/api/interview/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName }),
        });

        const data = await response.json();

        if (data.token && data.session) {
          setToken(data.token);
          setSessionData(data.session);
        }
      } catch (error) {
        console.error('Error joining interview:', error);
      } finally {
        setLoading(false);
      }
    };

    initInterview();
  }, [roomName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Connecting to interview...</p>
        </div>
      </div>
    );
  }

  if (!token || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to connect to interview</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      connect={true}
      audio={true}
      video={false}
    >
      <InterviewRoom 
        roomName={roomName} 
        token={token}
        interviewType={sessionData.interviewType}
      />
    </LiveKitRoom>
  );
}
