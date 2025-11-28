'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from '@livekit/components-react';
import '@livekit/components-styles';
import { analytics } from '@/lib/analytics';

const INTERVIEW_TYPE_INFO = {
  behavioral: { name: 'Behavioral Interview', nameCn: '行為面試', icon: '🗣️', color: 'blue' },
  technical: { name: 'Technical Interview', nameCn: '技術面試', icon: '💻', color: 'green' },
  'system-design': { name: 'System Design', nameCn: '系統設計', icon: '🏗️', color: 'purple' },
  'case-study': { name: 'Case Study', nameCn: '案例分析', icon: '📊', color: 'orange' },
};

const SENIORITY_LABELS: Record<string, { zh: string; en: string }> = {
  junior: { zh: '初階', en: 'Junior' },
  mid: { zh: '中階', en: 'Mid-level' },
  senior: { zh: '資深', en: 'Senior' },
  lead: { zh: '主管', en: 'Lead' },
  executive: { zh: '高管', en: 'Executive' },
};

const INDUSTRY_LABELS: Record<string, { zh: string; en: string }> = {
  tech: { zh: '科技業', en: 'Technology' },
  finance: { zh: '金融業', en: 'Finance' },
  healthcare: { zh: '醫療業', en: 'Healthcare' },
  ecommerce: { zh: '電商業', en: 'E-commerce' },
  manufacturing: { zh: '製造業', en: 'Manufacturing' },
  consulting: { zh: '顧問業', en: 'Consulting' },
  media: { zh: '媒體業', en: 'Media' },
  education: { zh: '教育業', en: 'Education' },
  other: { zh: '其他', en: 'Other' },
};

interface Transcript {
  speaker: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface SessionData {
  id: string;
  interviewType: string;
  spokenLanguage: string;
  feedbackMode?: 'practice' | 'real';
  candidateRole?: string;
  candidateSeniority?: string;
  candidateIndustry?: string;
  candidateYearsExperience?: number;
}

// ============================================
// BROWSER RECORDING HOOK (backup - user voice only)
// ============================================
function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      console.log('🎙️ Browser recording started');
    } catch (error) {
      console.error('Failed to start browser recording:', error);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      console.log('🎙️ Browser recording stopped');
    }
  }, [isRecording]);

  return { isRecording, audioBlob, startRecording, stopRecording };
}

// ============================================
// SERVER RECORDING HOOK (NEW - full conversation)
// ============================================
function useServerRecording() {
  const [egressId, setEgressId] = useState<string | null>(null);
  const [isServerRecording, setIsServerRecording] = useState(false);

  const startServerRecording = useCallback(async (roomName: string, sessionId: string) => {
    try {
      const response = await fetch('/api/interview/recording/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, sessionId }),
      });

      const data = await response.json();
      
      if (data.success && data.egressId) {
        setEgressId(data.egressId);
        setIsServerRecording(true);
        console.log('🎬 Server recording started:', data.egressId);
      } else {
        console.log('ℹ️ Server recording not available:', data.message);
      }
    } catch (error) {
      console.error('Server recording start error:', error);
    }
  }, []);

  const stopServerRecording = useCallback(async (sessionId: string) => {
    if (!egressId) return;

    try {
      await fetch('/api/interview/recording/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ egressId, sessionId }),
      });
      
      setIsServerRecording(false);
      console.log('🎬 Server recording stopped');
    } catch (error) {
      console.error('Server recording stop error:', error);
    }
  }, [egressId]);

  return { egressId, isServerRecording, startServerRecording, stopServerRecording };
}

