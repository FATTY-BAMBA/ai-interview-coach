import asyncio
import logging
import os
import pathlib
import re
import uuid
import time
import json
from collections import deque
from contextlib import suppress
from typing import Optional, List, Set, Dict
from dataclasses import dataclass, field

import httpx
from dotenv import load_dotenv, find_dotenv

from livekit.agents import (
    AgentSession,
    Agent,
    JobContext,
    WorkerOptions,
    cli,
    ConversationItemAddedEvent,
)
from livekit.plugins import openai, silero


# ---------- ENV LOADING ----------
def _load_env():
    here = pathlib.Path(__file__).resolve()
    root = here.parent.parent
    tried = [root / ".env.local", root / ".env", pathlib.Path(find_dotenv(usecwd=True) or "")]
    loaded = False
    for p in tried:
        if p and p.exists():
            load_dotenv(p, override=False)
            logging.getLogger(__name__).info("Loaded env file: %s", p)
            loaded = True
    if not loaded:
        logging.getLogger(__name__).info("No local env files found.")


# ---------- CONFIG ----------
LISTEN_FIRST = os.getenv("LISTEN_FIRST", "false").lower() == "true"

LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
STT_MODEL = os.getenv("STT_MODEL", "gpt-4o-transcribe")

TTS_VOICE_EN = os.getenv("TTS_VOICE_EN", "alloy")
TTS_VOICE_ZH_TW = os.getenv("TTS_VOICE_ZH_TW", "nova")

MIN_TRANSCRIPT_CHARS = int(os.getenv("MIN_TRANSCRIPT_CHARS", "2"))
SESSION_LIFETIME_S = int(os.getenv("SESSION_LIFETIME_S", "3600"))

API_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
API_TOKEN = os.getenv("API_TOKEN")

# Interview settings
MIN_QUESTIONS = 4
MAX_QUESTIONS = 6
SILENCE_TIMEOUT_S = 30
MAX_SILENCE_RETRIES = 3


# ---------- INTERVIEW STATE MACHINE ----------
@dataclass
class InterviewState:
    """Track interview progress to prevent repetition and ensure completion"""
    session_id: str
    interview_type: str
    spoken_language: str
    
    # State tracking
    current_stage: str = "intro"  # intro -> questions -> wrap_up -> ended
    questions_asked: List[str] = field(default_factory=list)
    topics_covered: Set[str] = field(default_factory=set)
    question_count: int = 0
    
    # Quality tracking
    praise_count: int = 0
    last_activity_time: float = field(default_factory=time.time)
    silence_retries: int = 0
    user_responded: bool = False
    
    # Competencies to cover (behavioral)
    available_topics: List[str] = field(default_factory=lambda: [
        "teamwork", "conflict", "leadership", "pressure", 
        "failure", "achievement", "communication", "problem_solving",
        "time_management", "adaptability"
    ])
    
    def mark_topic_covered(self, topic: str):
        self.topics_covered.add(topic)
        if topic in self.available_topics:
            self.available_topics.remove(topic)
    
    def get_remaining_topics(self) -> List[str]:
        return [t for t in self.available_topics if t not in self.topics_covered]
    
    def should_wrap_up(self) -> bool:
        return self.question_count >= MIN_QUESTIONS
    
    def must_end(self) -> bool:
        return self.question_count >= MAX_QUESTIONS
    
    def to_context_string(self) -> str:
        """Generate context string to pass to LLM"""
        return f"""
【當前面試狀態】
- 階段: {self.current_stage}
- 已問問題數: {self.question_count}/{MIN_QUESTIONS}-{MAX_QUESTIONS}
- 已涵蓋主題: {', '.join(self.topics_covered) if self.topics_covered else '無'}
- 剩餘可用主題: {', '.join(self.get_remaining_topics()[:3])}
- 已問過的問題: {json.dumps(self.questions_asked[-3:], ensure_ascii=False) if self.questions_asked else '無'}

【重要提醒】
- 不要重複已問過的問題
- 選擇剩餘主題中的一個來提問
- 每次只問一個問題
"""


# ---------- FORBIDDEN PHRASES (Anti-praise) ----------
FORBIDDEN_PRAISE_ZH = [
    "太棒了", "非常棒", "太好了", "非常好", "完美", "太完美",
    "非常優秀", "太優秀", "太厲害", "非常厲害", "很棒", "真棒",
    "excellent", "perfect", "amazing", "wonderful", "fantastic",
    "太讚了", "非常讚", "超級棒", "超棒", "超厲害"
]

