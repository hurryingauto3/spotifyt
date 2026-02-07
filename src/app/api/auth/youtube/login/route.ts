import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { generateYouTubeAuthUrl } from '@/lib/youtube/auth';
import { randomBytes } from 'crypto';

export async function GET() {
  try {
    const session = await getSession();

    // Generate state for CSRF protection
    const state = randomBytes(16).toString('hex');
    session.youtubeState = state;
    await session.save();

    const authUrl = generateYouTubeAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('YouTube login error:', error);
    return NextResponse.json({ error: 'Failed to initiate YouTube login' }, { status: 500 });
  }
}
