'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

// ============================================
// TYPES
// ============================================

interface CompetencyEvaluation {
  competencyId: string;
  competencyName: string;
  level: number;
  score: number;
  evidence: string;
  matchedIndicators: string[];
  feedback: string;
}

interface Evaluation {
  id: string;
  sessionId: string;
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  actionItems?: string[];
  competencyEvaluations?: CompetencyEvaluation[];
  detailedFeedback: string;
  generatedAt: string;
}

interface SessionInfo {
  interviewType: string;
  spokenLanguage: string;
  feedbackMode?: 'practice' | 'real'; // NEW
  recordingUrl?: string; // NEW
  createdAt: string;
}

interface IncompleteStats {
  userTurns: number;
  totalUserWords: number;
  questionsAnswered: number;
}

// ============================================
// CONSTANTS
// ============================================

const LEVEL_LABELS: Record<string, string[]> = {
  zh: ['', '不足', '基本', '合格', '優秀', '卓越'],
  en: ['', 'Insufficient', 'Basic', 'Competent', 'Strong', 'Exceptional'],
};

const INTERVIEW_TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  behavioral: { zh: '行為面試', en: 'Behavioral Interview' },
  technical: { zh: '技術面試', en: 'Technical Interview' },
  'system-design': { zh: '系統設計面試', en: 'System Design Interview' },
  'case-study': { zh: '案例面試', en: 'Case Study Interview' },
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionId = params.sessionId as string;

  // State
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Incomplete interview state
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [incompleteStats, setIncompleteStats] = useState<IncompleteStats | null>(null);
  const [incompleteMessage, setIncompleteMessage] = useState<string>('');
  
  // Competency details toggle
  const [showCompetencyDetails, setShowCompetencyDetails] = useState(false);

  const lang = sessionInfo?.spokenLanguage || 'zh-TW';
  const isZh = lang === 'zh-TW';

  // ============================================
  // AUTH CHECK
  // ============================================
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // ============================================
  // FETCH DATA
  // ============================================
  
  useEffect(() => {
    if (sessionId && status === 'authenticated') {
      fetchEvaluation();
    }
  }, [sessionId, status]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/interview/${sessionId}`);
      const data = await response.json();

      if (data.session) {
        setSessionInfo({
          interviewType: data.session.interviewType,
          spokenLanguage: data.session.spokenLanguage || 'zh-TW',
          feedbackMode: data.session.feedbackMode, // NEW
          recordingUrl: data.session.recordingUrl, // NEW
          createdAt: data.session.createdAt,
        });
      }

      if (data.evaluation) {
        // Parse strengths/improvements if they're strings (legacy format)
        const evalData = data.evaluation;
        if (typeof evalData.strengths === 'string') {
          evalData.strengths = evalData.strengths.split('|||').filter(Boolean);
        }
        if (typeof evalData.improvements === 'string') {
          evalData.improvements = evalData.improvements.split('|||').filter(Boolean);
        }
        setEvaluation(evalData);
      }
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      setError('Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GENERATE EVALUATION
  // ============================================
  
  const generateEvaluation = async () => {
    try {
      setGenerating(true);
      setError(null);
      setIsIncomplete(false);

      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      // Handle incomplete interview response
      if (response.status === 400 && data.canEvaluate === false) {
        setIsIncomplete(true);
        setIncompleteStats(data.stats);
        setIncompleteMessage(data.message);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate evaluation');
      }

      setEvaluation(data.evaluation);
    } catch (err) {
      console.error('Error generating evaluation:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate evaluation');
    } finally {
      setGenerating(false);
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-500';
    if (score >= 6) return 'bg-yellow-500';
    if (score >= 4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreBgLight = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    if (score >= 4) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return isZh ? '優秀' : 'Excellent';
    if (score >= 6) return isZh ? '良好' : 'Good';
    if (score >= 4) return isZh ? '普通' : 'Fair';
    return isZh ? '需加強' : 'Needs Work';
  };

  const getLevelLabel = (level: number) => {
    return LEVEL_LABELS[isZh ? 'zh' : 'en'][level] || '';
  };

  const getLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-700 bg-green-100';
    if (level >= 3) return 'text-yellow-700 bg-yellow-100';
    if (level >= 2) return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  // ============================================
  // LOADING STATE
  // ============================================
  
  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {generating ? (isZh ? '正在分析面試表現...' : 'Analyzing interview...') : (isZh ? '載入中...' : 'Loading...')}
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // HEADER COMPONENT (reused across states)
  // ============================================
  
  const Header = () => (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {isZh ? '面試評估報告' : 'Interview Evaluation Report'}
              </h1>
              <p className="text-sm text-gray-500">
                {sessionInfo && INTERVIEW_TYPE_LABELS[sessionInfo.interviewType]?.[isZh ? 'zh' : 'en']}
                {sessionInfo?.feedbackMode && (
                  <span className="ml-2">
                    {sessionInfo.feedbackMode === 'practice' ? '🎓' : '💼'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            ← {isZh ? '返回' : 'Back'}
          </button>
        </div>
      </div>
    </header>
  );

  // ============================================
  // INCOMPLETE INTERVIEW STATE
  // ============================================
  
  if (isIncomplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Header />
        
        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            {/* Warning Icon */}
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⚠️</span>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isZh ? '面試未完成' : 'Interview Incomplete'}
            </h2>
            
            {/* Message */}
            <p className="text-gray-600 mb-6">
              {incompleteMessage}
            </p>
            
            {/* Stats */}
            {incompleteStats && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className={`text-3xl font-bold ${incompleteStats.userTurns >= 2 ? 'text-green-600' : 'text-red-600'}`}>
                      {incompleteStats.userTurns}
                    </div>
                    <div className="text-sm text-gray-500">{isZh ? '回答次數' : 'Responses'}</div>
                    <div className="text-xs text-gray-400">{isZh ? '需要 ≥ 2' : 'Need ≥ 2'}</div>
                  </div>
                  <div>
                    <div className={`text-3xl font-bold ${incompleteStats.totalUserWords >= 30 ? 'text-green-600' : 'text-red-600'}`}>
                      {incompleteStats.totalUserWords}
                    </div>
                    <div className="text-sm text-gray-500">{isZh ? '總字數' : 'Total Words'}</div>
                    <div className="text-xs text-gray-400">{isZh ? '需要 ≥ 30' : 'Need ≥ 30'}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">
                {isZh ? '如何獲得有效評估？' : 'How to get a valid evaluation?'}
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>✓ {isZh ? '完整回答至少 2 個問題' : 'Answer at least 2 questions completely'}</li>
                <li>✓ {isZh ? '每個回答約 1-2 分鐘' : 'Spend 1-2 minutes per answer'}</li>
                <li>✓ {isZh ? '使用 STAR 方法' : 'Use the STAR method'}</li>
              </ul>
            </div>
            
            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/start')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700"
              >
                🎤 {isZh ? '重新開始' : 'Try Again'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200"
              >
                {isZh ? '返回儀表板' : 'Dashboard'}
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* No evaluation yet - show generate button */}
        {!evaluation && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isZh ? '產生評估報告' : 'Generate Evaluation Report'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isZh 
                ? '點擊下方按鈕，AI 將分析你的面試表現並提供回饋。'
                : 'Click the button below to have AI analyze your interview and provide feedback.'}
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            <button
              onClick={generateEvaluation}
              disabled={generating}
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {generating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isZh ? '分析中...' : 'Analyzing...'}
                </span>
              ) : (
                isZh ? '產生報告' : 'Generate Report'
              )}
            </button>
          </div>
        )}

        {/* Evaluation Results */}
        {evaluation && (
          <div className="space-y-6">
            
            {/* Overall Score Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {isZh ? '整體評分' : 'Overall Score'}
                  </h2>
                  <p className={`text-sm font-medium ${getScoreColor(evaluation.overallScore)}`}>
                    {getScoreLabel(evaluation.overallScore)}
                  </p>
                </div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreBgColor(evaluation.overallScore)}`}>
                  <span className="text-3xl font-bold text-white">
                    {evaluation.overallScore}
                  </span>
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: isZh ? '清晰度' : 'Clarity', score: evaluation.clarityScore },
                  { label: isZh ? '結構性' : 'Structure', score: evaluation.structureScore },
                  { label: isZh ? '自信度' : 'Confidence', score: evaluation.confidenceScore },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(item.score)}`}>
                      {item.score}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.label}</div>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getScoreBgColor(item.score)}`}
                        style={{ width: `${item.score * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Competency Breakdown (Collapsible) */}
            {evaluation.competencyEvaluations && evaluation.competencyEvaluations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <span className="mr-2">📊</span>
                    {isZh ? '能力評估' : 'Competency Breakdown'}
                  </h3>
                  <button
                    onClick={() => setShowCompetencyDetails(!showCompetencyDetails)}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    {showCompetencyDetails ? (isZh ? '收起' : 'Collapse') : (isZh ? '展開詳情' : 'Show Details')}
                  </button>
                </div>
                
                {/* Compact Grid View */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {evaluation.competencyEvaluations.map((comp) => (
                    <div 
                      key={comp.competencyId}
                      className={`p-3 rounded-lg ${getScoreBgLight(comp.score)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {comp.competencyName}
                        </span>
                        <span className={`text-lg font-bold ${getScoreColor(comp.score)}`}>
                          {comp.score}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getLevelColor(comp.level)}`}>
                        L{comp.level} {getLevelLabel(comp.level)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Expanded Details */}
                {showCompetencyDetails && (
                  <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                    {evaluation.competencyEvaluations.map((comp) => (
                      <div key={comp.competencyId} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{comp.competencyName}</h4>
                          <span className={`text-lg font-bold ${getScoreColor(comp.score)}`}>
                            {comp.score}/10
                          </span>
                        </div>
                        
                        {comp.evidence && (
                          <blockquote className="text-sm text-gray-600 italic border-l-2 border-indigo-300 pl-3 mb-2">
                            "{comp.evidence}"
                          </blockquote>
                        )}
                        
                        {comp.feedback && (
                          <p className="text-sm text-gray-700">{comp.feedback}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Strengths & Improvements */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-2">✅</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isZh ? '主要優勢' : 'Key Strengths'}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {evaluation.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-green-500 mr-2 mt-0.5">•</span>
                      <span className="text-gray-700 text-sm">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-2">🎯</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isZh ? '改進建議' : 'Areas to Improve'}
                  </h3>
                </div>
                <ul className="space-y-3">
                  {evaluation.improvements.map((improvement, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-orange-500 mr-2 mt-0.5">•</span>
                      <span className="text-gray-700 text-sm">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Items */}
            {evaluation.actionItems && evaluation.actionItems.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-2">📋</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isZh ? '具體行動' : 'Action Items'}
                  </h3>
                </div>
                <ul className="space-y-2">
                  {evaluation.actionItems.map((item, idx) => (
                    <li key={idx} className="flex items-start bg-indigo-50 rounded-lg p-3">
                      <span className="text-indigo-600 font-bold mr-3">{idx + 1}.</span>
                      <span className="text-gray-700 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Feedback */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-2">💡</span>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isZh ? '總結回饋' : 'Summary Feedback'}
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {evaluation.detailedFeedback}
              </p>
            </div>

            {/* NEW: Recording Playback */}
            {sessionInfo?.recordingUrl && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <span className="text-2xl mr-2">🎧</span>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isZh ? '面試錄音' : 'Interview Recording'}
                  </h3>
                </div>
                
                {/* Audio Player */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <audio 
                    controls 
                    className="w-full"
                    src={sessionInfo.recordingUrl}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
                
                {/* Download Button */}
                <div className="mt-4 flex justify-end">
                  <a
                    href={sessionInfo.recordingUrl}
                    download={`interview-${sessionId}.webm`}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{isZh ? '下載錄音' : 'Download Recording'}</span>
                  </a>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/start')}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all"
              >
                {isZh ? '再練習一次' : 'Practice Again'}
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
              >
                {isZh ? '返回儀表板' : 'Back to Dashboard'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}