import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SpotifySession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  userId: string;
  displayName: string;
}

export interface YouTubeSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  channelId: string;
  displayName: string;
}

export interface SessionData {
  spotify?: SpotifySession;
  youtube?: YouTubeSession;
  spotifyState?: string;
  youtubeState?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: 'spotifyt_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
