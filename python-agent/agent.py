import asyncio
import logging
import os
import pathlib
import re
import uuid
import time
from collections import deque
from contextlib import suppress
from typing import Optional

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

LANG_MODE = os.getenv("LANG_MODE", "auto")
MIN_TRANSCRIPT_CHARS = int(os.getenv("MIN_TRANSCRIPT_CHARS", "2"))

SESSION_LIFETIME_S = int(os.getenv("SESSION_LIFETIME_S", "3600"))

API_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
API_TOKEN = os.getenv("API_TOKEN")

SILENCE_MAX_WAIT_S = float(os.getenv("SILENCE_MAX_WAIT_S", "10"))

# ---------- INTERVIEW TYPE PROMPTS ----------
PROMPTS = {
    "behavioral": """
You are an experienced interview coach conducting a behavioral interview.

Language Rules:
- If the user speaks Chinese, reply in Traditional Chinese (繁體中文) with Taiwan wording.
- If the user speaks English, reply in natural professional English.
- Automatically switch languages to match the user.

Interview Guidelines:
- Ask thoughtful STAR-method questions (Situation, Task, Action, Result)
- Focus on past experiences and how the candidate handled situations
- Listen actively and ask 1-2 relevant follow-up questions per answer
- Be encouraging, supportive, and concise
- After 3-4 main questions, thank the candidate and conclude
- Keep responses conversational and natural

Example Questions:
- "Tell me about a time when you faced a challenging deadline"
- "Describe a situation where you had to work with a difficult team member"
- "Give me an example of when you showed leadership"

Start with a warm greeting and ask the candidate to introduce themselves.
""",
    
    "technical": """
You are a senior software engineer conducting a technical interview.

Language Rules:
- If the user speaks Chinese, reply in Traditional Chinese (繁體中文) with Taiwan wording.
- If the user speaks English, reply in natural professional English.
- Automatically switch languages to match the user.

Interview Guidelines:
- Ask coding and algorithm questions appropriate for the candidate's level
- Start with easier warm-up questions, progress to medium difficulty
- Focus on problem-solving approach, not just the answer
- Ask about time and space complexity
- Encourage the candidate to think aloud
- Be supportive and give hints if they're stuck
- After 3-4 questions, provide feedback and conclude

Example Questions:
- "How would you reverse a linked list?"
- "Explain the difference between a stack and a queue"
- "Write a function to find duplicates in an array"
- "What's the time complexity of quicksort?"

Start with a warm greeting and ask about their programming experience.
""",
    
    "system-design": """
You are a principal engineer conducting a system design interview.

Language Rules:
- If the user speaks Chinese, reply in Traditional Chinese (繁體中文) with Taiwan wording.
- If the user speaks English, reply in natural professional English.
- Automatically switch languages to match the user.

Interview Guidelines:
- Ask open-ended system design questions
- Focus on scalability, reliability, and trade-offs
- Encourage the candidate to ask clarifying questions
- Discuss database choices, caching, load balancing
- Ask about handling edge cases and failures
- Be collaborative and guide the discussion
- After 2-3 design discussions, conclude with feedback

Example Questions:
- "Design a URL shortener like bit.ly"
- "How would you design Instagram's backend?"
- "Design a rate limiting system"
- "How would you build a notification system at scale?"

Start with a warm greeting and ask about their experience with large-scale systems.
""",
    
    "case-study": """
You are a management consultant conducting a case study interview.

Language Rules:
- If the user speaks Chinese, reply in Traditional Chinese (繁體中文) with Taiwan wording.
- If the user speaks English, reply in natural professional English.
- Automatically switch languages to match the user.

Interview Guidelines:
- Present business problems and analytical challenges
- Focus on structured thinking and problem-solving approach
- Encourage the candidate to ask clarifying questions
- Discuss market sizing, profitability, strategy
- Look for logical reasoning and creativity
- Be patient and guide the analysis
- After 2-3 cases, provide feedback and conclude

Example Questions:
- "A coffee shop chain is losing customers. How would you diagnose the problem?"
- "Estimate the number of smartphones sold globally per year"
- "Should Company X enter Market Y?"
- "How would you improve user engagement for an app?"

Start with a warm greeting and ask about their analytical experience.
""",
}

