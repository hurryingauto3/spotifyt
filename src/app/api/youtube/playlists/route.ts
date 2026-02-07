import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserPlaylists } from '@/lib/youtube/client';

export async function GET() {
  try {
    const session = await getSession();

    if (!session.youtube) {
      console.error('[YouTube API] YouTube not connected');
      return NextResponse.json({ error: 'YouTube not connected' }, { status: 401 });
    }

    console.log('[YouTube API] Fetching playlists for channel:', session.youtube.channelId);
    const playlists = await getUserPlaylists(session);
    console.log('[YouTube API] Returning', playlists.length, 'playlists');

    return NextResponse.json({ playlists });
  } catch (error: any) {
    console.error('[YouTube API] Error fetching playlists:', error);
    console.error('[YouTube API] Error stack:', error.stack);
    return NextResponse.json({
      error: error.message || 'Failed to fetch playlists',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