FORBIDDEN_PRAISE_EN = [
    "excellent", "perfect", "amazing", "wonderful", "fantastic",
    "brilliant", "outstanding", "exceptional", "superb", "incredible",
    "that's great", "that's perfect", "that's amazing"
]

ALLOWED_ACKNOWLEDGMENTS_ZH = [
    "好的", "嗯", "了解", "謝謝分享", "好", "我明白了"
]

ALLOWED_ACKNOWLEDGMENTS_EN = [
    "okay", "I see", "got it", "thanks for sharing", "understood"
]


# ---------- QUESTION TEMPLATES BY TOPIC ----------
QUESTION_TEMPLATES = {
    "behavioral": {
        "teamwork": {
            "zh-TW": [
                "請分享一個你與團隊合作完成困難任務的經驗。",
                "談談一次你在團隊中扮演重要角色的經歷。",
            ],
            "en-US": [
                "Share an experience where you collaborated with a team on a difficult task.",
                "Tell me about a time you played a key role in your team.",
            ]
        },
        "conflict": {
            "zh-TW": [
                "描述一次你與同事意見不合的情況，你如何處理？",
                "談談一次你需要處理團隊衝突的經驗。",
            ],
            "en-US": [
                "Describe a situation where you disagreed with a colleague. How did you handle it?",
                "Tell me about a time you had to resolve a team conflict.",
            ]
        },
        "leadership": {
            "zh-TW": [
                "分享一次你帶領團隊或專案的經驗。",
                "談談你如何影響或說服他人接受你的想法。",
            ],
            "en-US": [
                "Share an experience leading a team or project.",
                "Tell me how you influenced or persuaded others to accept your idea.",
            ]
        },
        "pressure": {
            "zh-TW": [
                "描述一次你在壓力下工作的經驗，你如何應對？",
                "談談一個deadline很緊的專案，你怎麼處理的？",
            ],
            "en-US": [
                "Describe a time you worked under pressure. How did you cope?",
                "Tell me about a project with a tight deadline. How did you handle it?",
            ]
        },
        "failure": {
            "zh-TW": [
                "分享一次工作上的失敗經驗，你從中學到什麼？",
                "談談一個沒有達到預期結果的專案。",
            ],
            "en-US": [
                "Share a work failure and what you learned from it.",
                "Tell me about a project that didn't meet expectations.",
            ]
        },
        "achievement": {
            "zh-TW": [
                "談談你最自豪的一個工作成就。",
                "分享一個你超越預期完成任務的經驗。",
            ],
            "en-US": [
                "Tell me about your proudest work achievement.",
                "Share an experience where you exceeded expectations.",
            ]
        },
        "problem_solving": {
            "zh-TW": [
                "描述一個你解決複雜問題的經驗。",
                "談談你如何處理一個看似無解的挑戰。",
            ],
            "en-US": [
                "Describe your experience solving a complex problem.",
                "Tell me how you handled a seemingly unsolvable challenge.",
            ]
        },
        "communication": {
            "zh-TW": [
                "分享一次你需要向非專業人士解釋複雜概念的經驗。",
                "談談你如何處理溝通不良的情況。",
            ],
            "en-US": [
                "Share a time you explained a complex concept to non-experts.",
                "Tell me how you handled a miscommunication situation.",
            ]
        },
    }
}

# STAR Follow-up templates
FOLLOWUP_TEMPLATES = {
    "zh-TW": [
        "當時的情境是什麼？可以更具體描述嗎？",
        "你具體做了什麼行動？",
        "結果如何？有沒有數字可以量化？",
        "如果重來一次，你會有什麼不同的做法？",
        "這個經驗對你後來的工作有什麼影響？",
        "你從這個經驗中學到什麼？",
    ],
    "en-US": [
        "What was the specific situation? Can you describe it more?",
        "What specific actions did you take?",
        "What was the result? Any numbers to quantify it?",
        "If you could do it again, what would you do differently?",
        "How did this experience affect your later work?",
        "What did you learn from this experience?",
    ]
}


