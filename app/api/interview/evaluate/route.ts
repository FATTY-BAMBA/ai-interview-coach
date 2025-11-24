import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { interviewSessions, conversationTurns, evaluationReports } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ---------- RUBRIC DEFINITIONS ----------
const SCORING_RUBRICS = {
  clarity: {
    1: "無法清楚表達想法 / Cannot express ideas clearly",
    2: "表達斷斷續續，需要多次澄清 / Fragmented expression, needs clarification",
    3: "可以理解但不夠流暢 / Understandable but not fluent",
    4: "表達清楚，邏輯通順 / Clear expression, logical flow",
    5: "非常清晰，結構完整，易於理解 / Very clear, well-structured, easy to follow",
  },
  structure: {
    1: "沒有結構，回答雜亂 / No structure, disorganized",
    2: "有嘗試結構但不完整 / Attempted structure but incomplete",
    3: "基本STAR結構，但缺少某些要素 / Basic STAR but missing elements",
    4: "完整STAR結構，有具體例子 / Complete STAR with specific examples",
    5: "優秀STAR結構，有量化成果 / Excellent STAR with quantified results",
  },
  confidence: {
    1: "非常緊張，無法正常表達 / Very nervous, cannot express normally",
    2: "明顯緊張，影響表達 / Noticeably nervous, affects expression",
    3: "有些緊張但可以完成回答 / Some nervousness but can complete answers",
    4: "表現自信，態度專業 / Confident, professional attitude",
    5: "非常自信，展現領導力 / Very confident, shows leadership",
  },
  relevance: {
    1: "答非所問 / Completely off-topic",
    2: "部分相關但偏離主題 / Partially relevant but drifts",
    3: "大致切題但不夠深入 / Generally on-topic but not deep",
    4: "切題且有深度 / On-topic with depth",
    5: "精準回答，展現洞察力 / Precise answer, shows insight",
  },
};

