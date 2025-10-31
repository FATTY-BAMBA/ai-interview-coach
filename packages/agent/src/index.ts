import { Room, RoomEvent, RemoteParticipant } from 'livekit-client';
import OpenAI from 'openai';
import { AccessToken } from 'livekit-server-sdk';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, '../../../.env.local') });

const LIVEKIT_URL = process.env.LIVEKIT_URL!;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY!;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

class InterviewAgent {
  private room: Room;
  private roomName: string;
  private isInterviewing: boolean = false;

  constructor(roomName: string) {
    this.roomName = roomName;
    this.room = new Room();
  }

  async connect() {
    console.log(`🤖 AI Agent connecting to room: ${this.roomName}`);

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: 'AI-Interviewer',
    });

    token.addGrant({
      room: this.roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    await this.room.connect(LIVEKIT_URL, jwt);
    console.log('✅ Agent connected to room');

    this.setupEventListeners();
    setTimeout(() => this.startInterview(), 2000);
  }

  private setupEventListeners() {
    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log(`👤 Participant joined: ${participant.identity}`);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('❌ Agent disconnected from room');
    });
  }

  private async startInterview() {
    if (this.isInterviewing) return;
    this.isInterviewing = true;

    console.log('🎤 Starting interview...');

    try {
      const greeting = await this.generateResponse(
        'You are an AI interview coach. Greet the candidate warmly and ask them to introduce themselves.'
      );

      console.log('🤖 Agent says:', greeting);
    } catch (error) {
      console.error('Error starting interview:', error);
    }
  }

  private async generateResponse(prompt: string): Promise<string> {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a professional interview coach conducting a behavioral interview.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
    });

    return response.choices[0].message.content || '';
  }

  async disconnect() {
    await this.room.disconnect();
    console.log('Agent disconnected');
  }
}

export async function startAgentForRoom(roomName: string) {
  const agent = new InterviewAgent(roomName);
  await agent.connect();
  return agent;
}

const roomName = process.argv[2];
if (roomName) {
  console.log(`Starting agent for room: ${roomName}`);
  startAgentForRoom(roomName).catch(console.error);
} else {
  console.error('Usage: npm run dev <roomName>');
  process.exit(1);
}

export default InterviewAgent;
