import { SessionData, SpotifySession } from '../session';
import { SPOTIFY_AUTHORIZE_URL, SPOTIFY_SCOPES, SPOTIFY_TOKEN_URL } from './types';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI!;

export function generateSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_SCOPES,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state,
  });

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeSpotifyCode(code: string): Promise<SpotifySession> {
  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to exchange Spotify code: ${response.statusText}`);
  }

  const data = await response.json();

  // Fetch user profile
  const profileResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error(`Failed to fetch Spotify profile: ${profileResponse.statusText}`);
  }

  const profile = await profileResponse.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    userId: profile.id,
    displayName: profile.display_name || profile.id,
  };
}

export async function refreshSpotifyToken(session: SessionData): Promise<SpotifySession> {
  if (!session.spotify?.refreshToken) {
    throw new Error('No Spotify refresh token available');
  }

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.spotify.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Spotify token: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    ...session.spotify,
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
    // Keep the same refresh token if not provided
    refreshToken: data.refresh_token || session.spotify.refreshToken,
  };
}