// ---------- PASS 1: RAW ANALYSIS ----------
async function generateRawAnalysis(
  transcript: string,
  interviewType: string,
  spokenLanguage: string
): Promise<{
  questionAnalysis: Array<{
    question: string;
    answer: string;
    clarity: number;
    structure: number;
    relevance: number;
    notes: string;
  }>;
  overallNotes: string;
}> {
  const isChineseInterview = spokenLanguage === 'zh-TW';
  
  const prompt = isChineseInterview 
    ? `你是面試評估專家。分析以下${interviewType}面試逐字稿。

【評分標準】
清晰度 (1-5): ${JSON.stringify(SCORING_RUBRICS.clarity, null, 2)}
結構性 (1-5): ${JSON.stringify(SCORING_RUBRICS.structure, null, 2)}
相關性 (1-5): ${JSON.stringify(SCORING_RUBRICS.relevance, null, 2)}

【逐字稿】
${transcript}

【任務】
1. 找出每個問答對
2. 針對每個回答評分 (1-5)
3. 記錄具體觀察

回傳JSON格式：
{
  "questionAnalysis": [
    {
      "question": "面試官問的問題",
      "answer": "求職者的回答摘要（最多50字）",
      "clarity": 1-5,
      "structure": 1-5,
      "relevance": 1-5,
      "notes": "具體觀察（優點或可改進處）"
    }
  ],
  "overallNotes": "整體觀察（2-3句話）"
}

只回傳JSON，不要其他文字。`
    : `You are an interview evaluation expert. Analyze this ${interviewType} interview transcript.

【SCORING RUBRICS】
Clarity (1-5): ${JSON.stringify(SCORING_RUBRICS.clarity, null, 2)}
Structure (1-5): ${JSON.stringify(SCORING_RUBRICS.structure, null, 2)}
Relevance (1-5): ${JSON.stringify(SCORING_RUBRICS.relevance, null, 2)}

【TRANSCRIPT】
${transcript}

【TASK】
1. Identify each Q&A pair
2. Score each answer (1-5)
3. Note specific observations

Return JSON format:
{
  "questionAnalysis": [
    {
      "question": "The interviewer's question",
      "answer": "Summary of candidate's answer (max 50 words)",
      "clarity": 1-5,
      "structure": 1-5,
      "relevance": 1-5,
      "notes": "Specific observation (strength or improvement)"
    }
  ],
  "overallNotes": "Overall observations (2-3 sentences)"
}

Return ONLY JSON, no other text.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert interview evaluator. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}

// ---------- PASS 2: USER-FACING REPORT ----------
async function generateUserReport(
  rawAnalysis: {
    questionAnalysis: Array<{
      question: string;
      answer: string;
      clarity: number;
      structure: number;
      relevance: number;
      notes: string;
    }>;
    overallNotes: string;
  },
  interviewType: string,
  spokenLanguage: string
): Promise<{
  overallScore: number;
  clarityScore: number;
  structureScore: number;
  confidenceScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: string;
}> {
  const isChineseInterview = spokenLanguage === 'zh-TW';
  
  // Calculate average scores from raw analysis
  const avgClarity = rawAnalysis.questionAnalysis.reduce((sum, q) => sum + q.clarity, 0) / rawAnalysis.questionAnalysis.length || 3;
  const avgStructure = rawAnalysis.questionAnalysis.reduce((sum, q) => sum + q.structure, 0) / rawAnalysis.questionAnalysis.length || 3;
  const avgRelevance = rawAnalysis.questionAnalysis.reduce((sum, q) => sum + q.relevance, 0) / rawAnalysis.questionAnalysis.length || 3;
  
  const prompt = isChineseInterview
    ? `根據以下面試分析，產生簡潔的評估報告。

【原始分析】
${JSON.stringify(rawAnalysis, null, 2)}

【計算出的平均分數】
- 清晰度: ${avgClarity.toFixed(1)}/5
- 結構性: ${avgStructure.toFixed(1)}/5
- 相關性: ${avgRelevance.toFixed(1)}/5

【報告格式要求 - 必須遵守】

1. 優勢 (strengths): 最多3點
   - 每點不超過20字
   - 格式：「具體行為 → 為何是優勢」
   - 例：「回答有具體數字 → 增加說服力」

2. 待改進 (improvements): 最多3點
   - 每點不超過25字
   - 格式：「問題 → 建議做法」
   - 例：「缺少量化成果 → 下次加入具體數字」

3. 詳細回饋 (detailedFeedback): 
   - 最多100字
   - 用口語化台灣國語
   - 不要用「您」，用「你」
   - 1個整體評價 + 1個最重要的改進建議

4. 分數轉換 (1-5 → 0-10):
   - overallScore: 綜合表現 (0-10)
   - clarityScore: 清晰度 (0-10)
   - structureScore: 結構性 (0-10)
   - confidenceScore: 自信度 (0-10)

【絕對禁止】
- 不要超過字數限制
- 不要用文言文或書面語
- 不要寫長段落
- 不要過度讚美

回傳JSON：
{
  "overallScore": 0-10,
  "clarityScore": 0-10,
  "structureScore": 0-10,
  "confidenceScore": 0-10,
  "strengths": ["優勢1", "優勢2", "優勢3"],
  "improvements": ["改進1", "改進2", "改進3"],
  "detailedFeedback": "簡短回饋（最多100字）"
}

只回傳JSON。`
    : `Based on this interview analysis, generate a concise evaluation report.

【RAW ANALYSIS】
${JSON.stringify(rawAnalysis, null, 2)}

【CALCULATED AVERAGE SCORES】
- Clarity: ${avgClarity.toFixed(1)}/5
- Structure: ${avgStructure.toFixed(1)}/5
- Relevance: ${avgRelevance.toFixed(1)}/5

【REPORT FORMAT REQUIREMENTS - MUST FOLLOW】

1. Strengths: Max 3 points
   - Each point max 15 words
   - Format: "Specific behavior → Why it's a strength"
   - Example: "Used specific numbers → Adds credibility"

2. Improvements: Max 3 points
   - Each point max 20 words
   - Format: "Issue → Suggested action"
   - Example: "Lacked metrics → Add specific numbers next time"

3. Detailed Feedback:
   - Max 80 words
   - Conversational tone
   - 1 overall assessment + 1 key improvement

4. Score Conversion (1-5 → 0-10):
   - overallScore: Overall performance (0-10)
   - clarityScore: Clarity (0-10)
   - structureScore: Structure (0-10)
   - confidenceScore: Confidence (0-10)

【FORBIDDEN】
- Do NOT exceed word limits
- Do NOT use formal/academic language
- Do NOT write long paragraphs
- Do NOT over-praise

Return JSON:
{
  "overallScore": 0-10,
  "clarityScore": 0-10,
  "structureScore": 0-10,
  "confidenceScore": 0-10,
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "detailedFeedback": "Brief feedback (max 80 words)"
}

Return ONLY JSON.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are an expert interview coach. Generate concise, actionable feedback. Return only valid JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0].message.content || '{}';
  return JSON.parse(content);
}

