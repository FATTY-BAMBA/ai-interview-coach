# AI Interview Coach - Project Summary & Documentation

## 📋 Table of Contents
1. [What Is This Tool?](#what-is-this-tool)
2. [Key Features](#key-features)
3. [Tech Stack](#tech-stack)
4. [Project Architecture](#project-architecture)
5. [Major Folders & Files](#major-folders--files)
6. [How It Works](#how-it-works)
7. [Current Status](#current-status)
8. [Future Roadmap](#future-roadmap)

---

## 🎯 What Is This Tool?

**AI Interview Coach** is a voice-based interview practice platform that helps users prepare for job interviews through realistic, AI-powered mock interviews.

### Core Concept:
- Users join a virtual interview room
- An AI interviewer (powered by OpenAI GPT-4) conducts a behavioral interview
- Real-time voice conversation (speech-to-text and text-to-speech)
- After the interview, AI generates a detailed evaluation report with scores and feedback

### Target Users:
- Job seekers preparing for interviews
- Students practicing communication skills
- Professionals improving interview techniques
- Taiwan/Chinese-speaking users (bilingual support)

---

## ✨ Key Features

### ✅ **Implemented (Current Version)**

#### 1. **Voice Interview System**
- Real-time voice conversations using LiveKit
- OpenAI Whisper for speech-to-text (STT)
- OpenAI TTS for natural AI voice responses
- Silero VAD (Voice Activity Detection) for speech detection

#### 2. **Bilingual Support (English + Traditional Chinese)**
- Auto-detects user's language (English or Chinese)
- Responds in the same language
- Taiwan-specific Traditional Chinese (繁體中文)
- Separate TTS voices for each language

#### 3. **Smart Agent Features**
- Auto-greeting after 8 seconds if user is silent
- Microphone troubleshooting tips if no audio detected
- 60-second grace period for disconnections
- Barge-in support (user can interrupt AI)

#### 4. **Full Transcript Capture**
- Saves both user and AI messages to PostgreSQL database
- Queued saving with retry logic (production-ready)
- Persistent conversation history

#### 5. **AI-Powered Evaluation Reports**
- GPT-4 analyzes interview transcripts
- Generates comprehensive feedback:
  - Overall Score (0-10)
  - Clarity Score (communication)
  - Structure Score (STAR method usage)
  - Confidence Score (professional demeanor)
  - 3-5 Strengths
  - 3-5 Areas for Improvement
  - Detailed 2-3 paragraph feedback
- Beautiful UI to display results

#### 6. **STAR-Method Coaching**
- AI asks questions designed for STAR responses:
  - **S**ituation: Set the context
  - **T**ask: Explain the challenge
  - **A**ction: Describe what you did
  - **R**esult: Share the outcome
- Encourages structured, professional answers

---

### 🚧 **Planned Features**

#### Phase 3: Multiple Interview Types (Next)
- Behavioral interviews (current)
- Technical interviews (coding questions)
- System design interviews
- Case study interviews
- User selects type before starting

#### Phase 4: User Authentication
- Login/signup with NextAuth.js
- User profiles and dashboards
- Protected routes
- Interview history per user

#### Phase 5: Progress Tracking
- View all past interviews
- Score trends over time
- Analytics charts
- Personalized improvement suggestions

#### Phase 6: UI Polish
- Better interview page design
- "End Interview" button
- Auto-redirect to evaluation after interview
- Loading states and animations

---

## 🛠️ Tech Stack

### **Frontend**
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **LiveKit React Components** - Video/audio UI

### **Backend**
- **Next.js API Routes** - RESTful endpoints
- **PostgreSQL** - Database (via Neon)
- **Drizzle ORM** - Database toolkit
- **OpenAI API** - GPT-4 for evaluation, GPT-4o for conversations

### **AI Voice Agent**
- **Python 3.11** - Agent runtime
- **LiveKit Agents SDK** - Voice agent framework
- **OpenAI Realtime API** - Speech recognition & generation
- **Silero VAD** - Voice activity detection

### **Infrastructure**
- **LiveKit Cloud** - WebRTC infrastructure (Japan region)
- **Neon PostgreSQL** - Serverless Postgres
- **Vercel** (planned) - Deployment

---

## 🏗️ Project Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  - Next.js Frontend (React)                             │
│  - LiveKit Client (WebRTC audio/video)                  │
└────────────┬────────────────────────────────────────────┘
             │
             │ WebRTC Connection
             ↓
┌─────────────────────────────────────────────────────────┐
│              LiveKit Cloud (Japan)                       │
│  - Manages WebRTC rooms                                 │
│  - Routes audio streams                                 │
└────────────┬────────────────────────────────────────────┘
             │
             │ Audio Stream
             ↓
┌─────────────────────────────────────────────────────────┐
│         Python Agent (Local/VPS)                        │
│  - Receives user audio                                  │
│  - OpenAI Whisper: Speech → Text                        │
│  - OpenAI GPT-4o: Generate response                     │
│  - OpenAI TTS: Text → Speech                            │
│  - Sends audio back to room                             │
│  - Saves transcripts to database via API                │
└────────────┬────────────────────────────────────────────┘
             │
             │ HTTP API Calls
             ↓
┌─────────────────────────────────────────────────────────┐
│              Next.js Backend APIs                        │
│  - /api/interview/create: Start interview               │
│  - /api/interview/transcript: Save messages             │
│  - /api/interview/evaluate: Generate report             │
└────────────┬────────────────────────────────────────────┘
             │
             │ SQL Queries
             ↓
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL Database (Neon)                    │
│  Tables:                                                │
│  - users (planned)                                      │
│  - interview_sessions                                   │
│  - conversation_turns (transcripts)                     │
│  - evaluation_reports                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📂 Major Folders & Files

### **Root Directory Structure**
```
ai-interview-coach/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage (interview start)
│   ├── interview/
│   │   └── [roomName]/
│   │       └── page.tsx          # Interview room page (LiveKit UI)
│   ├── evaluation/
│   │   └── [sessionId]/
│   │       └── page.tsx          # Evaluation report display
│   └── api/                      # Backend API routes
│       └── interview/
│           ├── create/
│           │   └── route.ts      # Create new interview session
│           ├── transcript/
│           │   └── route.ts      # Save conversation messages
│           └── evaluate/
│               └── route.ts      # Generate AI evaluation
│
├── lib/                          # Shared utilities
│   ├── db/
│   │   ├── index.ts              # Database connection (Drizzle)
│   │   └── schema.ts             # Database schema definitions
│   └── livekit.ts                # LiveKit server SDK setup
│
├── python-agent/                 # AI Voice Agent
│   ├── agent.py                  # Main agent code (CRITICAL FILE)
│   ├── requirements.txt          # Python dependencies
│   ├── venv/                     # Python virtual environment
│   └── .env                      # Agent environment variables
│
├── .env.local                    # Next.js environment variables
├── drizzle.config.ts             # Database configuration
├── package.json                  # Node.js dependencies
└── tsconfig.json                 # TypeScript configuration
```

---

## 📄 Critical Files Explained

### **1. `python-agent/agent.py`** (12KB)
**Purpose:** The AI interviewer brain

**What it does:**
- Connects to LiveKit rooms
- Listens to user's voice (via microphone)
- Converts speech to text (OpenAI Whisper)
- Sends text to GPT-4o for intelligent responses
- Converts AI response to speech (OpenAI TTS)
- Detects user's language (Chinese/English) and switches TTS voice
- Saves all conversation turns to database via API
- Handles disconnections gracefully

**Key Configuration:**
```python
LLM_MODEL = "gpt-4o"              # AI brain
STT_MODEL = "gpt-4o-transcribe"   # Speech recognition
TTS_VOICE_EN = "alloy"            # English voice
TTS_VOICE_ZH_TW = "nova"          # Chinese voice
```

**Environment Variables Used:**
- `LIVEKIT_URL` - LiveKit server URL
- `LIVEKIT_API_KEY` - Authentication
- `LIVEKIT_API_SECRET` - Authentication
- `OPENAI_API_KEY` - OpenAI API access

---

### **2. `lib/db/schema.ts`** (~200 lines)
**Purpose:** Database table definitions

**Tables:**
1. **users** (planned for Phase 4)
   - User accounts and profiles
   
2. **interview_sessions**
   - Each interview attempt
   - Fields: id, userId, roomName, interviewType, targetRole, status, timestamps
   
3. **conversation_turns**
   - Every message in the conversation
   - Fields: id, sessionId, role (user/assistant), text, timestamp
   
4. **evaluation_reports**
   - AI-generated feedback after interviews
   - Fields: scores (overall, clarity, structure, confidence), strengths[], improvements[], detailedFeedback

---

### **3. `app/api/interview/create/route.ts`**
**Purpose:** Start a new interview session

**What it does:**
```typescript
POST /api/interview/create
Body: { interviewType: "behavioral" }

→ Creates interview_sessions record in database
→ Generates LiveKit room token
→ Returns: { roomName, token, sessionId }
```

**Flow:**
1. User clicks "Start Interview" on homepage
2. API creates database record
3. Generates unique room name (e.g., `interview-abc123`)
4. Creates LiveKit access token
5. Returns info to frontend
6. Frontend redirects to `/interview/[roomName]`

---

### **4. `app/api/interview/transcript/route.ts`**
**Purpose:** Save conversation messages

**What it does:**
```typescript
POST /api/interview/transcript
Body: { sessionId, role: "user"|"assistant", text }

→ Inserts into conversation_turns table
→ Returns: { success: true }
```

**Called by:** Python agent (via httpx)

**Flow:**
1. User speaks: "Tell me about yourself"
2. Agent saves: `role: "user", text: "Tell me about yourself"`
3. AI responds: "Great! I'd love to hear..."
4. Agent saves: `role: "assistant", text: "Great! I'd love to hear..."`

---

### **5. `app/api/interview/evaluate/route.ts`** (150 lines)
**Purpose:** Generate AI evaluation report

**What it does:**
```typescript
POST /api/interview/evaluate
Body: { sessionId }

→ Fetches all conversation_turns for this session
→ Formats as transcript
→ Sends to GPT-4 for analysis
→ Saves evaluation_reports to database
→ Returns: { evaluation: {...scores, feedback...} }
```

**GPT-4 Prompt:**
- Analyzes communication clarity
- Checks for STAR method usage
- Assesses confidence and professionalism
- Provides actionable improvements
- Returns JSON with scores and feedback

---

### **6. `app/interview/[roomName]/page.tsx`**
**Purpose:** Interview room UI

**What it does:**
- Displays LiveKit video/audio interface
- Shows "Connected to Interview" status
- Microphone/camera controls
- Real-time audio visualization
- Leave interview button

**Tech:**
- Uses `@livekit/components-react`
- WebRTC connection to LiveKit
- Audio streams to Python agent

---

### **7. `app/evaluation/[sessionId]/page.tsx`** (11KB)
**Purpose:** Display evaluation report

**What it does:**
- Fetches existing evaluation or shows "Generate" button
- Calls `/api/interview/evaluate` endpoint
- Beautiful UI with:
  - Overall score badge (large display)
  - Score breakdown cards (3 metrics)
  - Strengths list (green checkmarks)
  - Improvements list (yellow lightning)
  - Detailed feedback (paragraphs)
- Actions: "Start New Interview", "Download Report"

---

### **8. `.env.local`** (Next.js environment)
**Critical Variables:**
```bash
# Database
DATABASE_URL="postgresql://..."

# LiveKit (get from livekit.io dashboard)
LIVEKIT_URL="wss://..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
NEXT_PUBLIC_LIVEKIT_URL="wss://..."  # For frontend

# OpenAI
OPENAI_API_KEY="sk-..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

### **9. `python-agent/.env`** (Agent environment)
**Critical Variables:**
```bash
# Copy from .env.local
LIVEKIT_URL="wss://..."
LIVEKIT_API_KEY="..."
LIVEKIT_API_SECRET="..."
OPENAI_API_KEY="sk-..."
```

---

## 🔄 How It Works (Step-by-Step)

### **Interview Flow:**

1. **User lands on homepage** (`app/page.tsx`)
   - Sees "Start Interview" button
   
2. **User clicks "Start Interview"**
   - Frontend calls `POST /api/interview/create`
   - Creates database record in `interview_sessions`
   - Gets `roomName` and LiveKit `token`
   
3. **Redirect to interview room** (`/interview/[roomName]`)
   - LiveKit component connects to room
   - Python agent automatically joins room (via `agent.py dev` mode)
   
4. **Agent greets user** (2 seconds after connection)
   - Python agent detects connection
   - Speaks: "Hi! I'm your interview coach. Please introduce yourself..."
   - Saves greeting to `conversation_turns`
   
5. **User speaks into microphone**
   - Audio → LiveKit → Python agent
   - Agent: Speech-to-text (OpenAI Whisper)
   - Agent: Detects language (Chinese vs English)
   - Agent: Switches TTS voice if needed
   - Agent: Saves user message to database
   
6. **Agent generates response**
   - Agent: Sends transcript to GPT-4o
   - GPT-4o: Generates interview question/response
   - Agent: Text-to-speech (OpenAI TTS)
   - Audio → LiveKit → User's browser
   - Agent: Saves AI message to database
   
7. **Conversation continues** (3-4 questions)
   - Repeat steps 5-6
   - All messages saved to `conversation_turns`
   
8. **Interview ends**
   - User says "Let's end the interview" OR
   - Agent concludes after 3-4 questions OR
   - User clicks "Leave" button
   
9. **User navigates to evaluation** (`/evaluation/[sessionId]`)
   - Page loads, checks if evaluation exists
   - If not, shows "Generate Evaluation Report" button
   
10. **Generate evaluation**
    - User clicks button
    - Frontend calls `POST /api/interview/evaluate`
    - Backend fetches all `conversation_turns`
    - Sends transcript to GPT-4 for analysis
    - GPT-4 returns scores + feedback (JSON)
    - Backend saves to `evaluation_reports` table
    - Frontend displays beautiful report
    
11. **User reviews feedback**
    - Sees overall score (e.g., 7.5/10)
    - Reads strengths and improvements
    - Downloads report or starts new interview

---

## 📊 Current Status

### **✅ Fully Working:**
- Voice interviews (English + Chinese)
- Real-time AI conversations
- Bilingual auto-switching
- Full transcript capture
- AI evaluation reports
- Database persistence
- Production-ready error handling

### **⚠️ Needs Improvement:**
- Interview page UI (basic)
- No "End Interview" button
- Manual navigation to evaluation
- No user authentication
- No interview history

### **🚧 Not Started:**
- Multiple interview types
- User accounts/profiles
- Progress tracking dashboard
- Analytics and trends

---

## 🗺️ Future Roadmap

### **Phase 3: Interview Types** (Next - 30 min)
- Add interview type selector on homepage
- Update agent prompts for:
  - Technical interviews (algorithms, data structures)
  - System design interviews
  - Case study interviews
- Different evaluation criteria per type

### **Phase 4: Authentication** (1 hour)
- NextAuth.js setup (email/password or OAuth)
- User registration and login
- Protected routes
- User dashboard

### **Phase 5: Progress Tracking** (45 min)
- `/dashboard` page showing all past interviews
- Score trends chart (Recharts)
- Average scores over time
- Most improved areas
- Recommended focus areas

### **Phase 6: UI Polish** (30 min)
- Redesign interview page
- Add "End Interview" button
- Auto-redirect to evaluation
- Loading states and animations
- Better mobile responsiveness

### **Phase 7: Advanced Features** (Future)
- Mock interview with specific companies
- Industry-specific questions (tech, finance, etc.)
- Video recording playback
- Share reports with others
- Interview scheduling/calendar
- AI interviewer personalities

---

## 🔑 Key Concepts to Remember

### **1. LiveKit Rooms**
- Each interview = 1 unique room
- Room name format: `interview-[shortId]`
- Python agent joins same room as user
- Audio streams bidirectionally

### **2. Session ID vs Room Name**
- **Session ID**: UUID in database (`interview_sessions.id`)
- **Room Name**: LiveKit room identifier (`interview-rnpXxqoU2xwW`)
- Room name contains session ID after "interview-" prefix

### **3. Agent Modes**
- `python3 agent.py dev` - Auto-joins new rooms (for development)
- `python3 agent.py connect --room [name]` - Joins specific room

### **4. Transcript Roles**
- `role: "user"` - Candidate's messages
- `role: "assistant"` - AI interviewer's messages

### **5. Language Detection**
- Regex checks for CJK characters (Chinese/Japanese/Korean)
- If found → `zh-tw` (Traditional Chinese)
- Otherwise → `en` (English)

---

## 📝 Development Commands

### **Start Development:**
```bash
# Terminal 1: Next.js
cd ~/ai-interview-coach
npm run dev

# Terminal 2: Python Agent
cd ~/ai-interview-coach/python-agent
source venv/bin/activate
python3 agent.py dev

# Terminal 3: Database Studio (optional)
cd ~/ai-interview-coach
npx drizzle-kit studio
```

### **Database Commands:**
```bash
# Generate migrations after schema changes
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Open studio
npx drizzle-kit studio
```

### **Test API:**
```bash
# Create interview
curl -X POST http://localhost:3000/api/interview/create \
  -H "Content-Type: application/json" \
  -d '{"interviewType":"behavioral"}' | python3 -m json.tool

# Save transcript
curl -X POST http://localhost:3000/api/interview/transcript \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"xxx","role":"user","text":"Hello"}'

# Generate evaluation
curl -X POST http://localhost:3000/api/interview/evaluate \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"xxx"}'
```

---

## 🎓 Learning Resources

- **LiveKit Docs**: https://docs.livekit.io
- **OpenAI API**: https://platform.openai.com/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **Next.js**: https://nextjs.org/docs

---

**Last Updated:** November 1, 2025  
**Project Status:** Phase 2 Complete, Phase 3 Ready to Start