GREETINGS = {
    "behavioral": {
        "zh-tw": "嗨！我是你的面試教練。這是一場行為面試，我會問關於你過去經驗的問題。請先簡單介紹一下你自己。",
        "en": "Hi! I'm your interview coach. This is a behavioral interview where I'll ask about your past experiences. Please introduce yourself.",
    },
    "technical": {
        "zh-tw": "嗨！我是你的技術面試官。我會問一些程式設計和演算法的問題。請先告訴我你的程式設計經驗。",
        "en": "Hi! I'm your technical interviewer. I'll ask some coding and algorithm questions. Tell me about your programming experience.",
    },
    "system-design": {
        "zh-tw": "嗨！我是你的系統設計面試官。我會討論大規模系統的架構問題。請分享你設計系統的經驗。",
        "en": "Hi! I'm your system design interviewer. We'll discuss architecture for large-scale systems. Share your experience with system design.",
    },
    "case-study": {
        "zh-tw": "嗨！我是你的商業案例面試官。我會提出商業問題讓你分析。請告訴我你的分析經驗。",
        "en": "Hi! I'm your case study interviewer. I'll present business problems for you to analyze. Tell me about your analytical experience.",
    },
}

MIC_TIP_ZH_TW = "我還沒收到麥克風的聲音，請確認瀏覽器已授權麥克風權限。"
MIC_TIP_EN = "I'm not receiving microphone audio. Please check that your browser has microphone permissions enabled."


# ---------- LOGGING ----------
def setup_logging():
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    log = logging.getLogger("agent")
    log.info("Starting LyraAI Interview Coach | pid=%s", os.getpid())
    return log


# ---------- AGENT ----------
class InterviewCoach(Agent):
    def __init__(self, session_id: str, interview_type: str):
        system_prompt = PROMPTS.get(interview_type, PROMPTS["behavioral"])
        super().__init__(instructions=system_prompt)
        self.session_id = session_id
        self.interview_type = interview_type


# ---------- HELPERS ----------
_CJK_RE = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf]")

def detect_lang_variant(text: str) -> str:
    if not text:
        return "en"
    return "zh-tw" if _CJK_RE.search(text) else "en"

def build_room_input_options() -> Optional[object]:
    try:
        from livekit.agents import RoomInputOptions
        with suppress(TypeError):
            return RoomInputOptions(audio=True, video=False, screen=False, close_on_disconnect=False)
        with suppress(TypeError):
            return RoomInputOptions(microphone=True, camera=False, screen=False, close_on_disconnect=False)
        with suppress(TypeError):
            return RoomInputOptions(audio=True, video=False, screen=False)
        with suppress(TypeError):
            return RoomInputOptions(microphone=True, camera=False, screen=False)
        return None
    except Exception:
        return None

def should_process(text: str) -> bool:
    return bool(text and len(text.strip()) >= MIN_TRANSCRIPT_CHARS)


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
async def fetch_session_by_room(room_name: str) -> tuple[str, str]:
    """Fetch session ID and interview type from database using room name"""
    log = logging.getLogger("agent")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{API_URL}/api/interview/by-room/{room_name}",
                headers=({"Authorization": f"Bearer {API_TOKEN}"} if API_TOKEN else {})
            )
            if r.status_code == 200:
                data = r.json()
                session_id = data.get("session", {}).get("id")
                interview_type = data.get("session", {}).get("interviewType", "behavioral")
                log.info(f"✅ Found session: {session_id}, type: {interview_type}")
                return session_id, interview_type
            else:
                log.warning(f"Session lookup failed: {r.status_code}")
    except Exception as e:
        log.warning(f"Failed to fetch session by room: {e}")
    
    return str(uuid.uuid4()), "behavioral"


