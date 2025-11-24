'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface Evaluation {
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

interface SessionInfo {
  interviewType: string;
  spokenLanguage: string;
  createdAt: string;
}

export default function EvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const sessionId = params.sessionId as string;

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch evaluation on mount
  useEffect(() => {
    if (sessionId) {
      fetchEvaluation();
    }
  }, [sessionId]);

  const fetchEvaluation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/interview/${sessionId}`);
      const data = await response.json();

      if (data.session) {
        setSessionInfo({
          interviewType: data.session.interviewType,
          spokenLanguage: data.session.spokenLanguage || 'zh-TW',
          createdAt: data.session.createdAt,
        });
      }

      if (data.evaluation) {
        // Parse strengths/improvements if they're strings
        const eval_data = data.evaluation;
        if (typeof eval_data.strengths === 'string') {
          eval_data.strengths = eval_data.strengths.split('|||').filter(Boolean);
        }
        if (typeof eval_data.improvements === 'string') {
          eval_data.improvements = eval_data.improvements.split('|||').filter(Boolean);
        }
        setEvaluation(eval_data);
      }
    } catch (err) {
      console.error('Error fetching evaluation:', err);
      setError('Failed to load evaluation');
    } finally {
      setLoading(false);
    }
  };

  const generateEvaluation = async () => {
    try {
      setGenerating(true);
      setError(null);

      const response = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

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

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    if (score >= 4) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 8) return 'bg-green-100';
    if (score >= 6) return 'bg-yellow-100';
    if (score >= 4) return 'bg-orange-100';
    return 'bg-red-100';
  };

  const getScoreLabel = (score: number, lang: string) => {
    const labels = {
      'zh-TW': {
        excellent: '優秀',
        good: '良好',
        fair: '普通',
        needsWork: '需加強',
      },
      'en-US': {
        excellent: 'Excellent',
        good: 'Good',
        fair: 'Fair',
        needsWork: 'Needs Work',
      },
    };
    const l = labels[lang as keyof typeof labels] || labels['zh-TW'];
    
    if (score >= 8) return l.excellent;
    if (score >= 6) return l.good;
    if (score >= 4) return l.fair;
    return l.needsWork;
  };

  const interviewTypeLabels: Record<string, { zh: string; en: string }> = {
    behavioral: { zh: '行為面試', en: 'Behavioral Interview' },
    technical: { zh: '技術面試', en: 'Technical Interview' },
    'system-design': { zh: '系統設計面試', en: 'System Design Interview' },
    'case-study': { zh: '案例面試', en: 'Case Study Interview' },
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading evaluation...</p>
        </div>
      </div>
    );
  }

  const lang = sessionInfo?.spokenLanguage || 'zh-TW';
  const isZh = lang === 'zh-TW';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
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
                  {sessionInfo && interviewTypeLabels[sessionInfo.interviewType]?.[isZh ? 'zh' : 'en']}
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
                    {getScoreLabel(evaluation.overallScore, lang)}
                  </p>
                </div>
                <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getScoreBgColor(evaluation.overallScore)}`}>
                  <span className={`text-3xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
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
                        className={`h-full rounded-full ${
                          item.score >= 8 ? 'bg-green-500' :
                          item.score >= 6 ? 'bg-yellow-500' :
                          item.score >= 4 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.score * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements - Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
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

              {/* Improvements */}
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