# ---------- LANGUAGE-LOCKED INTERVIEWER PROMPT ----------
def get_interviewer_prompt(state: InterviewState) -> str:
    """Generate interviewer-only prompt (NO teaching, NO coaching)"""
    
    lang = state.spoken_language
    interview_type = state.interview_type
    
    if lang == "zh-TW":
        return f"""你是一位專業的面試官，正在進行{interview_type}面試。

🔒【語言規則 - 絕對不可違反】
- 全程只能使用繁體中文（台灣用語）
- 絕對不可以切換到英文或其他語言
- 如果求職者用英文問話，用中文回答：「讓我們繼續用中文進行面試。」
- 語言鎖定，無例外

🎭【你的角色 - 面試官，不是老師】
你是面試官，不是導師、教練或老師。
- ✅ 你的工作：提問、聆聽、追問
- ❌ 不是你的工作：教學、解釋理想答案、給建議

🚫【絕對禁止的行為】
1. 不要教求職者怎麼回答
2. 不要解釋「比較好的答案是...」
3. 不要給太多讚美（最多說「好的」「了解」）
4. 不要說「太棒了」「非常好」「完美」等誇張讚美
5. 不要一次問多個問題
6. 不要重複已經問過的問題
7. 不要長篇大論，保持簡短

📋【回應格式 - 必須遵守】
每次回應必須：
1. 簡短回應（最多1-2句，如「好的，了解。」）
2. 以一個新問題結尾

範例好的回應：
「了解。那請問你在那個專案中，具體負責哪些部分？」
「好的。可以分享一下當時的結果嗎？有沒有具體數字？」

範例不好的回應：
「太棒了！你的回答非常好！這種經驗很重要，因為...（長篇解釋）」

🗣️【說話風格】
- 用口語化的台灣國語
- 短句子，像真人對話
- 不要用書面語或文言文
- 像在咖啡廳面試一樣自然

⏰【面試流程】
1. 問 {MIN_QUESTIONS}-{MAX_QUESTIONS} 個主要問題
2. 每個問題可以追問 1-2 個follow-up
3. 不要提前結束
4. 時間到了才做總結

{state.to_context_string()}

記住：你是面試官，只負責提問。所有教學和建議都留到面試結束後的評估報告。
"""
    
    else:  # en-US
        return f"""You are a professional interviewer conducting a {interview_type} interview.

🔒【LANGUAGE RULES - ABSOLUTE】
- Speak ONLY in English throughout
- NEVER switch to another language
- If candidate speaks another language, respond: "Let's continue in English."
- Language is LOCKED, no exceptions

🎭【YOUR ROLE - Interviewer, NOT Teacher】
You are an interviewer, NOT a tutor, coach, or teacher.
- ✅ Your job: Ask questions, listen, probe deeper
- ❌ NOT your job: Teach, explain ideal answers, give advice

🚫【FORBIDDEN BEHAVIORS】
1. Do NOT teach how to answer
2. Do NOT explain "a better answer would be..."
3. Do NOT over-praise (max: "okay" "I see" "got it")
4. Do NOT say "excellent" "perfect" "amazing" etc.
5. Do NOT ask multiple questions at once
6. Do NOT repeat questions already asked
7. Do NOT give long responses, keep it brief

📋【RESPONSE FORMAT - REQUIRED】
Every response must:
1. Brief acknowledgment (1-2 sentences max, e.g., "Got it.")
2. End with ONE new question

Good example:
"I see. What specific actions did you take in that situation?"

Bad example:
"That's amazing! What a great experience! This is important because... (long explanation)"

🗣️【SPEAKING STYLE】
- Conversational, natural English
- Short sentences, like real conversation
- Not formal or academic
- Like interviewing at a coffee shop

⏰【INTERVIEW FLOW】
1. Ask {MIN_QUESTIONS}-{MAX_QUESTIONS} main questions
2. 1-2 follow-ups per question allowed
3. Do NOT end early
4. Only wrap up when time is up

{state.to_context_string()}

Remember: You are the interviewer. Only ask questions. All teaching and advice is for the evaluation report AFTER the interview.
"""


# ---------- WRAP-UP PROMPTS ----------
WRAP_UP_PROMPTS = {
    "zh-TW": """好的，我們的面試時間差不多了。感謝你今天的分享，你的回答讓我對你有更多了解。我們會在面試結束後提供詳細的評估報告給你。還有什麼問題想問我嗎？""",
    
    "en-US": """Alright, we're almost out of time. Thank you for sharing today - your answers helped me understand you better. We'll provide a detailed evaluation report after the interview. Do you have any questions for me?"""
}

