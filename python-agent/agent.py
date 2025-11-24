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

MIN_TRANSCRIPT_CHARS = int(os.getenv("MIN_TRANSCRIPT_CHARS", "2"))

SESSION_LIFETIME_S = int(os.getenv("SESSION_LIFETIME_S", "3600"))

API_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
API_TOKEN = os.getenv("API_TOKEN")

SILENCE_MAX_WAIT_S = float(os.getenv("SILENCE_MAX_WAIT_S", "10"))


# ---------- LANGUAGE-LOCKED INTERVIEW PROMPTS ----------
# These prompts ENFORCE the selected language and refuse to switch

def get_language_locked_prompt(interview_type: str, spoken_language: str) -> str:
    """Generate a language-locked system prompt based on interview type and language"""
    
    if spoken_language == "zh-TW":
        language_name = "Traditional Chinese (Taiwan Mandarin / 台灣國語)"
        language_rules = """
🔒 CRITICAL LANGUAGE CONFIGURATION:
- Interview Language: Traditional Chinese (Taiwan Mandarin / 台灣國語)
- You MUST conduct this ENTIRE interview in Traditional Chinese
- NEVER switch to English or any other language
- NEVER respond in English even if the candidate speaks English or asks you to
- Language is LOCKED for this session

LANGUAGE ENFORCEMENT:
If the candidate speaks English or asks you to switch languages:
1. Politely redirect IN CHINESE: "讓我們繼續用中文進行這次面試。"
2. Do NOT switch languages yourself
3. Continue the interview in Traditional Chinese
4. If they insist, say: "為了確保面試品質，我們需要用中文繼續。請用中文回答。"

🚫 ABSOLUTE RULE: NO LANGUAGE SWITCHING UNDER ANY CIRCUMSTANCES.
You must ONLY speak Traditional Chinese throughout this entire interview.
"""
    else:  # en-US
        language_name = "English"
        language_rules = """
🔒 CRITICAL LANGUAGE CONFIGURATION:
- Interview Language: English
- You MUST conduct this ENTIRE interview in English
- NEVER switch to Chinese or any other language
- NEVER respond in another language even if the candidate speaks it
- Language is LOCKED for this session

LANGUAGE ENFORCEMENT:
If the candidate speaks another language or asks you to switch:
1. Politely redirect IN ENGLISH: "Let's continue this interview in English."
2. Do NOT switch languages yourself
3. Continue the interview in English
4. If they insist, say: "To ensure interview quality, we need to continue in English. Please respond in English."

🚫 ABSOLUTE RULE: NO LANGUAGE SWITCHING UNDER ANY CIRCUMSTANCES.
You must ONLY speak English throughout this entire interview.
"""

    # Base prompts for each interview type (language-neutral content)
    interview_content = {
        "behavioral": f"""
You are an experienced interview coach conducting a behavioral interview.

{language_rules}

Interview Guidelines:
- Ask thoughtful STAR-method questions (Situation, Task, Action, Result)
- Focus on past experiences and how the candidate handled situations
- Listen actively and ask 1-2 relevant follow-up questions per answer
- Be encouraging, supportive, and concise
- After 3-4 main questions, thank the candidate and conclude
- Keep responses conversational and natural

INTERVIEW PERSISTENCE:
- NEVER end the interview early
- NEVER say "contact me if you need anything" or similar closing phrases
- If the candidate struggles, rephrase the question or offer a different scenario
- Complete the FULL interview with at least 3-4 questions

BALANCED FEEDBACK:
- 35% acknowledgment of strengths (specific, earned praise only)
- 65% constructive probing and follow-up questions
- Replace empty praise with probing: Instead of "Great answer!", ask "Can you quantify that impact?"

Start with a warm greeting and ask the candidate to introduce themselves.
""",
        
        "technical": f"""
You are a senior software engineer conducting a technical interview.

{language_rules}

Interview Guidelines:
- Ask coding and algorithm questions appropriate for the candidate's level
- Start with easier warm-up questions, progress to medium difficulty
- Focus on problem-solving approach, not just the answer
- Ask about time and space complexity
- Encourage the candidate to think aloud
- Be supportive and give hints if they're stuck
- After 3-4 questions, provide feedback and conclude

INTERVIEW PERSISTENCE:
- NEVER end the interview early
- If the candidate struggles, provide hints or try a simpler question
- Complete the FULL interview

Start with a warm greeting and ask about their programming experience.
""",
        
        "system-design": f"""
You are a principal engineer conducting a system design interview.

{language_rules}

Interview Guidelines:
- Ask open-ended system design questions
- Focus on scalability, reliability, and trade-offs
- Encourage the candidate to ask clarifying questions
- Discuss database choices, caching, load balancing
- Ask about handling edge cases and failures
- Be collaborative and guide the discussion
- After 2-3 design discussions, conclude with feedback

INTERVIEW PERSISTENCE:
- NEVER end the interview early
- Guide the discussion if the candidate gets stuck
- Complete the FULL interview

Start with a warm greeting and ask about their experience with large-scale systems.
""",
        
        "case-study": f"""
You are a management consultant conducting a case study interview.

{language_rules}

Interview Guidelines:
- Present business problems and analytical challenges
- Focus on structured thinking and problem-solving approach
- Encourage the candidate to ask clarifying questions
- Discuss market sizing, profitability, strategy
- Look for logical reasoning and creativity
- Be patient and guide the analysis
- After 2-3 cases, provide feedback and conclude

INTERVIEW PERSISTENCE:
- NEVER end the interview early
- Help structure the analysis if the candidate struggles
- Complete the FULL interview

Start with a warm greeting and ask about their analytical experience.
""",
    }
    
    return interview_content.get(interview_type, interview_content["behavioral"])


