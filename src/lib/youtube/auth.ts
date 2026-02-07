import { google } from 'googleapis';
import { SessionData, YouTubeSession } from '../session';
import { YOUTUBE_SCOPES } from './types';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

export function generateYouTubeAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: YOUTUBE_SCOPES,
    state,
    prompt: 'consent', // Force consent screen to always get refresh token
  });
}

export async function exchangeYouTubeCode(code: string): Promise<YouTubeSession> {
  const oauth2Client = getOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from YouTube');
  }

  oauth2Client.setCredentials(tokens);

  // Fetch channel info
  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
  const channelResponse = await youtube.channels.list({
    part: ['snippet'],
    mine: true,
  });

  const channel = channelResponse.data.items?.[0];
  if (!channel) {
    throw new Error('No YouTube channel found');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date || Date.now() + 3600 * 1000,
    channelId: channel.id!,
    displayName: channel.snippet?.title || 'Unknown',
  };
}

export async function refreshYouTubeToken(session: SessionData): Promise<YouTubeSession> {
  if (!session.youtube?.refreshToken) {
    throw new Error('No YouTube refresh token available');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: session.youtube.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error('Failed to refresh YouTube token');
  }

  return {
    ...session.youtube,
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date || Date.now() + 3600 * 1000,
    refreshToken: credentials.refresh_token || session.youtube.refreshToken,
  };
}
