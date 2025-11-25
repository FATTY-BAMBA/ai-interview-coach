'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { analytics } from '@/lib/analytics';
import { LANGUAGE_OPTIONS } from '@/lib/config/languages';
import type { SupportedLanguage } from '@/lib/types/language';
import { isValidLanguage } from '@/lib/types/language';

const INTERVIEW_TYPES = [
  {
    id: 'behavioral',
    name: 'Behavioral Interview',
    nameCn: '行為面試',
    description: 'Practice STAR-method answers for behavioral questions',
    descriptionCn: '練習使用STAR方法回答行為問題',
    icon: '🗣️',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'technical',
    name: 'Technical Interview',
    nameCn: '技術面試',
    description: 'Code and algorithm questions with real-time feedback',
    descriptionCn: '程式和演算法問題，即時回饋',
    icon: '💻',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'system-design',
    name: 'System Design',
    nameCn: '系統設計',
    description: 'Architecture discussions and scalability questions',
    descriptionCn: '架構討論和擴展性問題',
    icon: '🏗️',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'case-study',
    name: 'Case Study',
    nameCn: '案例分析',
    description: 'Business analysis and consulting-style interviews',
    descriptionCn: '商業分析和顧問式面試',
    icon: '📊',
    color: 'from-orange-500 to-orange-600',
  },
];

// NEW: Candidate Profile Options
const SENIORITY_LEVELS = [
  { value: 'junior', label: '初階', labelEn: 'Junior', years: '0-2年' },
  { value: 'mid', label: '中階', labelEn: 'Mid-level', years: '2-5年' },
  { value: 'senior', label: '資深', labelEn: 'Senior', years: '5-8年' },
  { value: 'lead', label: '主管', labelEn: 'Lead/Manager', years: '8+年' },
  { value: 'executive', label: '高管', labelEn: 'Executive', years: '10+年' },
];

const INDUSTRIES = [
  { value: 'tech', label: '科技業', labelEn: 'Technology', icon: '💻' },
  { value: 'finance', label: '金融業', labelEn: 'Finance', icon: '🏦' },
  { value: 'healthcare', label: '醫療業', labelEn: 'Healthcare', icon: '🏥' },
  { value: 'ecommerce', label: '電商業', labelEn: 'E-commerce', icon: '🛒' },
  { value: 'manufacturing', label: '製造業', labelEn: 'Manufacturing', icon: '🏭' },
  { value: 'consulting', label: '顧問業', labelEn: 'Consulting', icon: '📋' },
  { value: 'media', label: '媒體業', labelEn: 'Media', icon: '🎬' },
  { value: 'education', label: '教育業', labelEn: 'Education', icon: '🎓' },
  { value: 'other', label: '其他', labelEn: 'Other', icon: '📁' },
];

const COMMON_ROLES = [
  { value: 'software-engineer', label: '軟體工程師', labelEn: 'Software Engineer' },
  { value: 'frontend-engineer', label: '前端工程師', labelEn: 'Frontend Engineer' },
  { value: 'backend-engineer', label: '後端工程師', labelEn: 'Backend Engineer' },
  { value: 'fullstack-engineer', label: '全端工程師', labelEn: 'Fullstack Engineer' },
  { value: 'data-scientist', label: '資料科學家', labelEn: 'Data Scientist' },
  { value: 'product-manager', label: '產品經理', labelEn: 'Product Manager' },
  { value: 'project-manager', label: '專案經理', labelEn: 'Project Manager' },
  { value: 'engineering-manager', label: '工程經理', labelEn: 'Engineering Manager' },
  { value: 'ux-designer', label: 'UX設計師', labelEn: 'UX Designer' },
  { value: 'marketing-manager', label: '行銷經理', labelEn: 'Marketing Manager' },
  { value: 'sales-manager', label: '業務經理', labelEn: 'Sales Manager' },
  { value: 'business-analyst', label: '商業分析師', labelEn: 'Business Analyst' },
  { value: 'consultant', label: '顧問', labelEn: 'Consultant' },
  { value: 'other', label: '其他職位', labelEn: 'Other' },
];

const STORAGE_KEY = 'lyraai-preferred-language';