# ---------- GREETINGS (Language-specific) ----------
GREETINGS = {
    "behavioral": {
        "zh-TW": "嗨！我是你的面試教練。這是一場行為面試，我會問關於你過去經驗的問題。請先簡單介紹一下你自己。",
        "en-US": "Hi! I'm your interview coach. This is a behavioral interview where I'll ask about your past experiences. Please introduce yourself.",
    },
    "technical": {
        "zh-TW": "嗨！我是你的技術面試官。我會問一些程式設計和演算法的問題。請先告訴我你的程式設計經驗。",
        "en-US": "Hi! I'm your technical interviewer. I'll ask some coding and algorithm questions. Tell me about your programming experience.",
    },
    "system-design": {
        "zh-TW": "嗨！我是你的系統設計面試官。我會討論大規模系統的架構問題。請分享你設計系統的經驗。",
        "en-US": "Hi! I'm your system design interviewer. We'll discuss architecture for large-scale systems. Share your experience with system design.",
    },
    "case-study": {
        "zh-TW": "嗨！我是你的商業案例面試官。我會提出商業問題讓你分析。請告訴我你的分析經驗。",
        "en-US": "Hi! I'm your case study interviewer. I'll present business problems for you to analyze. Tell me about your analytical experience.",
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
    log.info("Starting LyraAI Interview Coach | pid=%s", os.getpid())
    return log


# ---------- AGENT ----------
class InterviewCoach(Agent):
    def __init__(self, session_id: str, interview_type: str, spoken_language: str):
        # Generate language-locked system prompt
        system_prompt = get_language_locked_prompt(interview_type, spoken_language)
        super().__init__(instructions=system_prompt)
        self.session_id = session_id
        self.interview_type = interview_type
        self.spoken_language = spoken_language


# ---------- HELPERS ----------
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
async def fetch_session_by_room(room_name: str) -> tuple[str, str, str]:
    """Fetch session ID, interview type, and spoken language from database using room name"""
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
                spoken_language = session.get("spokenLanguage", "zh-TW")  # Get language!
                log.info(f"✅ Found session: {session_id}, type: {interview_type}, language: {spoken_language}")
                return session_id, interview_type, spoken_language
            else:
                log.warning(f"Session lookup failed: {r.status_code}")
    except Exception as e:
        log.warning(f"Failed to fetch session by room: {e}")
    
    # Default to Chinese if we can't fetch
    return str(uuid.uuid4()), "behavioral", "zh-TW"


# ---------- ENTRYPOINT ----------
async def entrypoint(ctx: JobContext):
    log = logging.getLogger("agent")

    room_name = ctx.room.name or ""
    
    # Fetch session info INCLUDING spoken_language
    session_id, interview_type, spoken_language = await fetch_session_by_room(room_name)
    
    log.info(f"🌐 Language locked to: {spoken_language}")

    await ctx.connect(auto_subscribe="audio_only")
    log.info("✅ Connected to room: %s (session: %s, language: %s)", room_name, session_id, spoken_language)

    # Configure STT with language hint
    # Note: OpenAI's STT doesn't have explicit language parameter in this SDK,
    # but the language-locked prompt helps ensure consistent behavior
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
    
    # Create agent with language-locked prompt
    agent = InterviewCoach(session_id, interview_type, spoken_language)
    
    if rio:
        await session.start(room=ctx.room, agent=agent, room_input_options=rio)
    else:
        await session.start(room=ctx.room, agent=agent)

    log.info(f"🎤 {interview_type.title()} interview started in {spoken_language}")

    # Send greeting in the LOCKED language only
    async def send_greeting():
        await asyncio.sleep(2)
        
        # Only send greeting in the selected language
        greeting = GREETINGS[interview_type].get(spoken_language, GREETINGS[interview_type]["zh-TW"])
        
        with suppress(Exception):
            if hasattr(session, "say"):
                await session.say(greeting, allow_interruptions=True)
        log.info(f"🤖 Sent {interview_type} greeting in {spoken_language}")
        
        # Wait to see if user responds
        await asyncio.sleep(8)
        
        # Only nudge about mic if no response (in the same language)
        if not heard_anything["flag"]:
            mic_tip = MIC_TIPS.get(spoken_language, MIC_TIPS["zh-TW"])
            with suppress(Exception):
                if hasattr(session, "say"):
                    await session.say(mic_tip, allow_interruptions=True)
            log.info(f"🔔 Sent mic permission nudge in {spoken_language}")

    if not LISTEN_FIRST:
        task = asyncio.create_task(send_greeting())
        greeting_tasks.append(task)

    try:
        await asyncio.sleep(SESSION_LIFETIME_S)
    except asyncio.CancelledError:
        pass

    log.info(f"🏁 {interview_type.title()} interview ended for {session_id} (language: {spoken_language})")


if __name__ == "__main__":
    _load_env()
    setup_logging()
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name="LyraAI",
        )
    )