# ---------- ENTRYPOINT ----------
async def entrypoint(ctx: JobContext):
    log = logging.getLogger("agent")

    room_name = ctx.room.name or ""
    
    session_id, interview_type = await fetch_session_by_room(room_name)

    await ctx.connect(auto_subscribe="audio_only")
    log.info("✅ Connected to room: %s (session: %s)", room_name, session_id)

    stt = openai.STT(model=STT_MODEL)
    llm_instance = openai.LLM(model=LLM_MODEL)
    tts_en = openai.TTS(voice=TTS_VOICE_EN)
    tts_zh_tw = openai.TTS(voice=TTS_VOICE_ZH_TW)

    session = AgentSession(
        stt=stt,
        llm=llm_instance,
        tts=tts_en,
        vad=silero.VAD.load(),
    )

    with suppress(Exception):
        if hasattr(session, "set_barge_in"):
            session.set_barge_in(True)

    # Track user activity
    heard_anything = {"flag": False, "time": None}
    greeting_tasks = []

    # Subscribe to conversation items
    @session.on("conversation_item_added")
    def on_conversation_item(event: ConversationItemAddedEvent):
        """Capture both user and agent messages"""
        try:
            role = event.item.role
            text = event.item.text_content
            
            # Mark that user has responded
            if role == "user":
                heard_anything["flag"] = True
                heard_anything["time"] = time.time()
                # Cancel any pending greeting tasks
                for task in greeting_tasks:
                    if not task.done():
                        task.cancel()
            
            if text and should_process(text):
                enqueue_transcript(session_id, role, text)
                log.info(f"{'👤' if role == 'user' else '🤖'} {role.capitalize()}: {text[:100]}")
        except Exception as e:
            log.error(f"Error in conversation_item handler: {e}")

    log.info("✅ Subscribed to conversation_item_added events")

    asyncio.create_task(_flush_transcripts())

    rio = build_room_input_options()
    agent = InterviewCoach(session_id, interview_type)
    
    if rio:
        await session.start(room=ctx.room, agent=agent, room_input_options=rio)
    else:
        await session.start(room=ctx.room, agent=agent)

    log.info(f"🎤 {interview_type.title()} interview session started")

    # Sequential greeting - only say what's needed WHEN it's needed
    async def send_sequential_greeting():
        await asyncio.sleep(2)
        
        greeting_zh = GREETINGS[interview_type]["zh-tw"]
        
        # Say Chinese greeting first
        with suppress(Exception):
            if hasattr(session, "say"):
                await session.say(greeting_zh, allow_interruptions=True)
        log.info(f"🤖 Sent {interview_type} greeting (ZH)")
        
        # Wait to see if user responds
        await asyncio.sleep(3)
        
        # Only add English if user hasn't responded yet
        if not heard_anything["flag"]:
            greeting_en = GREETINGS[interview_type]["en"]
            with suppress(Exception):
                if hasattr(session, "say"):
                    await session.say(greeting_en, allow_interruptions=True)
            log.info(f"🤖 Added English greeting (no response)")
            
            # Wait another 5 seconds for mic permission nudge
            await asyncio.sleep(5)
            
            # Only nudge about mic if STILL no response after 10 total seconds
            if not heard_anything["flag"]:
                msg = f"{MIC_TIP_ZH_TW} {MIC_TIP_EN}"
                with suppress(Exception):
                    if hasattr(session, "say"):
                        await session.say(msg, allow_interruptions=True)
                log.info("🔔 Sent mic permission nudge")

    if not LISTEN_FIRST:
        task = asyncio.create_task(send_sequential_greeting())
        greeting_tasks.append(task)

    try:
        await asyncio.sleep(SESSION_LIFETIME_S)
    except asyncio.CancelledError:
        pass

    log.info(f"🏁 {interview_type.title()} interview ended for {session_id}")


if __name__ == "__main__":
    _load_env()
    setup_logging()
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="LyraAI",
        )
    )