FINAL_CLOSING = {
    "zh-TW": """好的，那今天的面試就到這裡。謝謝你的時間，祝你接下來一切順利！""",
    "en-US": """Okay, that concludes our interview today. Thank you for your time, and best of luck with everything!"""
}

# Never give up messages
SILENCE_PROMPTS = {
    "zh-TW": [
        "不好意思，我這邊好像沒有收到你的聲音，可以再說一次嗎？",
        "抱歉，剛剛可能有點技術問題。你可以再重複一次嗎？",
        "我聽不太清楚，可以請你靠近麥克風再說一次嗎？",
    ],
    "en-US": [
        "Sorry, I didn't catch that. Could you repeat it?",
        "Apologies, there might have been a technical issue. Could you say that again?",
        "I couldn't hear clearly. Could you move closer to the mic and repeat?",
    ]
}


# ---------- GREETINGS ----------
GREETINGS = {
    "behavioral": {
        "zh-TW": "嗨！我是今天的面試官。這是一場行為面試，我會問你一些關於過去工作經驗的問題。準備好的話，請先簡單自我介紹一下。",
        "en-US": "Hi! I'm your interviewer today. This is a behavioral interview where I'll ask about your past work experiences. When you're ready, please briefly introduce yourself.",
    },
    "technical": {
        "zh-TW": "嗨！我是今天的技術面試官。我會問一些程式和技術相關的問題。請先簡單介紹你的技術背景。",
        "en-US": "Hi! I'm your technical interviewer today. I'll ask some coding and technical questions. Please briefly introduce your technical background.",
    },
    "system-design": {
        "zh-TW": "嗨！我是今天的系統設計面試官。我們會討論一些架構設計的問題。請先分享一下你的系統設計經驗。",
        "en-US": "Hi! I'm your system design interviewer today. We'll discuss some architecture questions. Please share your system design experience.",
    },
    "case-study": {
        "zh-TW": "嗨！我是今天的案例面試官。我會提出一些商業問題讓你分析。請先簡單介紹你的分析經驗。",
        "en-US": "Hi! I'm your case study interviewer today. I'll present some business problems for analysis. Please briefly introduce your analytical experience.",
    },
}

MIC_TIPS = {
    "zh-TW": "我還沒收到麥克風的聲音，請確認瀏覽器已授權麥克風權限。",
    "en-US": "I'm not receiving microphone audio. Please check that your browser has microphone permissions enabled.",
}


# ---------- LOGGING ----------
def setup_logging():
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    log = logging.getLogger("agent")
    log.info("Starting LyraAI Interview Coach v2 | pid=%s", os.getpid())
    return log


# ---------- AGENT ----------
class InterviewCoach(Agent):
    def __init__(self, state: InterviewState):
        system_prompt = get_interviewer_prompt(state)
        super().__init__(instructions=system_prompt)
        self.state = state


# ---------- HELPERS ----------
def build_room_input_options() -> Optional[object]:
    try:
        from livekit.agents import RoomInputOptions
        with suppress(TypeError):
            return RoomInputOptions(audio=True, video=False, screen=False, close_on_disconnect=False)
        with suppress(TypeError):
            return RoomInputOptions(microphone=True, camera=False, screen=False, close_on_disconnect=False)
        return None
    except Exception:
        return None

def should_process(text: str) -> bool:
    return bool(text and len(text.strip()) >= MIN_TRANSCRIPT_CHARS)

def detect_topic_from_text(text: str) -> Optional[str]:
    """Detect which topic the conversation is about"""
    topic_keywords = {
        "teamwork": ["團隊", "合作", "team", "collaborate", "together"],
        "conflict": ["衝突", "意見不合", "爭執", "conflict", "disagree"],
        "leadership": ["領導", "帶領", "lead", "leadership", "manage"],
        "pressure": ["壓力", "deadline", "趕", "pressure", "stress"],
        "failure": ["失敗", "錯誤", "fail", "mistake", "wrong"],
        "achievement": ["成就", "成功", "自豪", "achieve", "proud", "success"],
        "problem_solving": ["解決", "問題", "solve", "problem", "challenge"],
        "communication": ["溝通", "表達", "communicate", "explain"],
    }
    
    text_lower = text.lower()
    for topic, keywords in topic_keywords.items():
        if any(kw in text_lower for kw in keywords):
            return topic
    return None