// ---------- MAIN API HANDLER ----------
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get session info
    const session = await db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, sessionId),
    });

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get conversation transcript
    const turns = await db.query.conversationTurns.findMany({
      where: eq(conversationTurns.sessionId, sessionId),
      orderBy: (turns, { asc }) => [asc(turns.timestamp)],
    });

    if (turns.length === 0) {
      return NextResponse.json(
        { error: 'No conversation found for this session' },
        { status: 400 }
      );
    }

    // Format transcript
    const formattedTranscript = turns
      .map(turn => `${turn.role === 'user' ? '求職者/Candidate' : '面試官/Interviewer'}: ${turn.text}`)
      .join('\n\n');

    const spokenLanguage = session.spokenLanguage || 'zh-TW';
    const interviewType = session.interviewType || 'behavioral';

    console.log(`📊 Starting two-pass evaluation for session ${sessionId}`);
    console.log(`   Language: ${spokenLanguage}, Type: ${interviewType}`);
    console.log(`   Transcript turns: ${turns.length}`);

    // ---------- PASS 1: Raw Analysis ----------
    console.log('📝 Pass 1: Generating raw analysis...');
    const rawAnalysis = await generateRawAnalysis(
      formattedTranscript,
      interviewType,
      spokenLanguage
    );
    console.log(`   Analyzed ${rawAnalysis.questionAnalysis?.length || 0} Q&A pairs`);

    // ---------- PASS 2: User Report ----------
    console.log('📋 Pass 2: Generating user-facing report...');
    const userReport = await generateUserReport(
      rawAnalysis,
      interviewType,
      spokenLanguage
    );
    console.log(`   Overall score: ${userReport.overallScore}/10`);

    // ---------- Save to Database ----------
    // Check if evaluation already exists
    const existingEval = await db.query.evaluationReports.findFirst({
      where: eq(evaluationReports.sessionId, sessionId),
    });

    let savedEvaluation;
    
    if (existingEval) {
      // Update existing
      const [updated] = await db
        .update(evaluationReports)
        .set({
          overallScore: userReport.overallScore,
          clarityScore: userReport.clarityScore,
          structureScore: userReport.structureScore,
          confidenceScore: userReport.confidenceScore,
          strengths: userReport.strengths.join('|||'), // Store as delimited string
          improvements: userReport.improvements.join('|||'),
          detailedFeedback: userReport.detailedFeedback,
          generatedAt: new Date(),
        })
        .where(eq(evaluationReports.id, existingEval.id))
        .returning();
      savedEvaluation = updated;
    } else {
      // Insert new
      const [inserted] = await db
        .insert(evaluationReports)
        .values({
          sessionId: sessionId,
          overallScore: userReport.overallScore,
          clarityScore: userReport.clarityScore,
          structureScore: userReport.structureScore,
          confidenceScore: userReport.confidenceScore,
          strengths: userReport.strengths.join('|||'),
          improvements: userReport.improvements.join('|||'),
          detailedFeedback: userReport.detailedFeedback,
          generatedAt: new Date(),
        })
        .returning();
      savedEvaluation = inserted;
    }

    console.log(`✅ Evaluation saved for session ${sessionId}`);

    // Return formatted response
    return NextResponse.json({
      success: true,
      evaluation: {
        id: savedEvaluation.id,
        sessionId: savedEvaluation.sessionId,
        overallScore: savedEvaluation.overallScore,
        clarityScore: savedEvaluation.clarityScore,
        structureScore: savedEvaluation.structureScore,
        confidenceScore: savedEvaluation.confidenceScore,
        strengths: userReport.strengths,
        improvements: userReport.improvements,
        detailedFeedback: savedEvaluation.detailedFeedback,
        generatedAt: savedEvaluation.generatedAt,
      },
      rawAnalysis: rawAnalysis, // Include for debugging/detailed view
    });

  } catch (error) {
    console.error('Error generating evaluation:', error);
    return NextResponse.json(
      { error: 'Failed to generate evaluation' },
      { status: 500 }
    );
  }
}