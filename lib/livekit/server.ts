import { AccessToken } from 'livekit-server-sdk';

if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
  throw new Error('LiveKit credentials not configured');
}

export const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
export const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
export const LIVEKIT_URL = process.env.LIVEKIT_URL;

/**
 * Generate a LiveKit access token for a participant
 */
export function generateToken(roomName: string, participantName: string) {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  return token.toJwt();
}