export default function StartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Step management: 1 = Language & Type, 2 = Candidate Profile
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Interview Settings
  const [creating, setCreating] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('zh-TW');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  
  // Step 2: Candidate Profile (NEW)
  const [candidateRole, setCandidateRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [seniority, setSeniority] = useState('mid');
  const [industry, setIndustry] = useState('tech');
  const [yearsExperience, setYearsExperience] = useState(3);

  const isZh = selectedLanguage === 'zh-TW';

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Load saved language preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && isValidLanguage(saved)) {
        setSelectedLanguage(saved);
      }
    } catch (error) {
      console.warn('Could not load language preference:', error);
    }
  }, []);

  // Save language preference when changed
  const handleLanguageChange = (language: SupportedLanguage) => {
    setSelectedLanguage(language);
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch (error) {
      console.warn('Could not save language preference:', error);
    }
  };

  // Handle interview type selection - go to step 2
  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setCurrentStep(2);
  };

  // Start interview with all profile data
  const startInterview = async () => {
    if (!selectedType) return;
    
    setCreating(selectedType);
    try {
      const finalRole = candidateRole === 'other' ? customRole : candidateRole;
      
      const response = await fetch('/api/interview/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          interviewType: selectedType,
          spokenLanguage: selectedLanguage,
          // NEW: Candidate Profile
          candidateRole: finalRole,
          candidateSeniority: seniority,
          candidateIndustry: industry,
          candidateYearsExperience: yearsExperience,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create interview session');
      }

      const data = await response.json();
      
      const sessionId = data.session.id;
      const roomName = data.session.roomName;
      
      analytics.interviewStarted(sessionId, selectedType);
      router.push(`/interview/${roomName}`);
    } catch (error) {
      console.error('Error creating interview:', error);
      alert(error instanceof Error ? error.message : 'Failed to start interview. Please try again.');
      setCreating(null);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/')}
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl font-bold">L</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  LyraAI
                </h1>
                <p className="text-sm text-gray-500">Your AI Interview Coach</p>
              </div>
            </button>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, <span className="font-semibold">{session.user?.name || session.user?.email}</span>
              </span>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                ← Dashboard
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>1</div>
              <span className="ml-2 font-medium">{isZh ? '面試設定' : 'Interview Settings'}</span>
            </div>
            <div className="w-16 h-1 bg-gray-200">
              <div className={`h-full transition-all duration-300 ${currentStep >= 2 ? 'bg-indigo-600 w-full' : 'w-0'}`}></div>
            </div>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>2</div>
              <span className="ml-2 font-medium">{isZh ? '個人背景' : 'Your Profile'}</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Language & Interview Type */}
        {currentStep === 1 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isZh ? '開始新的面試' : 'Start a New Interview'}
              </h2>
              <p className="text-gray-600">
                {isZh ? '選擇語言和面試類型開始練習' : 'Choose your language and interview type to begin practicing'}
              </p>
            </div>

            {/* Language Selector (Your existing component) */}
            <div className="mb-12 bg-white rounded-2xl shadow-lg p-8 border-2 border-indigo-100">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center">
                  <span className="mr-2">🌐</span>
                  Interview Language / 面試語言
                </h3>
                <p className="text-sm text-gray-600">
                  Select the language you'll speak during the interview
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {LANGUAGE_OPTIONS.map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageChange(language.code)}
                    className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedLanguage === language.code
                        ? 'border-indigo-600 bg-indigo-50 shadow-md ring-2 ring-indigo-200'
                        : 'border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-5xl">{language.flag}</div>
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          {language.nativeName}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {language.name}
                        </div>
                        <div className="text-xs text-gray-500 mb-3">
                          {language.description}
                        </div>
                        
                        {language.helperText && (
                          <div className="text-xs text-indigo-600 font-medium mb-2">
                            {language.helperText}
                          </div>
                        )}

                        {selectedLanguage === language.code && (
                          <div className="flex items-center text-indigo-600 font-semibold text-sm">
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Selected
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Language Lock Notice */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">
                      {isZh ? '面試語言將被鎖定' : 'Language will be locked during interview'}
                    </p>
                    <p className="text-blue-800">
                      {isZh 
                        ? 'AI面試官將全程使用所選語言進行面試，不會中途切換語言。這確保準確的語音辨識和專業的面試體驗。'
                        : 'The AI interviewer will conduct the entire session in your selected language and won\'t switch languages mid-conversation. This ensures accurate transcription and a professional interview experience.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interview Type Selection */}
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
                {isZh ? '選擇面試類型' : 'Choose Interview Type'}
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {INTERVIEW_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type.id)}
                    disabled={creating !== null}
                    className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 text-left border border-gray-100 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    <div className="text-4xl mb-3">{type.icon}</div>
                    <h4 className="text-lg font-bold text-gray-900 mb-1">
                      {isZh ? type.nameCn : type.name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-4">
                      {isZh ? type.descriptionCn : type.description}
                    </p>
                    <div className={`w-full bg-gradient-to-r ${type.color} text-white px-4 py-2 rounded-lg text-center text-sm font-semibold`}>
                      {isZh ? '選擇' : 'Select'} →
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* STEP 2: Candidate Profile (NEW) */}
        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isZh ? '告訴我們你的背景' : 'Tell Us About Yourself'}
              </h2>
              <p className="text-gray-600">
                {isZh ? '這有助於AI為你量身打造面試問題' : 'This helps the AI tailor interview questions for you'}
              </p>
            </div>

            {/* Role Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                💼 {isZh ? '目標職位' : 'Target Role'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {COMMON_ROLES.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => setCandidateRole(role.value)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                      candidateRole === role.value
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                        : 'border-gray-200 hover:border-indigo-300 text-gray-900 hover:text-indigo-700'
                    }`}
                  >
                    {isZh ? role.label : role.labelEn}
                  </button>
                ))}
              </div>
              
              {/* Custom Role Input */}
              {candidateRole === 'other' && (
                <div className="mt-4">
                  <input
                    type="text"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder={isZh ? '請輸入職位名稱...' : 'Enter role name...'}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                </div>
              )}
            </div>

            {/* Industry Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                🏢 {isZh ? '目標產業' : 'Target Industry'}
              </h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() => setIndustry(ind.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                      industry === ind.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{ind.icon}</span>
                    <span className={`text-sm font-medium ${
                      industry === ind.value ? 'text-indigo-900' : 'text-gray-700'
                    }`}>
                      {isZh ? ind.label : ind.labelEn}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Seniority Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                📈 {isZh ? '經驗級別' : 'Experience Level'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {SENIORITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => {
                      setSeniority(level.value);
                      // Auto-set years based on seniority
                      const yearMap: Record<string, number> = {
                        junior: 1, mid: 3, senior: 6, lead: 9, executive: 12
                      };
                      setYearsExperience(yearMap[level.value] || 3);
                    }}
                    className={`p-4 rounded-lg border-2 text-center transition-all duration-200 ${
                      seniority === level.value
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <span className={`font-semibold block ${
                      seniority === level.value ? 'text-indigo-900' : 'text-gray-900'
                    }`}>
                      {isZh ? level.label : level.labelEn}
                    </span>
                    <span className="text-xs text-gray-500">{level.years}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Years of Experience */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                ⏱️ {isZh ? '工作年資' : 'Years of Experience'}: 
                <span className="ml-2 text-indigo-600">{yearsExperience} {isZh ? '年' : 'years'}</span>
              </h3>
              <input
                type="range"
                min="0"
                max="20"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>0</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20+</span>
              </div>
            </div>

            {/* Selected Interview Type Summary */}
            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-3xl">
                    {INTERVIEW_TYPES.find(t => t.id === selectedType)?.icon}
                  </span>
                  <div>
                    <p className="text-sm text-indigo-600 font-medium">
                      {isZh ? '已選擇的面試類型' : 'Selected Interview Type'}
                    </p>
                    <p className="font-bold text-gray-900">
                      {isZh 
                        ? INTERVIEW_TYPES.find(t => t.id === selectedType)?.nameCn
                        : INTERVIEW_TYPES.find(t => t.id === selectedType)?.name
                      }
                    </p>
                  </div>
                </div>
                <div className="text-2xl">
                  {LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage)?.flag}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← {isZh ? '上一步' : 'Back'}
              </button>
              <button
                onClick={startInterview}
                disabled={creating !== null || (!candidateRole || (candidateRole === 'other' && !customRole))}
                className={`px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                  creating !== null || (!candidateRole || (candidateRole === 'other' && !customRole))
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700'
                }`}
              >
                {creating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isZh ? '準備中...' : 'Starting...'}
                  </span>
                ) : (
                  <>🎤 {isZh ? '開始面試' : 'Start Interview'}</>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}