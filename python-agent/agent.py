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

SILENCE_MAX_WAIT_S = float(os.getenv("SILENCE_MAX_WAIT_S", "8"))
SECOND_NUDGE_S = float(os.getenv("SECOND_NUDGE_S", "20"))
SILENCE_NUDGE_ENABLED = os.getenv("SILENCE_NUDGE_ENABLED", "true").lower() == "true"

DISCONNECT_GRACE_S = float(os.getenv("DISCONNECT_GRACE_S", "60"))

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
    log.info("Starting Bilingual InterviewCoach | pid=%s", os.getpid())
    return log


# ---------- AGENT ----------
class InterviewCoach(Agent):
    def __init__(self, session_id: str, interview_type: str, transcript_callback):
        system_prompt = PROMPTS.get(interview_type, PROMPTS["behavioral"])
        super().__init__(instructions=system_prompt)
        self.session_id = session_id
        self.interview_type = interview_type
        self.transcript_callback = transcript_callback


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
    logging.getLogger("agent").debug("💬 Queued %s message: %s...", role, text[:50])

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
                        if r.status_code < 500:
                            if r.status_code == 200:
                                logging.getLogger("agent").debug("💾 Saved %s message", item["role"])
                            else:
                                logging.getLogger("agent").warning("Transcript write non-200: %s", r.status_code)
                            break
                    except Exception as e:
                        logging.getLogger("agent").debug("Transcript save attempt %d failed: %s", attempt + 1, e)
                    await asyncio.sleep(0.3 * (2**attempt))
            else:
                await asyncio.sleep(0.05)


# ---------- FETCH INTERVIEW TYPE ----------
async def fetch_interview_type(session_id: str) -> str:
    """Fetch interview type from database"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(f"{API_URL}/api/interview/{session_id}")
            if r.status_code == 200:
                data = r.json()
                interview_type = data.get("session", {}).get("interviewType", "behavioral")
                logging.getLogger("agent").info(f"📋 Interview type: {interview_type}")
                return interview_type
    except Exception as e:
        logging.getLogger("agent").warning(f"Failed to fetch interview type: {e}")
    
    return "behavioral"  # Default fallback


# ---------- ENTRYPOINT ----------
async def entrypoint(ctx: JobContext):
    log = logging.getLogger("agent")

    room_name = ctx.room.name or ""
    session_id = room_name.split("interview-")[-1] if "interview-" in room_name else str(uuid.uuid4())
    
    try:
        uuid.UUID(session_id)
    except:
        session_id = str(uuid.uuid4())

    await ctx.connect(auto_subscribe="audio_only")
    log.info("✅ Connected to room: %s (session: %s)", room_name, session_id)

    # Fetch interview type from database
    interview_type = await fetch_interview_type(session_id)

    stt = openai.STT(model=STT_MODEL)
    llm = openai.LLM(model=LLM_MODEL)
    tts_en = openai.TTS(voice=TTS_VOICE_EN)
    tts_zh_tw = openai.TTS(voice=TTS_VOICE_ZH_TW)

    session = AgentSession(
        stt=stt,
        llm=llm,
        tts=tts_en,
        vad=silero.VAD.load(),
    )

    with suppress(Exception):
        if hasattr(session, "set_barge_in"):
            session.set_barge_in(True)

    asyncio.create_task(_flush_transcripts())

    async def save_transcript(session_id: str, role: str, text: str):
        enqueue_transcript(session_id, role, text)

    rio = build_room_input_options()
    agent = InterviewCoach(session_id, interview_type, save_transcript)
    
    if rio:
        await session.start(room=ctx.room, agent=agent, room_input_options=rio)
    else:
        await session.start(room=ctx.room, agent=agent)

    log.info(f"🎤 {interview_type.title()} interview session started")

    current_lang = None
    heard_anything = {"flag": False}
    counters = {"start_ts": time.perf_counter(), "last_user_ts": None}

    def _apply_lang(lang: str):
        nonlocal current_lang
        if LANG_MODE == "lock_first":
            current_lang = current_lang or lang
            lang = current_lang
        else:
            current_lang = lang

        desired = tts_zh_tw if lang == "zh-tw" else tts_en
        with suppress(Exception):
            if hasattr(session, "set_tts"):
                session.set_tts(desired)
                log.debug("🔊 TTS -> %s", "zh-TW" if lang == "zh-tw" else "EN")

    hooked = False
    for attr in ("on_user_transcript", "on_transcript"):
        if hasattr(session, attr):
            try:
                cb = getattr(session, attr)

                def _listener(*args, **kwargs):
                    text = None
                    if args and isinstance(args[0], str):
                        text = args[0]
                    elif args:
                        text = getattr(args[0], "text", str(args[0]))
                    text = text or kwargs.get("text") or ""
                    
                    if not should_process(text):
                        return

                    heard_anything["flag"] = True
                    counters["last_user_ts"] = time.perf_counter()

                    lang = detect_lang_variant(text)
                    _apply_lang(lang)

                    enqueue_transcript(session_id, "user", text)

                result = cb(_listener)
                if asyncio.iscoroutine(result):
                    await result
                log.info("✅ User transcript hook attached via %s", attr)
                hooked = True
                break
            except Exception as e:
                log.debug("Hook %s failed: %s", attr, e)

    if not hooked:
        log.info("⚠️ Transcript hook not available")

    async def send_initial_greeting():
        await asyncio.sleep(2)
        
        # Bilingual greeting based on interview type
        greeting_zh = GREETINGS[interview_type]["zh-tw"]
        greeting_en = GREETINGS[interview_type]["en"]
        greeting = f"{greeting_zh} | {greeting_en}"
        
        enqueue_transcript(session_id, "assistant", greeting)
        
        with suppress(Exception):
            if hasattr(session, "say"):
                await session.say(greeting, allow_interruptions=True)
            log.info(f"🤖 Sent {interview_type} greeting")

    if not LISTEN_FIRST:
        asyncio.create_task(send_initial_greeting())

    async def _silence_nudge():
        if not SILENCE_NUDGE_ENABLED:
            return
        await asyncio.sleep(SILENCE_MAX_WAIT_S)
        if not heard_anything["flag"]:
            greeting_zh = GREETINGS[interview_type]["zh-tw"]
            greeting_en = GREETINGS[interview_type]["en"]
            msg = f"{greeting_zh} {greeting_en}"
            enqueue_transcript(session_id, "assistant", msg)
            with suppress(Exception):
                if hasattr(session, "say"):
                    await session.say(msg)
            log.info("🔔 Sent silence nudge")

    async def _second_nudge():
        if not SILENCE_NUDGE_ENABLED:
            return
        await asyncio.sleep(SECOND_NUDGE_S)
        if not heard_anything["flag"]:
            msg = f"{MIC_TIP_ZH_TW} {MIC_TIP_EN}"
            enqueue_transcript(session_id, "assistant", msg)
            with suppress(Exception):
                if hasattr(session, "say"):
                    await session.say(msg)
            log.info("🎤 Sent mic tip")

    asyncio.create_task(_silence_nudge())
    asyncio.create_task(_second_nudge())

    async def _graceful_shutdown():
        await asyncio.sleep(DISCONNECT_GRACE_S)
        if counters["last_user_ts"] is None and (time.perf_counter() - counters["start_ts"]) > DISCONNECT_GRACE_S:
            log.info("⏱️ No user activity after grace period")

    asyncio.create_task(_graceful_shutdown())

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
            agent_name="InterviewCoach",
        )
    )
