// app/api/interview/evaluate/route.ts
// SOTA-Level Rubric-Based Evaluation Pipeline

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions, conversationTurns, evaluationReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';
import { 
  BEHAVIORAL_RUBRICS, 
  formatRubricForPrompt, 
  getCompetenciesForInterviewType,
  getRubricById,
  getLevelByScore 
} from '@/lib/evaluation/competency-rubrics';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  // Layer 1: Minimum thresholds
  MIN_USER_TURNS: 2,
  MIN_USER_WORDS: 30,
  MIN_QUESTIONS_ANSWERED: 1,
  
  // Layer 2: Feature extraction
  MIN_WORDS_PER_ANSWER: 10,
};

// ============================================
// TYPES
// ============================================

interface TranscriptTurn {
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

interface Layer1Result {
  passed: boolean;
  reason?: string;
  stats: {
    userTurns: number;
    totalUserWords: number;
    questionsAnswered: number;
  };
}

interface CompetencyEvaluation {
  competencyId: string;
  competencyName: string;
  level: number;
  score: number;
  evidence: string;
  matchedIndicators: string[];
  feedback: string;
}

interface EvaluationResult {
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  competencyEvaluations: CompetencyEvaluation[];
  strengths: string[];
  improvements: string[];
  actionItems: string[];
  detailedFeedback: string;
}

// ============================================
// LAYER 1: RULE-BASED GATING
// ============================================

function layer1_RuleBasedGating(transcripts: TranscriptTurn[]): Layer1Result {
  const userTurns = transcripts.filter(t => t.role === 'user');
  
  const countWords = (text: string): number => {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text
      .replace(/[\u4e00-\u9fa5]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  };
  
  const totalUserWords = userTurns.reduce((sum, t) => sum + countWords(t.text), 0);
  const questionsAnswered = userTurns.filter(t => countWords(t.text) >= CONFIG.MIN_WORDS_PER_ANSWER).length;
  
  const stats = { userTurns: userTurns.length, totalUserWords, questionsAnswered };
  
  if (userTurns.length < CONFIG.MIN_USER_TURNS) {
    return { passed: false, reason: 'insufficient_turns', stats };
  }
  
  if (totalUserWords < CONFIG.MIN_USER_WORDS) {
    return { passed: false, reason: 'insufficient_words', stats };
  }
  
  if (questionsAnswered < CONFIG.MIN_QUESTIONS_ANSWERED) {
    return { passed: false, reason: 'no_questions_answered', stats };
  }
  
  return { passed: true, stats };
}

// ============================================
// LAYER 2: FEATURE EXTRACTION
// ============================================

interface ExtractedFeatures {
  totalAnswers: number;
  avgWordsPerAnswer: number;
  hasSTAR: boolean;
  avgSTARScore: number;
  hasMetrics: boolean;
  competenciesDetected: string[];
}

function layer2_FeatureExtraction(transcripts: TranscriptTurn[], language: string): ExtractedFeatures {
  const isZh = language === 'zh-TW';
  const userTurns = transcripts.filter(t => t.role === 'user');
  
  const countWords = (text: string): number => {
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = text.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(w => w.length > 0).length;
    return chineseChars + englishWords;
  };
  
  // STAR detection
  const detectSTAR = (text: string): number => {
    const patterns = isZh ? {
      situation: /當時|那時候|情況是|背景是|在.*的時候/,
      task: /目標是|任務是|需要.*完成|負責/,
      action: /我做了|我決定|我採取|我主動|我.*處理|我.*解決/,
      result: /結果|成效|最後|因此|達成|完成了|成功/,
    } : {
      situation: /at that time|the situation|when I|context was/i,
      task: /my goal|I needed to|my task|responsible for/i,
      action: /I decided|I took|I implemented|I created|I led/i,
      result: /as a result|outcome|achieved|successfully|led to/i,
    };
    
    let score = 0;
    if (patterns.situation.test(text)) score++;
    if (patterns.task.test(text)) score++;
    if (patterns.action.test(text)) score++;
    if (patterns.result.test(text)) score++;
    return score;
  };
  
  // Competency detection
  const detectCompetencies = (text: string): string[] => {
    const allText = text.toLowerCase();
    const detected: string[] = [];
    
    const patterns: Record<string, RegExp> = isZh ? {
      'leadership': /領導|帶領|主導|負責|主動/,
      'teamwork': /團隊|合作|協作|一起|同事/,
      'problem-solving': /解決|處理|克服|應對|分析/,
      'communication': /溝通|表達|說服|協調|報告/,
      'pressure': /壓力|deadline|緊急|趕|加班/,
      'conflict-resolution': /衝突|分歧|不同意見|協調|爭議/,
      'adaptability': /變化|調整|學習|適應|新/,
      'achievement': /成就|成功|達成|完成|目標/,
      'learning': /學習|成長|進步|改進|經驗/,
      'ownership': /負責|承擔|主動|追蹤|確保/,
    } : {
      'leadership': /lead|manage|direct|initiative|drove/i,
      'teamwork': /team|collaborat|together|colleague/i,
      'problem-solving': /solve|resolv|handl|analyz|debug/i,
      'communication': /communicat|present|explain|discuss/i,
      'pressure': /pressure|deadline|urgent|stress/i,
      'conflict-resolution': /conflict|disagree|mediat|resolv/i,
      'adaptability': /adapt|chang|learn|flexib|new/i,
      'achievement': /achiev|accomplish|succeed|complet|goal/i,
      'learning': /learn|grow|improv|develop|experienc/i,
      'ownership': /own|responsibl|accountabl|ensur/i,
    };
    
    for (const [competency, pattern] of Object.entries(patterns)) {
      if (pattern.test(allText)) detected.push(competency);
    }
    
    return detected;
  };
  
  const allUserText = userTurns.map(t => t.text).join(' ');
  const wordCounts = userTurns.map(t => countWords(t.text));
  const starScores = userTurns.map(t => detectSTAR(t.text));
  
  return {
    totalAnswers: userTurns.filter(t => countWords(t.text) >= CONFIG.MIN_WORDS_PER_ANSWER).length,
    avgWordsPerAnswer: wordCounts.length > 0 ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length : 0,
    hasSTAR: starScores.some(s => s >= 2),
    avgSTARScore: starScores.length > 0 ? starScores.reduce((a, b) => a + b, 0) / starScores.length : 0,
    hasMetrics: /\d+%|\d+人|\d+個|\$\d+|\d+ (percent|people|times)/i.test(allUserText),
    competenciesDetected: detectCompetencies(allUserText),
  };
}

// ============================================
// LAYER 3: RUBRIC-BASED LLM EVALUATION
// ============================================

async function layer3_RubricBasedEvaluation(
  transcripts: TranscriptTurn[],
  features: ExtractedFeatures,
  language: string,
  interviewType: string,
  candidateProfile: { role?: string; seniority?: string; industry?: string }
): Promise<EvaluationResult> {
  
  const isZh = language === 'zh-TW';
  
  // Get relevant competencies for this interview type
  const relevantCompetencies = getCompetenciesForInterviewType(interviewType);
  
  // Build rubrics section for prompt
  const rubricsText = relevantCompetencies
    .map(id => formatRubricForPrompt(id, isZh ? 'zh' : 'en'))
    .join('\n---\n\n');
  
  // Format transcript
  const formattedTranscript = transcripts
    .map(t => `${t.role === 'user' ? (isZh ? '求職者' : 'Candidate') : (isZh ? '面試官' : 'Interviewer')}: ${t.text}`)
    .join('\n\n');
  
  // Format features summary
  const featuresSummary = isZh ? `
【已提取特徵】
- 有效回答數: ${features.totalAnswers}
- 平均每答字數: ${Math.round(features.avgWordsPerAnswer)}
- STAR結構: ${features.hasSTAR ? '有使用' : '未明顯使用'} (平均 ${features.avgSTARScore.toFixed(1)}/4)
- 使用數據/指標: ${features.hasMetrics ? '是' : '否'}
- 偵測到的能力面向: ${features.competenciesDetected.join(', ') || '無明確偵測'}
` : `
【Extracted Features】
- Valid answers: ${features.totalAnswers}
- Avg words per answer: ${Math.round(features.avgWordsPerAnswer)}
- STAR structure: ${features.hasSTAR ? 'Used' : 'Not clearly used'} (avg ${features.avgSTARScore.toFixed(1)}/4)
- Uses metrics: ${features.hasMetrics ? 'Yes' : 'No'}
- Competencies detected: ${features.competenciesDetected.join(', ') || 'None clearly detected'}
`;

  const prompt = isZh ? `
你是一位專業的面試評估專家。請使用下方的【結構化能力評分標準】來評估這位求職者。

【重要規則 - 必須遵守】
1. 每個能力的評分必須嚴格對應到 Level 1-5 的標準
2. 必須引用求職者的原話作為證據
3. 如果找不到某能力的證據，該能力分數應為 1-2 (不足)
4. 不要憑空想像或推測求職者沒說過的內容
5. 整體評分是各能力評分的加權平均，不是獨立判斷

【求職者背景】
- 目標職位: ${candidateProfile.role || '未指定'}
- 經驗級別: ${candidateProfile.seniority || '未指定'}
- 目標產業: ${candidateProfile.industry || '未指定'}
- 面試類型: ${interviewType}

${featuresSummary}

【結構化能力評分標準】
以下是每個能力的 5 級評分標準。請將求職者的回答對應到適當的 Level。

${rubricsText}

【完整對話記錄】
${formattedTranscript}

請以以下JSON格式回覆（不要加任何其他文字）:
{
  "competencyEvaluations": [
    {
      "competencyId": "<能力ID>",
      "competencyName": "<能力名稱>",
      "level": <1-5的數字>,
      "score": <1-10的數字，基於level的scoreRange>,
      "evidence": "<直接引用求職者的原話，最多50字>",
      "matchedIndicators": ["<匹配到的正面指標1>", "<指標2>"],
      "feedback": "<針對此能力的一句話建議>"
    }
  ],
  "overallScore": <1-10，各能力分數的平均>,
  "clarityScore": <1-10，表達清晰度>,
  "structureScore": <1-10，回答結構性，是否使用STAR>,
  "confidenceScore": <1-10，展現的自信程度>,
  "strengths": ["<優勢1，基於最高分的能力>", "<優勢2>", "<優勢3>"],
  "improvements": ["<待改進1，基於最低分的能力>", "<待改進2>", "<待改進3>"],
  "actionItems": ["<具體行動1>", "<具體行動2>", "<具體行動3>"],
  "detailedFeedback": "<50字以內的總結>"
}

【評分對應表】
- Level 1 → 分數 1-2
- Level 2 → 分數 3-4
- Level 3 → 分數 5-6
- Level 4 → 分數 7-8
- Level 5 → 分數 9-10

請確保每個能力的 score 落在對應 level 的分數範圍內。
` : `
You are a professional interview evaluator. Use the 【Structured Competency Rubrics】 below to evaluate this candidate.

【CRITICAL RULES - MUST FOLLOW】
1. Each competency score MUST map strictly to Level 1-5 criteria
2. MUST quote candidate's actual words as evidence
3. If no evidence for a competency, score should be 1-2 (Insufficient)
4. Do NOT imagine or infer things the candidate didn't say
5. Overall score is weighted average of competency scores, not independent judgment

【CANDIDATE PROFILE】
- Target Role: ${candidateProfile.role || 'Not specified'}
- Experience Level: ${candidateProfile.seniority || 'Not specified'}
- Target Industry: ${candidateProfile.industry || 'Not specified'}
- Interview Type: ${interviewType}

${featuresSummary}

【STRUCTURED COMPETENCY RUBRICS】
Below are 5-level scoring criteria for each competency. Map candidate responses to appropriate Level.

${rubricsText}

【FULL TRANSCRIPT】
${formattedTranscript}

Reply in this JSON format only (no other text):
{
  "competencyEvaluations": [
    {
      "competencyId": "<competency ID>",
      "competencyName": "<competency name>",
      "level": <number 1-5>,
      "score": <number 1-10, based on level's scoreRange>,
      "evidence": "<direct quote from candidate, max 50 words>",
      "matchedIndicators": ["<matched positive indicator 1>", "<indicator 2>"],
      "feedback": "<one-sentence advice for this competency>"
    }
  ],
  "overallScore": <1-10, average of competency scores>,
  "clarityScore": <1-10, communication clarity>,
  "structureScore": <1-10, answer structure, STAR usage>,
  "confidenceScore": <1-10, demonstrated confidence>,
  "strengths": ["<strength 1, based on highest-scoring competency>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1, based on lowest-scoring competency>", "<improvement 2>", "<improvement 3>"],
  "actionItems": ["<specific action 1>", "<action 2>", "<action 3>"],
  "detailedFeedback": "<summary in 50 words or less>"
}

【SCORE MAPPING】
- Level 1 → Score 1-2
- Level 2 → Score 3-4
- Level 3 → Score 5-6
- Level 4 → Score 7-8
- Level 5 → Score 9-10

Ensure each competency score falls within its level's range.
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Lower for more consistent rubric-based scoring
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from LLM');

    const result = JSON.parse(content);
    
    // Validate and clamp scores
    const clampScore = (score: number) => Math.min(10, Math.max(1, Math.round(score)));
    
    return {
      overallScore: clampScore(result.overallScore),
      clarityScore: clampScore(result.clarityScore),
      structureScore: clampScore(result.structureScore),
      confidenceScore: clampScore(result.confidenceScore),
      competencyEvaluations: result.competencyEvaluations || [],
      strengths: result.strengths || [],
      improvements: result.improvements || [],
      actionItems: result.actionItems || [],
      detailedFeedback: result.detailedFeedback || '',
    };
  } catch (error) {
    console.error('Layer 3 evaluation error:', error);
    throw error;
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

export async function POST(req: NextRequest) {
  try {
    // Get sessionId from request body (matching your current API)
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Fetch session with all data
    const interviewSession = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
      with: { conversationTurns: true },
    });

    if (!interviewSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const language = interviewSession.spokenLanguage || 'zh-TW';
    const isZh = language === 'zh-TW';

    // Format transcripts
    const transcripts: TranscriptTurn[] = interviewSession.conversationTurns
      .map(t => ({
        role: t.role as 'user' | 'assistant',
        text: t.text,
        timestamp: new Date(t.timestamp),
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ============================================
    // LAYER 1: Rule-Based Gating
    // ============================================
    console.log('🔍 Layer 1: Rule-based gating...');
    
    const layer1Result = layer1_RuleBasedGating(transcripts);

    if (!layer1Result.passed) {
      console.log(`❌ Layer 1 FAILED: ${layer1Result.reason}`);
      
      const messages: Record<string, { zh: string; en: string }> = {
        insufficient_turns: {
          zh: '面試回答不足。請至少回答2個問題才能獲得評估。',
          en: 'Insufficient responses. Please answer at least 2 questions for evaluation.',
        },
        insufficient_words: {
          zh: '回答內容太少。請提供更詳細的回答才能獲得有效評估。',
          en: 'Responses too brief. Please provide more detailed answers for evaluation.',
        },
        no_questions_answered: {
          zh: '未回答任何面試問題。請完成面試後再查看評估。',
          en: 'No interview questions answered. Please complete the interview first.',
        },
      };

      const message = messages[layer1Result.reason || 'insufficient_turns'];

      return NextResponse.json({
        success: false,
        canEvaluate: false,
        reason: layer1Result.reason,
        message: isZh ? message.zh : message.en,
        stats: layer1Result.stats,
      }, { status: 400 });
    }

    console.log('✅ Layer 1 PASSED');

    // ============================================
    // LAYER 2: Feature Extraction
    // ============================================
    console.log('🔍 Layer 2: Feature extraction...');
    
    const features = layer2_FeatureExtraction(transcripts, language);
    
    console.log('✅ Layer 2 COMPLETE:', features);

    // ============================================
    // LAYER 3: Rubric-Based LLM Evaluation
    // ============================================
    console.log('🔍 Layer 3: Rubric-based LLM evaluation...');
    
    const evaluation = await layer3_RubricBasedEvaluation(
      transcripts,
      features,
      language,
      interviewSession.interviewType,
      {
        role: interviewSession.candidateRole || undefined,
        seniority: interviewSession.candidateSeniority || undefined,
        industry: interviewSession.candidateIndustry || undefined,
      }
    );

    console.log('✅ Layer 3 COMPLETE');

    // ============================================
    // Save to Database
    // ============================================
    const savedReport = await db.insert(evaluationReports).values({
      sessionId,
      overallScore: evaluation.overallScore,
      clarityScore: evaluation.clarityScore,
      structureScore: evaluation.structureScore,
      confidenceScore: evaluation.confidenceScore,
      strengths: evaluation.strengths,
      improvements: evaluation.improvements,
      detailedFeedback: evaluation.detailedFeedback,
      // Store competency evaluations in detailed feedback as JSON
      // You may want to add a separate column for this
    }).returning();

    // Update session status
    await db.update(interviewSessions)
      .set({ 
        status: 'evaluated',
        endedAt: new Date(),
      })
      .where(eq(interviewSessions.id, sessionId));

    console.log('💾 Evaluation saved to database');

    return NextResponse.json({
      success: true,
      canEvaluate: true,
      evaluation: {
        ...evaluation,
        id: savedReport[0].id,
      },
      features: {
        totalAnswers: features.totalAnswers,
        avgWordsPerAnswer: Math.round(features.avgWordsPerAnswer),
        avgSTARScore: features.avgSTARScore,
        competenciesDetected: features.competenciesDetected,
      },
    });

  } catch (error) {
    console.error('Evaluation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate evaluation' },
      { status: 500 }
    );
  }
}