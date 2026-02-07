import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateSpotifyAuthUrl } from '@/lib/spotify/auth';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const session = await getSession();

    // Generate state for CSRF protection
    const state = randomBytes(16).toString('hex');
    session.spotifyState = state;
    await session.save();

    const authUrl = generateSpotifyAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Spotify login error:', error);
    return NextResponse.json({ error: 'Failed to initiate Spotify login' }, { status: 500 });
  }
}