def count_praise_in_text(text: str, lang: str) -> int:
    """Count forbidden praise phrases in text"""
    forbidden = FORBIDDEN_PRAISE_ZH if lang == "zh-TW" else FORBIDDEN_PRAISE_EN
    count = 0
    text_lower = text.lower()
    for phrase in forbidden:
        if phrase.lower() in text_lower:
            count += 1
    return count


# ---------- TRANSCRIPT QUEUE ----------
_transcript_q = deque(maxlen=1000)

def enqueue_transcript(session_id: str, role: str, text: str):
    _transcript_q.append({"sessionId": session_id, "role": role, "text": text})
    logging.getLogger("agent").info(f"💬 Queued {role}: {text[:80]}")

async def _flush_transcripts():
    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            if _transcript_q:
                item = _transcript_q.popleft()
                for attempt in range(4):
                    try:
                        r = await client.post(
                            f"{API_URL}/api/interview/transcript",
                            json=item,
                            headers=({"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {}),
                        )
                        if r.status_code == 200:
                            logging.getLogger("agent").info(f"💾 Saved {item['role']}: {item['text'][:50]}")
                            break
                        elif r.status_code < 500:
                            break
                    except Exception as e:
                        logging.getLogger("agent").debug(f"Transcript save attempt {attempt + 1} failed: {e}")
                    await asyncio.sleep(0.3 * (2**attempt))
            else:
                await asyncio.sleep(0.05)


# ---------- FETCH SESSION BY ROOM NAME ----------
async def fetch_session_by_room(room_name: str) -> tuple[str, str, str]:
    """Fetch session ID, interview type, and spoken language from database"""
    log = logging.getLogger("agent")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{API_URL}/api/interview/by-room/{room_name}",
                headers=({"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {})
            )
            if r.status_code == 200:
                data = r.json()
                session = data.get("session", {})
                session_id = session.get("id")
                interview_type = session.get("interviewType", "behavioral")
                spoken_language = session.get("spokenLanguage", "zh-TW")
                log.info(f"✅ Found session: {session_id}, type: {interview_type}, language: {spoken_language}")
                return session_id, interview_type, spoken_language
            else:
                log.warning(f"Session lookup failed: {r.status_code}")
    except Exception as e:
        log.warning(f"Failed to fetch session by room: {e}")
    
    return str(uuid.uuid4()), "behavioral", "zh-TW"


# ---------- ENTRYPOINT ----------
async def entrypoint(ctx: JobContext):
    log = logging.getLogger("agent")

    room_name = ctx.room.name or ""
    
    # Fetch session info
    session_id, interview_type, spoken_language = await fetch_session_by_room(room_name)
    
    # Initialize interview state
    state = InterviewState(
        session_id=session_id,
        interview_type=interview_type,
        spoken_language=spoken_language,
    )
    
    log.info(f"🌐 Language locked to: {spoken_language}")
    log.info(f"📋 Interview type: {interview_type}")

    await ctx.connect(auto_subscribe="audio_only")
    log.info("✅ Connected to room: %s", room_name)

    # Configure STT/LLM/TTS
    stt = openai.STT(model=STT_MODEL)
    llm_instance = openai.LLM(model=LLM_MODEL)
    
    # Select TTS voice based on language
    if spoken_language == "zh-TW":
        tts = openai.TTS(voice=TTS_VOICE_ZH_TW)
        log.info(f"🔊 Using TTS voice: {TTS_VOICE_ZH_TW} (Chinese)")
    else:
        tts = openai.TTS(voice=TTS_VOICE_EN)
        log.info(f"🔊 Using TTS voice: {TTS_VOICE_EN} (English)")

    session = AgentSession(
        stt=stt,
        llm=llm_instance,
        tts=tts,
        vad=silero.VAD.load(),
    )

    with suppress(Exception):
        if hasattr(session, "set_barge_in"):
            session.set_barge_in(True)

    # Track for greeting tasks
    greeting_tasks = []

    # Subscribe to conversation items
    @session.on("conversation_item_added")
    def on_conversation_item(event: ConversationItemAddedEvent):
        """Capture both user and agent messages with state tracking"""
        try:
            role = event.item.role
            text = event.item.text_content
            
            if role == "user":
                state.user_responded = True
                state.last_activity_time = time.time()
                state.silence_retries = 0
                
                # Cancel pending greeting tasks
                for task in greeting_tasks:
                    if not task.done():
                        task.cancel()
                
                # Detect topic from user's response
                topic = detect_topic_from_text(text)
                if topic:
                    state.mark_topic_covered(topic)
                    log.info(f"📌 Topic detected and marked: {topic}")
            
            elif role == "assistant":
                # Track praise usage
                praise_count = count_praise_in_text(text, state.spoken_language)
                if praise_count > 0:
                    state.praise_count += praise_count
                    log.warning(f"⚠️ Praise detected ({praise_count}): {text[:50]}")
                
                # Track if this looks like a question (ends with ?)
                if "?" in text or "？" in text:
                    state.question_count += 1
                    state.questions_asked.append(text[:100])
                    log.info(f"❓ Question #{state.question_count} asked")
            
            if text and should_process(text):
                enqueue_transcript(session_id, role, text)
                log.info(f"{'👤' if role == 'user' else '🤖'} {role.capitalize()}: {text[:100]}")
                
        except Exception as e:
            log.error(f"Error in conversation_item handler: {e}")

    log.info("✅ Subscribed to conversation events")

    # Start transcript flushing
    asyncio.create_task(_flush_transcripts())

    rio = build_room_input_options()
    agent = InterviewCoach(state)
    
    if rio:
        await session.start(room=ctx.room, agent=agent, room_input_options=rio)
    else:
        await session.start(room=ctx.room, agent=agent)

    log.info(f"🎤 {interview_type.title()} interview started in {spoken_language}")

    # Send greeting
    async def send_greeting():
        await asyncio.sleep(2)
        
        greeting = GREETINGS[interview_type].get(spoken_language, GREETINGS[interview_type]["zh-TW"])
        
        with suppress(Exception):
            if hasattr(session, "say"):
                await session.say(greeting, allow_interruptions=True)
        log.info(f"🤖 Sent {interview_type} greeting in {spoken_language}")
        state.current_stage = "questions"
        
        # Wait for response
        await asyncio.sleep(10)
        
        # Mic tip if no response
        if not state.user_responded:
            mic_tip = MIC_TIPS.get(spoken_language, MIC_TIPS["zh-TW"])
            with suppress(Exception):
                if hasattr(session, "say"):
                    await session.say(mic_tip, allow_interruptions=True)
            log.info(f"🔔 Sent mic permission nudge")

    if not LISTEN_FIRST:
        task = asyncio.create_task(send_greeting())
        greeting_tasks.append(task)

    # ---------- NEVER GIVE UP WATCHDOG ----------
    async def watchdog():
        """Ensure interview never ends abruptly"""
        while True:
            await asyncio.sleep(10)
            
            current_time = time.time()
            silence_duration = current_time - state.last_activity_time
            
            # Check for prolonged silence
            if silence_duration > SILENCE_TIMEOUT_S and state.user_responded:
                if state.silence_retries < MAX_SILENCE_RETRIES:
                    state.silence_retries += 1
                    silence_msg = SILENCE_PROMPTS[spoken_language][state.silence_retries - 1]
                    with suppress(Exception):
                        if hasattr(session, "say"):
                            await session.say(silence_msg, allow_interruptions=True)
                    log.info(f"🔔 Silence prompt #{state.silence_retries}")
                    state.last_activity_time = current_time
            
            # Check if we should wrap up
            if state.should_wrap_up() and state.current_stage == "questions":
                state.current_stage = "wrap_up"
                wrap_up_msg = WRAP_UP_PROMPTS[spoken_language]
                with suppress(Exception):
                    if hasattr(session, "say"):
                        await session.say(wrap_up_msg, allow_interruptions=True)
                log.info("🏁 Starting wrap-up phase")

    asyncio.create_task(watchdog())

    # ---------- SESSION LIFETIME ----------
    try:
        await asyncio.sleep(SESSION_LIFETIME_S)
    except asyncio.CancelledError:
        pass

    # Always send final closing
    if state.current_stage != "ended":
        state.current_stage = "ended"
        final_msg = FINAL_CLOSING[spoken_language]
        with suppress(Exception):
            if hasattr(session, "say"):
                await session.say(final_msg, allow_interruptions=False)
        log.info("🏁 Sent final closing message")

    log.info(f"🏁 Interview ended | Questions: {state.question_count} | Praise count: {state.praise_count}")


if __name__ == "__main__":
    _load_env()
    setup_logging()
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="LyraAI",
        )
    )