// ============================================
// MODE BADGE COMPONENT
// ============================================
function ModeBadge({ mode, isZh }: { mode?: 'practice' | 'real'; isZh: boolean }) {
  if (!mode) return null;
  
  if (mode === 'practice') {
    return (
      <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
        <span>🎓</span>
        <span>{isZh ? '練習' : 'Practice'}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center space-x-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
      <span>💼</span>
      <span>{isZh ? '實戰' : 'Real'}</span>
    </div>
  );
}

// ============================================
// RECORDING INDICATOR (shows server or browser)
// ============================================
function RecordingIndicator({ 
  isServerRecording, 
  isBrowserRecording, 
  isZh 
}: { 
  isServerRecording: boolean;
  isBrowserRecording: boolean;
  isZh: boolean;
}) {
  if (!isServerRecording && !isBrowserRecording) return null;
  
  // Server recording takes priority in display
  const isServer = isServerRecording;
  
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
      isServer ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
    }`}>
      <div className={`w-2 h-2 rounded-full animate-pulse ${
        isServer ? 'bg-red-500' : 'bg-orange-500'
      }`}></div>
      <span>
        {isServer 
          ? (isZh ? '🎬 完整錄音中' : '🎬 Full REC') 
          : (isZh ? '🎙️ 錄音中' : '🎙️ REC')
        }
      </span>
    </div>
  );
}

// ============================================
// STT QUALITY HINTS COMPONENT
// ============================================
function AudioQualityHints({ 
  language, 
  isVisible, 
  onDismiss 
}: { 
  language: string; 
  isVisible: boolean;
  onDismiss: () => void;
}) {
  const isZh = language === 'zh-TW';

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-amber-800 text-sm font-medium mb-2">
              💡 {isZh ? '語音辨識小提示' : 'Audio Tips'}
            </p>
            <ul className="text-amber-700 text-sm space-y-1">
              <li>🎤 {isZh ? '建議使用耳機麥克風' : 'Use a headset microphone'}</li>
              <li>🔊 {isZh ? '說話清楚，語速適中' : 'Speak clearly at moderate pace'}</li>
              <li>🔇 {isZh ? '找安靜的環境' : 'Find a quiet environment'}</li>
            </ul>
          </div>
          <button 
            onClick={onDismiss}
            className="ml-2 text-amber-600 hover:text-amber-800 text-lg p-1"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// CANDIDATE PROFILE BADGE
// ============================================
function CandidateProfileBadge({ session }: { session: SessionData }) {
  const isZh = session.spokenLanguage === 'zh-TW';
  
  if (!session.candidateRole) return null;

  const seniority = session.candidateSeniority || 'mid';
  const industry = session.candidateIndustry || 'tech';
  const seniorityLabel = SENIORITY_LABELS[seniority]?.[isZh ? 'zh' : 'en'] || seniority;
  const industryLabel = INDUSTRY_LABELS[industry]?.[isZh ? 'zh' : 'en'] || industry;

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 mt-4">
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-indigo-100">
        <span className="flex items-center">
          <span className="mr-1">💼</span>
          {session.candidateRole}
        </span>
        <span className="text-indigo-300">•</span>
        <span className="flex items-center">
          <span className="mr-1">📈</span>
          {seniorityLabel}
        </span>
        <span className="text-indigo-300">•</span>
        <span className="flex items-center">
          <span className="mr-1">🏢</span>
          {industryLabel}
        </span>
      </div>
    </div>
  );
}

// ============================================
// INTERVIEW CONTROLS
// ============================================
function InterviewControls({ 
  sessionId, 
  interviewType, 
  transcripts, 
  startTime,
  language,
  onEndInterview,
}: { 
  sessionId: string; 
  interviewType: string; 
  transcripts: Transcript[]; 
  startTime: number;
  language: string;
  onEndInterview: () => void;
}) {
  const router = useRouter();
  const room = useRoomContext();
  const [ending, setEnding] = useState(false);
  const isZh = language === 'zh-TW';

  const endInterview = async () => {
    const confirmMsg = isZh 
      ? '確定要結束面試嗎？' 
      : 'Are you sure you want to end the interview?';
    
    if (!confirm(confirmMsg)) {
      return;
    }

    setEnding(true);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    try {
      await fetch(`/api/interview/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      analytics.interviewCompleted(sessionId, interviewType, duration);

      // Stop recordings
      onEndInterview();

      room?.disconnect();
      router.push(`/evaluation/${sessionId}`);
    } catch (error) {
      console.error('Error ending interview:', error);
      setEnding(false);
    }
  };

  useEffect(() => {
    const container = document.getElementById('transcript-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3">
          <h3 className="text-white font-semibold flex items-center space-x-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span>{isZh ? '即時逐字稿' : 'Live Transcript'}</span>
          </h3>
        </div>
        
        <div 
          id="transcript-container"
          className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50"
        >
          {transcripts.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <p>{isZh ? '對話內容將顯示在這裡...' : 'Transcript will appear here as you speak...'}</p>
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
                    {transcript.speaker === 'user' ? (isZh ? '你' : 'You') : 'LyraAI'}
                  </p>
                  <p className="text-sm">{transcript.text}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <button
        onClick={endInterview}
        disabled={ending}
        className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
      >
        {ending 
          ? (isZh ? '結束中...' : 'Ending Interview...') 
          : (isZh ? '🏁 結束面試並取得回饋' : '🏁 End Interview & Get Feedback')
        }
      </button>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const roomName = params.roomName as string;

  const [token, setToken] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [interviewType, setInterviewType] = useState<string>('behavioral');
  const [spokenLanguage, setSpokenLanguage] = useState<string>('zh-TW');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const [showAudioHints, setShowAudioHints] = useState(true);
  
  const lastCountRef = useRef(0);
  const noChangeCountRef = useRef(0);

  // Browser recording (backup - user voice only)
  const { isRecording: isBrowserRecording, audioBlob, startRecording, stopRecording } = useAudioRecorder();
  
  // Server recording (NEW - full conversation via LiveKit Egress)
  const { isServerRecording, startServerRecording, stopServerRecording } = useServerRecording();

  const isZh = spokenLanguage === 'zh-TW';

  // Auto-dismiss audio hints after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowAudioHints(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    fetchRoomToken();
  }, [roomName]);

  // Start BOTH recordings when session loads
  useEffect(() => {
    if (sessionData && roomName) {
      // Start browser recording (backup)
      if (!isBrowserRecording) {
        startRecording();
      }
      // Start server recording (full conversation)
      startServerRecording(roomName, sessionData.id);
    }
  }, [sessionData, roomName]);

  // Upload browser recording when available (as backup)
  useEffect(() => {
    if (audioBlob && sessionId) {
      uploadBrowserRecording();
    }
  }, [audioBlob, sessionId]);

  // Upload browser recording (backup - only if server recording failed)
  const uploadBrowserRecording = async () => {
    if (!audioBlob || !sessionId) return;

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `interview-${sessionId}.webm`);
      formData.append('sessionId', sessionId);

      const response = await fetch('/api/interview/upload-recording', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log('✅ Browser recording uploaded (backup)');
      }
    } catch (error) {
      console.error('Error uploading browser recording:', error);
    }
  };

  // Handle end interview - stop both recordings
  const handleEndInterview = async () => {
    // Stop browser recording
    stopRecording();
    
    // Stop server recording
    if (sessionData) {
      await stopServerRecording(sessionData.id);
    }
  };

  useEffect(() => {
    if (!sessionId) return;

    const pollTranscripts = async () => {
      try {
        const response = await fetch(`/api/interview/${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.session?.transcripts) {
            const sortedTranscripts = data.session.transcripts
              .map((t: any) => ({
                speaker: t.speaker,
                text: t.text,
                timestamp: new Date(t.timestamp),
              }))
              .sort((a: Transcript, b: Transcript) => 
                a.timestamp.getTime() - b.timestamp.getTime()
              );
            
            if (sortedTranscripts.length === lastCountRef.current) {
              noChangeCountRef.current++;
            } else {
              noChangeCountRef.current = 0;
              lastCountRef.current = sortedTranscripts.length;
            }
            
            setTranscripts(sortedTranscripts);
          }
        }
      } catch (error) {
        console.error('Error fetching transcripts:', error);
      }
    };

    pollTranscripts();
    
    let currentInterval = 3000;
    let intervalId: NodeJS.Timeout;
    
    const scheduleNext = () => {
      if (noChangeCountRef.current >= 3) {
        currentInterval = 10000;
      } else {
        currentInterval = 3000;
      }
      
      intervalId = setTimeout(() => {
        pollTranscripts();
        scheduleNext();
      }, currentInterval);
    };
    
    scheduleNext();

    return () => {
      if (intervalId) clearTimeout(intervalId);
    };
  }, [sessionId]);

  const fetchRoomToken = async () => {
    try {
      const sessionResponse = await fetch(`/api/interview/by-room/${roomName}`);
      if (sessionResponse.ok) {
        const data = await sessionResponse.json();
        const session = data.session;
        setSessionId(session.id);
        setInterviewType(session.interviewType || 'behavioral');
        setSpokenLanguage(session.spokenLanguage || 'zh-TW');
        setSessionData({
          id: session.id,
          interviewType: session.interviewType,
          spokenLanguage: session.spokenLanguage,
          feedbackMode: session.feedbackMode,
          candidateRole: session.candidateRole,
          candidateSeniority: session.candidateSeniority,
          candidateIndustry: session.candidateIndustry,
          candidateYearsExperience: session.candidateYearsExperience,
        });
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
          <p className="text-gray-600">
            {isZh ? '連接面試房間中...' : 'Connecting to interview room...'}
          </p>
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
            {isZh ? '返回儀表板' : 'Return to Dashboard'}
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
                  <h1 className="text-xl font-bold text-gray-900">
                    {isZh ? typeInfo.nameCn : typeInfo.name}
                  </h1>
                  <p className="text-sm text-gray-500">Room: {roomName}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {/* Recording Indicator - shows server or browser */}
              <RecordingIndicator 
                isServerRecording={isServerRecording} 
                isBrowserRecording={isBrowserRecording}
                isZh={isZh} 
              />
              {/* Mode Badge */}
              <ModeBadge mode={sessionData?.feedbackMode} isZh={isZh} />
              {/* Language Badge */}
              <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                {spokenLanguage === 'zh-TW' ? '🇹🇼 中文' : '🇺🇸 English'}
              </div>
              {/* Live Badge */}
              <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
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
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {isZh ? '已連接面試' : 'Connected to Interview'}
                    </h2>
                    <p className="text-indigo-100">
                      {isZh 
                        ? 'AI面試官會先開始說話。請仔細聆聽並自然地回答。'
                        : 'The AI interviewer will speak first. Listen carefully and respond naturally.'
                      }
                    </p>
                  </div>
                  
                  {/* Candidate Profile Badge */}
                  {sessionData && <CandidateProfileBadge session={sessionData} />}
                  
                  {/* Practice Mode Hint */}
                  {sessionData?.feedbackMode === 'practice' && (
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
                      <p className="text-green-100 text-sm">
                        🎓 {isZh ? '練習模式：回答後會有即時提示' : 'Practice Mode: You\'ll get tips after each answer'}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-center space-x-3 py-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-full">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold">
                        {isZh ? '麥克風已開啟' : 'Microphone Active'}
                      </p>
                      <p className="text-indigo-100 text-sm">
                        {isZh ? '自然地說話 - AI正在聆聽' : 'Speak naturally - the AI is listening'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <InterviewControls 
                sessionId={sessionId} 
                interviewType={interviewType} 
                transcripts={transcripts} 
                startTime={startTime}
                language={spokenLanguage}
                onEndInterview={handleEndInterview}
              />
            </div>
          </div>
          <RoomAudioRenderer />
        </LiveKitRoom>
      </main>

      {/* STT Quality Hints */}
      <AudioQualityHints 
        language={spokenLanguage}
        isVisible={showAudioHints}
        onDismiss={() => setShowAudioHints(false)}
      />
    </div>
  );
}